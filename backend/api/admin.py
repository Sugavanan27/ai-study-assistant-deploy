import os
import shutil
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, status
from typing import List, Dict, Any
from backend.api.auth import get_current_admin, UserProfile
from backend.services.rag_service import process_and_index_document, delete_document_from_index
from backend.services.supabase_service import get_supabase_admin_client, get_supabase_client
from backend.config import settings

router = APIRouter(prefix="/admin", tags=["Admin"])

# In-memory document storage for Mock Mode
mock_documents: List[Dict[str, Any]] = [
    {"id": "doc-1", "filename": "Official College Handbook.pdf", "status": "completed", "created_at": "2026-06-22T08:00:00Z"},
    {"id": "doc-2", "filename": "Placement_Cell_Circular_V1.pdf", "status": "completed", "created_at": "2026-06-22T09:00:00Z"},
    {"id": "doc-3", "filename": "OS_Lecture_Notes_Unit_2.pdf", "status": "completed", "created_at": "2026-06-22T09:30:00Z"},
]

def bg_process_document(file_path: str, doc_id: str, filename: str, is_mock: bool):
    """Background task for text extraction and ChromaDB indexing."""
    success = False
    try:
        if is_mock:
            # Simple simulation
            import time
            time.sleep(3)
            # Find and update mock doc status
            for doc in mock_documents:
                if doc["id"] == doc_id:
                    doc["status"] = "completed"
            success = True
        else:
            success = process_and_index_document(file_path, doc_id, filename)
            
            # Update Supabase document status
            supabase = get_supabase_admin_client()
            status_str = "completed" if success else "failed"
            supabase.table("documents").update({"status": status_str}).eq("id", doc_id).execute()
    except Exception as e:
        print(f"Error in background processing: {e}")
        if not is_mock:
            try:
                supabase = get_supabase_admin_client()
                supabase.table("documents").update({"status": "failed"}).eq("id", doc_id).execute()
            except:
                pass
    finally:
        # Clean up temporary file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Failed to remove temp file: {e}")

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_admin: UserProfile = Depends(get_current_admin)
):
    """Uploads a college document and schedules it for vector indexing."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc", ".txt", ".md"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload PDF, DOCX, or TXT."
        )
        
    doc_id = str(uuid.uuid4())
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    # Create temporary uploads folder
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    temp_file_path = os.path.join(upload_dir, f"{doc_id}{ext}")
    
    # Save the uploaded file locally temporarily
    try:
        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save temporary file: {str(e)}")
        
    # Database storage
    if is_mock:
        new_doc = {
            "id": doc_id,
            "filename": file.filename,
            "status": "processing",
            "created_at": "2026-06-22T10:30:00Z"
        }
        mock_documents.append(new_doc)
    else:
        try:
            supabase = get_supabase_admin_client()
            supabase.table("documents").insert({
                "id": doc_id,
                "filename": file.filename,
                "file_path": temp_file_path,
                "status": "processing",
                "uploaded_by": current_admin.id
            }).execute()
        except Exception as e:
            # Clean up temp file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
            
    # Add document processing to background tasks
    background_tasks.add_task(bg_process_document, temp_file_path, doc_id, file.filename, is_mock)
    
    return {
        "id": doc_id,
        "filename": file.filename,
        "status": "processing",
        "message": "Document uploaded successfully and indexing started."
    }

@router.get("/documents")
async def list_documents(current_admin: UserProfile = Depends(get_current_admin)):
    """List all official documents uploaded for RAG context."""
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    if is_mock:
        return mock_documents
        
    try:
        supabase = get_supabase_client()
        response = supabase.table("documents")\
            .select("*")\
            .order("created_at", desc=True)\
            .execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_admin: UserProfile = Depends(get_current_admin)
):
    """Deletes document from the vector database and relational DB."""
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    if is_mock:
        global mock_documents
        mock_documents = [doc for doc in mock_documents if doc["id"] != doc_id]
        return {"status": "success", "message": "Document deleted from mock storage."}
        
    try:
        # Delete from ChromaDB vector index
        delete_document_from_index(doc_id)
        
        # Delete from Supabase
        supabase = get_supabase_admin_client()
        supabase.table("documents").delete().eq("id", doc_id).execute()
        
        return {"status": "success", "message": "Document deleted from vector index and database."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/analytics")
async def get_analytics(current_admin: UserProfile = Depends(get_current_admin)):
    """Fetch dashboard analytics data."""
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    if is_mock:
        return {
            "total_documents": len(mock_documents),
            "total_questions_asked": 128,
            "active_students": 45,
            "notices_published": 12,
            "recent_activity": [
                {"user": "Student A", "activity": "Asked about internal exams", "time": "2 mins ago"},
                {"user": "Student B", "activity": "Completed Operating System Quiz", "time": "15 mins ago"},
                {"user": "Admin", "activity": "Uploaded OS_Lecture_Notes_Unit_2.pdf", "time": "1 hour ago"},
            ]
        }
        
    try:
        supabase = get_supabase_admin_client()
        
        # Gather simple aggregates (handling potential empty results/errors gracefully)
        docs_count = supabase.table("documents").select("id", count="exact").execute().count or 0
        notices_count = supabase.table("notices").select("id", count="exact").execute().count or 0
        messages_count = supabase.table("chat_messages").select("id", count="exact").execute().count or 0
        profiles_count = supabase.table("profiles").select("id", count="exact").execute().count or 0
        
        return {
            "total_documents": docs_count,
            "total_questions_asked": messages_count,
            "active_students": profiles_count,
            "notices_published": notices_count,
            "recent_activity": [
                {"user": "Student", "activity": "Checked the notices panel", "time": "Just now"},
                {"user": "System", "activity": "Vector database updated", "time": "Sync complete"},
            ]
        }
    except Exception as e:
        # Graceful fallback on error
        return {
            "total_documents": 0,
            "total_questions_asked": 0,
            "active_students": 0,
            "notices_published": 0,
            "recent_activity": []
        }
