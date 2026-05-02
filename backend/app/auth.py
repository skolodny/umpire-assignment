from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app import models

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise credentials_exception

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        supabase_id: Optional[str] = payload.get("sub")
        if not supabase_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.supabase_id == supabase_id).first()
    if user is None:
        # Auto-provision user on first login
        email: str = payload.get("email", "")
        user_metadata: dict = payload.get("user_metadata", {})
        name: str = (
            user_metadata.get("full_name")
            or user_metadata.get("name")
            or email.split("@")[0]
        )
        user = models.User(
            supabase_id=supabase_id,
            email=email,
            name=name,
            role=models.UserRole.umpire,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
