from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from backend.api.auth import get_current_user, get_current_admin, UserProfile
from backend.services.supabase_service import get_supabase_client, get_supabase_admin_client
from backend.config import settings

router = APIRouter(prefix="/notices", tags=["Notices"])

class NoticeCreate(BaseModel):
    title: str
    content: str
    category: str  # 'exam', 'placement', 'general', 'holiday', 'academic'

# In-memory notices for Mock Mode
mock_notices: List[Dict[str, Any]] = [
    {
        "id": "notice-1",
        "title": "Semester Examination Fee Payment Notice",
        "content": "All students are instructed to pay their semester examination fees before September 30th without fine. Fees can be paid online through the university portal or offline at the accounts department.",
        "category": "exam",
        "created_at": "2026-06-22T08:00:00Z"
    },
    {
        "id": "notice-2",
        "title": "TCS Recruitment Drive 2026",
        "content": "Tata Consultancy Services (TCS) is hiring for the role of Systems Engineer / Ninja. Students from CSE, IT, ECE, EEE branches with a CGPA of 7.0 and above are eligible. Register on the placement portal by September 28th.",
        "category": "placement",
        "created_at": "2026-06-21T09:30:00Z"
    },
    {
        "id": "notice-3",
        "title": "Holiday Announcement - Pongal / Local Festival",
        "content": "The college will remain closed from January 14th to January 18th in observance of the Pongal Festival. Classes will resume on January 19th with the regular timetable.",
        "category": "holiday",
        "created_at": "2026-06-20T10:00:00Z"
    }
]

@router.get("")
async def list_notices(
    category: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Retrieve all notices, optionally filtered by category."""
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    if is_mock:
        if category:
            return [n for n in mock_notices if n["category"] == category]
        return mock_notices
        
    try:
        supabase = get_supabase_client()
        query = supabase.table("notices").select("*")
        if category:
            query = query.eq("category", category)
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("")
async def create_notice(
    data: NoticeCreate,
    current_admin: UserProfile = Depends(get_current_admin)
):
    """Publish a new notice. Requires Admin permissions."""
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    if is_mock:
        import uuid
        from datetime import datetime
        new_notice = {
            "id": f"notice-{uuid.uuid4()}",
            "title": data.title,
            "content": data.content,
            "category": data.category,
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        mock_notices.insert(0, new_notice)
        return new_notice
        
    try:
        supabase = get_supabase_admin_client()
        response = supabase.table("notices").insert({
            "title": data.title,
            "content": data.content,
            "category": data.category
        }).execute()
        
        if response.data:
            return response.data[0]
        raise HTTPException(status_code=500, detail="Failed to create notice")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/{notice_id}")
async def delete_notice(
    notice_id: str,
    current_admin: UserProfile = Depends(get_current_admin)
):
    """Delete a notice. Requires Admin permissions."""
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    if is_mock:
        global mock_notices
        mock_notices = [n for n in mock_notices if n["id"] != notice_id]
        return {"status": "success", "message": "Notice deleted successfully."}
        
    try:
        supabase = get_supabase_admin_client()
        supabase.table("notices").delete().eq("id", notice_id).execute()
        return {"status": "success", "message": "Notice deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
