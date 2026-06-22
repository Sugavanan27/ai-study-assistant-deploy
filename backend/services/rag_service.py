import os
from typing import List, Dict, Any, Tuple
import chromadb
from sqlalchemy.orm import Session
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.documents import Document
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from backend.config import settings
from backend.database.models import DBDocument, DBDocumentChunk, DBChatHistory
from backend.utils.file_utils import extract_pages

# Global clients cached
_embeddings = None
_chroma_client = None
_vector_store = None

def get_embeddings():
    global _embeddings
    if _embeddings is not None:
        return _embeddings

    # Offline local embedding fallback if no keys configured
    if not settings.GEMINI_API_KEY and not settings.OPENAI_API_KEY:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        print("Using local HuggingFace embeddings (all-MiniLM-L6-v2) for offline operation.")
        _embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            cache_folder=os.path.join(settings.CHROMA_DB_PATH, "embeddings_cache")
        )
        return _embeddings

    if settings.LLM_PROVIDER == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required for OpenAI LLM provider.")
        _embeddings = OpenAIEmbeddings(
            openai_api_key=settings.OPENAI_API_KEY,
            model="text-embedding-3-small"
        )
    else: # Default to Gemini
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required for Gemini LLM provider.")
        _embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=settings.GEMINI_API_KEY
        )
    return _embeddings

def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        os.makedirs(settings.CHROMA_DB_PATH, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
    return _chroma_client

def get_vector_store():
    global _vector_store
    if _vector_store is None:
        client = get_chroma_client()
        embeddings = get_embeddings()
        _vector_store = Chroma(
            client=client,
            collection_name="academic_documents",
            embedding_function=embeddings
        )
    return _vector_store

class MockLLMResponse:
    def __init__(self, content: str):
        self.content = content

class MockLLM:
    def invoke(self, messages) -> MockLLMResponse:
        # Determine fallback message
        fallback_msg = "I couldn't find relevant information in the uploaded college documents."
        
        # Look for user query and context
        user_prompt = ""
        context = ""
        for msg in reversed(messages):
            if msg.__class__.__name__ == "HumanMessage":
                user_prompt = msg.content
                break
                
        # Parse context from user prompt
        if "Context:" in user_prompt:
            parts = user_prompt.split("Question:")
            context = parts[0].replace("Context:", "").strip()
            query = parts[1].strip() if len(parts) > 1 else ""
        else:
            query = user_prompt
            
        if not context or "Source Document:" not in context:
            return MockLLMResponse(fallback_msg)

        # Generate a high-quality response simulating the LLM using the retrieved context
        # We find relevant lines or bullet points that might answer the query
        lines = [line.strip() for line in context.split("\n") if line.strip()]
        
        # Formulate answer summary
        answer_lines = []
        for line in lines:
            if line.startswith("Content:"):
                # Clean prefix and grab some text
                content_text = line.replace("Content:", "").strip()
                answer_lines.append(content_text)
                
        if not answer_lines:
            return MockLLMResponse(fallback_msg)
            
        summary_answer = "\n".join(answer_lines[:3]) # Take top content snippets
        
        # Build answer
        response_text = (
            f"[OFFLINE MOCK RESPONSE]\n"
            f"Based on the uploaded academic documents, here is the retrieved information:\n\n"
            f"{summary_answer}\n\n"
            f"Note: Since no API keys were configured, this response is generated offline using retrieved context chunks."
        )
        return MockLLMResponse(response_text)

def get_llm():
    # Offline Mock LLM fallback if no keys configured
    if not settings.GEMINI_API_KEY and not settings.OPENAI_API_KEY:
        print("Using MockLLM for offline operations.")
        return MockLLM()

    if settings.LLM_PROVIDER == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required for OpenAI LLM provider.")
        return ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_MODEL,
            temperature=0.0
        )
    else: # Default to Gemini
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required for Gemini LLM provider.")
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.0
        )

def process_and_index_document(
    db: Session, 
    file_path: str, 
    doc_id: str, 
    filename: str,
    title: str,
    category: str,
    uploaded_by: str = "Admin"
) -> bool:
    """Extracts text page-by-page, splits into chunks, and saves to ChromaDB & PostgreSQL."""
    try:
        # 1. Extract pages (text, page_number)
        pages = extract_pages(file_path)
        if not pages:
            raise ValueError("Document has no text or could not be parsed.")

        # 2. Setup text splitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=150,
            length_function=len
        )

        # 3. Create document record in PostgreSQL
        db_doc = DBDocument(
            id=doc_id,
            title=title,
            category=category,
            filename=filename,
            uploaded_by=uploaded_by
        )
        db.add(db_doc)
        db.flush() # Secure the document ID

        chunks_to_index = []
        chunk_index = 0

        # 4. Split and prepare chunks
        for text, page_num in pages:
            page_chunks = text_splitter.split_text(text)
            for chunk_text in page_chunks:
                if not chunk_text.strip():
                    continue

                # Save metadata and index in SQLite/PostgreSQL
                db_chunk = DBDocumentChunk(
                    document_id=doc_id,
                    chunk_index=chunk_index,
                    text=chunk_text,
                    page_number=page_num
                )
                db.add(db_chunk)

                # Prepare Langchain Document for ChromaDB
                chunks_to_index.append(
                    Document(
                        page_content=chunk_text,
                        metadata={
                            "doc_id": doc_id,
                            "filename": filename,
                            "title": title,
                            "page_number": page_num if page_num else -1,
                            "chunk_index": chunk_index
                        }
                    )
                )
                chunk_index += 1

        # 5. Add to ChromaDB vector store
        vector_store = get_vector_store()
        vector_store.add_documents(chunks_to_index)

        # Commit relational DB writes
        db.commit()
        return True

    except Exception as e:
        db.rollback()
        print(f"Error indexing document {filename}: {str(e)}")
        raise e

