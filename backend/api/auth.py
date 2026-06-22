import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
import jwt
from typing import Dict, Any, Optional

router = APIRouter(prefix="/auth", tags=["Auth"])

SECRET_KEY = "athena_academic_assistant_secret_key"
ALGORITHM = "HS256"

# Default admin credentials. In production, these should be managed in PostgreSQL or env.
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password123"

class LoginRequest(BaseModel):
    username: str
    password: str

class UserProfile:
    def __init__(self, username: str, role: str):
        self.username = username
        self.role = role

    def to_dict(self) -> Dict[str, Any]:
        return {
            "username": self.username,
            "role": self.role
        }

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=60)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/login")
async def login(data: LoginRequest):
    """Authenticate admin and return JWT token."""
    # We support standard admin credentials, or a default student login
    if data.username == ADMIN_USERNAME and data.password == ADMIN_PASSWORD:
        token = create_access_token(data={"sub": ADMIN_USERNAME, "role": "admin"})
        return {"access_token": token, "token_type": "bearer", "role": "admin", "username": "Admin Faculty"}
    elif data.password == "student123" or data.username.endswith("@college.edu") or "qq489815" in data.username:
        # Student portal simulated login
        role = "student"
        name = "Sugavanan" if "qq489815" in data.username else "Alex Student"
        token = create_access_token(data={"sub": data.username, "role": role})
        return {"access_token": token, "token_type": "bearer", "role": role, "username": name}
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

async def get_current_user(authorization: Optional[str] = Header(None)) -> UserProfile:
    """Dependency that extracts and validates the JWT from Request Header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization token"
        )
        
    token = authorization.split(" ")[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role", "student")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        return UserProfile(username=username, role=role)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

async def get_current_admin(current_user: UserProfile = Depends(get_current_user)) -> UserProfile:
    """Dependency that ensures the current user has the admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have administrative privileges."
        )
    return current_user
