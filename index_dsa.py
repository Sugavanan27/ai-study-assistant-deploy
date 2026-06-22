import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.config import settings

# Force disable mock mode temporarily for this indexing script so that ChromaDB persistent client actually creates vectors
settings.MOCK_MODE = False

from backend.services.rag_service import process_and_index_document

def run_indexing():
    file_path = os.path.join("backend", "uploads", "Most_Useful_DSA_Notes.md")
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return
        
    print(f"Indexing file: {file_path} into ChromaDB...")
    
    # Check if Gemini key is available for generating real embeddings
    # If not, the script will show an error, which is expected since it needs Gemini API to embed
    if not settings.GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY is not configured in .env. We will test indexing using mock framework if possible, but real vector store requires it.")
        
    success = process_and_index_document(
        file_path=file_path,
        doc_id="dsa-notes-aman-kumar",
        filename="Most_Useful_DSA_Notes.md"
    )
    
    if success:
        print("Success: DSA Notes successfully indexed in ChromaDB vector store!")
    else:
        print("Failed: Indexing failed. Ensure your GEMINI_API_KEY is correct.")

if __name__ == "__main__":
    run_indexing()
