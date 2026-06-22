import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # FastAPI Server Configuration
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # LLM Settings (configurable)
    # Options: "gemini" or "openai"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    # Gemini API Key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # OpenAI API Key & Model
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Database Configuration
    # Falls back to local sqlite db if no PostgreSQL is configured
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/academic_assistant"
    )

    # Vector DB Configuration
    CHROMA_DB_PATH: str = os.getenv("CHROMA_DB_PATH", "./chroma_db")
    
    class Config:
        env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        extra = "ignore"

settings = Settings()
