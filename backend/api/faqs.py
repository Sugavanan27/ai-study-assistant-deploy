from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from backend.api.auth import get_current_user, get_current_admin, UserProfile
from backend.services.supabase_service import get_supabase_client, get_supabase_admin_client
from backend.config import settings

router = APIRouter(prefix="/faqs", tags=["FAQs"])

class FAQCreate(BaseModel):
    question: str
    answer: str
    category: str

# In-memory FAQs for Mock Mode
mock_faqs: List[Dict[str, Any]] = [
    {
        "id": "faq-1",
        "question": "What is the minimum attendance required to write semester exams?",
        "answer": "Students are required to maintain a minimum of 75% attendance in each course to be eligible to appear for the semester end examinations. Shortage of attendance can lead to debarment.",
        "category": "academic"
    },
    {
        "id": "faq-2",
        "question": "How do I apply for an official transcript?",
        "answer": "You can apply for transcripts through the office of the Controller of Examinations. Fill out the application form, pay the fee of Rs. 500 per copy at the bank, and submit it along with copies of your mark sheets.",
        "category": "administrative"
    },
    {
        "id": "faq-3",
        "question": "What are the timings of the central library?",
        "answer": "The central library is open from 8:00 AM to 8:00 PM on working days and from 9:00 AM to 4:00 PM on Saturdays. The library is closed on Sundays and public holidays.",
        "category": "facilities"
    }
]

@router.get("")
async def list_faqs(
    category: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Retrieve all FAQs, optionally filtered by category."""
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    if is_mock:
        if category:
            return [f for f in mock_faqs if f["category"] == category]
        return mock_faqs
        
    try:
        supabase = get_supabase_client()
        query = supabase.table("faqs").select("*")
        if category:
            query = query.eq("category", category)
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("")
async def create_faq(
    data: FAQCreate,
    current_admin: UserProfile = Depends(get_current_admin)
):
    """Create a new FAQ entry. Requires Admin permissions."""
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    if is_mock:
        import uuid
        new_faq = {
            "id": f"faq-{uuid.uuid4()}",
            "question": data.question,
            "answer": data.answer,
            "category": data.category
        }
        mock_faqs.insert(0, new_faq)
        return new_faq
        
    try:
        supabase = get_supabase_admin_client()
        response = supabase.table("faqs").insert({
            "question": data.question,
            "answer": data.answer,
            "category": data.category
        }).execute()
        
        if response.data:
            return response.data[0]
        raise HTTPException(status_code=500, detail="Failed to create FAQ")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/{faq_id}")
async def delete_faq(
    faq_id: str,
    current_admin: UserProfile = Depends(get_current_admin)
):
    """Delete a FAQ. Requires Admin permissions."""
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    if is_mock:
        global mock_faqs
        mock_faqs = [f for f in mock_faqs if f["id"] != faq_id]
        return {"status": "success", "message": "FAQ deleted successfully."}
        
    try:
        supabase = get_supabase_admin_client()
        supabase.table("faqs").delete().eq("id", faq_id).execute()
        return {"status": "success", "message": "FAQ deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
