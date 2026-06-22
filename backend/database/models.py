import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database.session import Base

# Helper to support UUID in both PostgreSQL and SQLite
class GUID(UUID):
    """Placeholder or wrapper to handle UUID type in SQLite/other databases."""
    pass

def generate_uuid():
    return str(uuid.uuid4())

class DBDocument(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    filename = Column(String(255), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    uploaded_by = Column(String(150), default="Admin", nullable=False)
    
    # Relationship to chunks
    chunks = relationship("DBDocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DBDocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True) # Page number extracted from PDF

    document = relationship("DBDocument", back_populates="chunks")

class DBChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(150), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    sources = Column(JSON, default=list, nullable=False) # List of source dictionaries (filename, page)
