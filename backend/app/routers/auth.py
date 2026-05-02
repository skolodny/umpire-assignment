from fastapi import APIRouter, Depends
from app import models
from app.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role.value,
    }
