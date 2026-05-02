from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.config import get_settings
from app.database import get_db
from app import models
from supabase import create_client

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)

supabase = create_client(
    settings.supabase_url,
    settings.supabase_anon_key,
)

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
        user_response = supabase.auth.get_user(token)
        auth_user = user_response.user

        if not auth_user:
            raise credentials_exception

        supabase_id = auth_user.id
        email = auth_user.email or ""

        user_metadata = auth_user.user_metadata or {}

    except Exception as exc:
        print(f"[AUTH] Token validation failed: {exc}")
        raise credentials_exception

    user = db.query(models.User).filter(models.User.supabase_id == supabase_id).first()
    if user is None:
        # Link an existing user by email (migrating pre-Supabase accounts)
        existing_by_email = db.query(models.User).filter(models.User.email == email).first()
        if existing_by_email:
            existing_by_email.supabase_id = supabase_id
            try:
                db.commit()
                db.refresh(existing_by_email)
            except IntegrityError as exc:
                print(f"[AUTH] IntegrityError linking supabase_id to existing user by email, recovering: {exc}")
                db.rollback()
                existing_by_email = db.query(models.User).filter(
                    models.User.supabase_id == supabase_id
                ).first()
            user = existing_by_email
        else:
            # New user — provision a record from JWT claims
            name: str = (
                user_metadata.get("full_name")
                or user_metadata.get("name")
                or email.split("@")[0]
            )
            new_user = models.User(
                supabase_id=supabase_id,
                email=email,
                name=name,
                role=models.UserRole.umpire,
            )
            db.add(new_user)
            try:
                db.commit()
                db.refresh(new_user)
            except IntegrityError as exc:
                print(f"[AUTH] IntegrityError provisioning new user (concurrent first-login), recovering: {exc}")
                db.rollback()
                new_user = db.query(models.User).filter(
                    models.User.supabase_id == supabase_id
                ).first()
            user = new_user

    if user is None:
        raise credentials_exception
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