def delete_document_from_index(db: Session, doc_id: str) -> bool:
    """Deletes document metadata from PostgreSQL and its vectors from ChromaDB."""
    try:
        # 1. Delete from ChromaDB
        vector_store = get_vector_store()
        vector_store.delete(where={"doc_id": doc_id})

        # 2. Delete from PostgreSQL (cascade automatically deletes chunks)
        db_doc = db.query(DBDocument).filter(DBDocument.id == doc_id).first()
        if db_doc:
            db.delete(db_doc)
            db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error deleting document {doc_id}: {str(e)}")
        raise e

def search_documents(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Performs semantic vector search over indexed documents."""
    try:
        vector_store = get_vector_store()
        # similarity_search_with_score returns List[Tuple[Document, float]]
        # In Chroma L2 distance, lower score is more similar.
        results = vector_store.similarity_search_with_score(query, k=limit)
        
        retrieved_docs = []
        for doc, score in results:
            retrieved_docs.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score)
            })
        return retrieved_docs
    except Exception as e:
        print(f"Error searching vector store: {str(e)}")
        return []

def generate_ai_response(
    db: Session,
    query: str, 
    user_id: str = "Admin",
    limit: int = 5
) -> Tuple[str, List[Dict[str, Any]]]:
    """Retrieves context from ChromaDB, validates threshold, and returns grounded answer."""
    try:
        # 1. Search vector store
        retrieved = search_documents(query, limit=limit)
        
        # 2. Validate relevance threshold to prevent hallucinations
        # ChromaDB default score is L2 distance. Lower distance means higher similarity.
        # Threshold: if the closest chunk has a distance > 1.25, we reject the context as irrelevant.
        similarity_threshold = 1.25
        valid_chunks = []
        
        for doc in retrieved:
            # If the vector similarity score is too poor, we filter it out
            if doc["score"] <= similarity_threshold:
                valid_chunks.append(doc)

        fallback_msg = "I couldn't find relevant information in the uploaded college documents."

        if not valid_chunks:
            # Save empty-source query to chat history
            db_chat = DBChatHistory(
                user_id=user_id,
                question=query,
                answer=fallback_msg,
                sources=[]
            )
            db.add(db_chat)
            db.commit()
            return fallback_msg, []

        # 3. Build context and track unique sources
        context_parts = []
        sources = []
        seen_sources = set()

        for chunk in valid_chunks:
            meta = chunk["metadata"]
            filename = meta.get("filename", "Unknown")
            page_num = meta.get("page_number", -1)
            page_str = f"Page {page_num}" if page_num != -1 else "N/A"
            
            # Format context block
            context_parts.append(
                f"Source Document: {filename} ({page_str})\n"
                f"Content: {chunk['content']}"
            )
            
            # De-duplicate source citations
            source_key = f"{filename} ({page_str})"
            if source_key not in seen_sources:
                seen_sources.add(source_key)
                sources.append({
                    "document": filename,
                    "page": page_str
                })

        context = "\n\n---\n\n".join(context_parts)

        # 4. Fetch previous chat messages for history context (last 5 messages)
        history_msgs = db.query(DBChatHistory)\
            .filter(DBChatHistory.user_id == user_id)\
            .order_by(DBChatHistory.timestamp.desc())\
            .limit(5)\
            .all()
            
        history_msgs.reverse() # Restore chronological order

        # 5. Build Chat Prompt
        system_instruction = (
            "You are a production-grade AI Academic Assistant. Your job is to answer queries "
            "strictly based on the provided Context of uploaded college documents.\n\n"
            "CRITICAL RULES:\n"
            "1. Answer the question politely, citing the exact document names whenever possible.\n"
            "2. Prioritize the provided Context over your general knowledge. If the Context contains the answer, "
            "base your response only on it.\n"
            "3. If the Context is empty, incomplete, or does not contain the answer, you must respond EXACTLY with: "
            "\"I couldn't find relevant information in the uploaded college documents.\" and nothing else. Do not add general info."
        )

        messages = [SystemMessage(content=system_instruction)]
        
        # Add historical conversation
        for h in history_msgs:
            messages.append(HumanMessage(content=h.question))
            messages.append(AIMessage(content=h.answer))

        # Add current prompt with grounded context
        user_prompt = f"Context:\n{context}\n\nQuestion: {query}"
        messages.append(HumanMessage(content=user_prompt))

        # 6. Run LLM
        llm = get_llm()
        response = llm.invoke(messages)
        answer = response.content

        # Double check that LLM respects the fallback if it claims it doesn't know
        if "i don't know" in answer.lower() or "cannot find" in answer.lower():
            answer = fallback_msg

        # 7. Write history to PostgreSQL
        db_chat = DBChatHistory(
            user_id=user_id,
            question=query,
            answer=answer,
            sources=sources
        )
        db.add(db_chat)
        db.commit()

        return answer, sources

    except Exception as e:
        print(f"Error in RAG generation: {str(e)}")
        # Fallback to prevent crash
        return "I apologize, but I encountered an error while processing your request.", []
