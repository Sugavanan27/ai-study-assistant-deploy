from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from backend.api.auth import get_current_user, UserProfile
from backend.services.rag_service import generate_ai_response
from backend.services.supabase_service import get_supabase_client
from backend.config import settings

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatMessageInput(BaseModel):
    session_id: Optional[str] = None
    content: str

class ChatSessionCreate(BaseModel):
    title: str

# Schema for mock session tracking if Supabase is disabled
mock_sessions: Dict[str, List[Dict[str, str]]] = {}

@router.post("/message")
async def send_message(
    data: ChatMessageInput,
    current_user: UserProfile = Depends(get_current_user)
):
    """Sends a message to the AI assistant, retrieving context using RAG."""
    session_id = data.session_id
    query = data.content
    
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    chat_history = []
    
    # 1. Manage chat session and history
    if is_mock:
        # Local mock storage
        if not session_id:
            import uuid
            session_id = str(uuid.uuid4())
            mock_sessions[session_id] = []
        else:
            chat_history = mock_sessions.get(session_id, [])
    else:
        supabase = get_supabase_client()
        
        # If no session, create one
        if not session_id:
            try:
                session_response = supabase.table("chat_sessions").insert({
                    "user_id": current_user.id,
                    "title": query[:40] + ("..." if len(query) > 40 else "")
                }).execute()
                
                if session_response.data:
                    session_id = session_response.data[0]["id"]
                else:
                    raise HTTPException(status_code=500, detail="Failed to create chat session")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        else:
            # Fetch message history
            try:
                history_response = supabase.table("chat_messages")\
                    .select("role, content")\
                    .eq("session_id", session_id)\
                    .order("created_at")\
                    .execute()
                chat_history = history_response.data or []
            except Exception as e:
                # Log error and proceed with empty history
                print(f"Error fetching chat history: {e}")
                
    # 2. Get AI Response
    ai_response, sources = generate_ai_response(query, chat_history)
    
    # 3. Save messages
    if is_mock:
        mock_sessions[session_id].append({"role": "user", "content": query})
        mock_sessions[session_id].append({"role": "assistant", "content": ai_response})
    else:
        try:
            # Insert User Message
            supabase.table("chat_messages").insert({
                "session_id": session_id,
                "role": "user",
                "content": query
            }).execute()
            
            # Insert AI Message
            supabase.table("chat_messages").insert({
                "session_id": session_id,
                "role": "assistant",
                "content": ai_response,
                "sources": sources
            }).execute()
        except Exception as e:
            # Do not fail request if saving fails, but log it
            print(f"Failed to save messages to DB: {e}")
            
    return {
        "session_id": session_id,
        "message": ai_response,
        "sources": sources
    }

@router.get("/sessions")
async def get_sessions(current_user: UserProfile = Depends(get_current_user)):
    """Fetch previous chat sessions for the logged in user."""
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    if is_mock:
        # Return mock sessions
        return [
            {
                "id": sid,
                "title": history[0]["content"][:30] + "..." if history else "New Conversation",
                "created_at": "2026-06-22T10:00:00Z"
            } for sid, history in mock_sessions.items()
        ]
        
    try:
        supabase = get_supabase_client()
        response = supabase.table("chat_sessions")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("created_at", desc=True)\
            .execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """Retrieve messages in a chat session."""
    is_mock = settings.MOCK_MODE or not settings.SUPABASE_URL or not settings.SUPABASE_KEY
    
    if is_mock:
        if session_id not in mock_sessions:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        # Format mock messages for frontend
        formatted = []
        for msg in mock_sessions[session_id]:
            formatted.append({
                "role": msg["role"],
                "content": msg["content"],
                "sources": ["Official College Handbook.pdf"] if msg["role"] == "assistant" else []
            })
        return formatted
        
    try:
        supabase = get_supabase_client()
        # Verify ownership by selecting the session first
        session = supabase.table("chat_sessions")\
            .select("user_id")\
            .eq("id", session_id)\
            .execute()
            
        if not session.data or session.data[0]["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized access to this chat session")
            
        messages_response = supabase.table("chat_messages")\
            .select("*")\
            .eq("session_id", session_id)\
            .order("created_at")\
            .execute()
        return messages_response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
