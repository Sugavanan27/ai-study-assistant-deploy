import os
import shutil
import uuid
import datetime
from typing import Optional, List
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.config import settings
from backend.database.session import engine, Base, get_db
from backend.database.models import DBDocument, DBDocumentChunk, DBChatHistory
from backend.services.rag_service import (
    process_and_index_document, 
    delete_document_from_index, 
    generate_ai_response,
    get_vector_store
)
from backend.api import auth
from backend.api.auth import get_current_user, get_current_admin, UserProfile

# Initialize Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Athena AI Academic Assistant API",
    description="Production RAG API with local PostgreSQL metadata, ChromaDB, and OpenAI/Gemini support.",
    version="2.0.0"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Auth Router
app.include_router(auth.router, prefix="/api")

# Pydantic Schemas
class ChatRequest(BaseModel):
    question: str

class ManualDocumentRequest(BaseModel):
    title: str
    category: str
    content: str

# ----------------- REST API ENDPOINTS -----------------

@app.get("/")
async def root():
    return {
        "status": "online",
        "llm_provider": settings.LLM_PROVIDER,
        "database_url": settings.DATABASE_URL.split("@")[-1] # Hide credentials
    }

@app.post("/api/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form(...),
    current_admin: UserProfile = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Uploads a PDF, DOCX, or TXT file, parses it, and indexes it into ChromaDB."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc", ".txt", ".md"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload PDF, DOCX, or TXT."
        )

    doc_id = str(uuid.uuid4())
    
    # Save the file temporarily in uploads/ folder
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    temp_file_path = os.path.join(upload_dir, f"{doc_id}{ext}")
    
    try:
        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write temporary file: {str(e)}"
        )

    try:
        success = process_and_index_document(
            db=db,
            file_path=temp_file_path,
            doc_id=doc_id,
            filename=file.filename,
            title=title,
            category=category,
            uploaded_by=current_admin.username
        )
        
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
        if success:
            return {
                "id": doc_id,
                "title": title,
                "filename": file.filename,
                "status": "success",
                "message": "Document uploaded and indexed successfully."
            }
        else:
            raise HTTPException(status_code=500, detail="Indexing pipeline failed.")
    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Error indexing document: {str(e)}")

@app.post("/api/manual-document")
async def create_manual_document(
    data: ManualDocumentRequest,
    current_admin: UserProfile = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Manually add knowledge via rich text editor content."""
    doc_id = str(uuid.uuid4())
    filename = f"manual_{doc_id[:8]}.txt"
    
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    temp_file_path = os.path.join(upload_dir, filename)
    
    try:
        with open(temp_file_path, "w", encoding="utf-8") as f:
            f.write(data.content)
            
        success = process_and_index_document(
            db=db,
            file_path=temp_file_path,
            doc_id=doc_id,
            filename=filename,
            title=data.title,
            category=data.category,
            uploaded_by=current_admin.username
        )
        
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
        if success:
            return {
                "id": doc_id,
                "title": data.title,
                "filename": filename,
                "status": "success"
            }
        else:
            raise HTTPException(status_code=500, detail="Indexing manual document failed.")
    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents")
async def get_documents(
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch all indexed documents from PostgreSQL."""
    docs = db.query(DBDocument).order_by(DBDocument.upload_date.desc()).all()
    return docs

@app.delete("/api/documents/{id}")
async def delete_document(
    id: str, 
    current_admin: UserProfile = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deletes a document from both PostgreSQL and ChromaDB."""
    try:
        success = delete_document_from_index(db, id)
        if success:
            return {"status": "success", "message": f"Document {id} deleted successfully."}
        raise HTTPException(status_code=404, detail="Document not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(
    data: ChatRequest, 
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Standard grounded RAG chat completion endpoint."""
    answer, sources = generate_ai_response(
        db=db,
        query=data.question,
        user_id=current_user.username
    )
    return {
        "answer": answer,
        "sources": sources
    }

@app.get("/api/chat-history")
async def get_chat_history(
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve chat history messages from PostgreSQL."""
    history = db.query(DBChatHistory)\
        .filter(DBChatHistory.user_id == current_user.username)\
        .order_by(DBChatHistory.timestamp.asc())\
        .all()
    return history

@app.get("/api/search-documents")
async def search_documents_non_ai(
    q: str, 
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search uploaded document chunks using standard SQL text search (No AI)."""
    results = db.query(DBDocumentChunk, DBDocument)\
        .join(DBDocument, DBDocumentChunk.document_id == DBDocument.id)\
        .filter(DBDocumentChunk.text.ilike(f"%{q}%"))\
        .limit(20)\
        .all()
        
    formatted = []
    for chunk, doc in results:
        formatted.append({
            "document_id": doc.id,
            "title": doc.title,
            "filename": doc.filename,
            "category": doc.category,
            "chunk_index": chunk.chunk_index,
            "text": chunk.text,
            "page_number": chunk.page_number
        })
    return formatted

@app.get("/api/knowledge-stats")
async def get_knowledge_stats(
    current_admin: UserProfile = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Returns database metrics (Total docs, total chunks, Chroma vectors, storage size)."""
    try:
        total_docs = db.query(DBDocument).count()
        total_chunks = db.query(DBDocumentChunk).count()
        
        try:
            vector_store = get_vector_store()
            vector_count = vector_store._collection.count()
        except Exception:
            vector_count = total_chunks
            
        last_doc = db.query(DBDocument).order_by(DBDocument.upload_date.desc()).first()
        last_uploaded = last_doc.title if last_doc else "N/A"
        
        storage_bytes = 0
        paths_to_check = [
            settings.CHROMA_DB_PATH,
            os.path.join(os.path.dirname(__file__), "uploads")
        ]
        
        for path in paths_to_check:
            if os.path.exists(path):
                if os.path.isdir(path):
                    for root, dirs, files in os.walk(path):
                        for f in files:
                            fp = os.path.join(root, f)
                            storage_bytes += os.path.getsize(fp)
                else:
                    storage_bytes += os.path.getsize(path)
                    
        storage_mb = round(storage_bytes / (1024 * 1024), 2)
        
        return {
            "total_documents": total_docs,
            "total_chunks": total_chunks,
            "vector_count": vector_count,
            "last_uploaded_document": last_uploaded,
            "storage_usage": f"{storage_mb} MB"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
