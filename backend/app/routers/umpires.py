'''API router for managing umpires. Currently includes an endpoint for listing all umpires and their preferences.'''

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app import models
from app.auth import require_admin
from app.database import get_db

router = APIRouter(prefix="/umpires", tags=["umpires"])


class UmpireOut(BaseModel):
    id: int
    name: str
    email: str
    divisions: List[str]

    class Config:
        from_attributes = True


@router.get("", response_model=List[UmpireOut])
def list_umpires(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(models.User).filter(models.User.role == models.UserRole.umpire).all()
    result = []
    for u in users:
        prefs = db.query(models.DivisionPreference).filter(
            models.DivisionPreference.user_id == u.id
        ).all()
        result.append(UmpireOut(
            id=u.id,
            name=u.name,
            email=u.email,
            divisions=[p.division.value for p in prefs],
        ))
    return result
