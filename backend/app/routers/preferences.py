'''API router for managing user preferences, such as preferred divisions.'''

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app import models
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/preferences", tags=["preferences"])


class PreferencesRequest(BaseModel):
    '''Request model for updating user preferences. Currently only includes preferred divisions.'''
    divisions: List[str]


class PreferencesResponse(BaseModel):
    '''Response model for user preferences.'''
    divisions: List[str]


@router.get("", response_model=PreferencesResponse)
def get_preferences(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    '''Get the current user's preferences. Currently returns a list of preferred divisions.'''
    prefs = db.query(models.DivisionPreference).filter(
        models.DivisionPreference.user_id == current_user.id
    ).all()
    return PreferencesResponse(divisions=[p.division.value for p in prefs])


@router.put("", response_model=PreferencesResponse)
def set_preferences(
    req: PreferencesRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    '''Set the current user's preferences. Currently allows updating the list of preferred divisions.'''
    valid_divisions = {d.value for d in models.Division}
    for div in req.divisions:
        if div not in valid_divisions:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Invalid division: {div}")

    db.query(models.DivisionPreference).filter(
        models.DivisionPreference.user_id == current_user.id
    ).delete()

    for div in set(req.divisions):
        db.add(models.DivisionPreference(user_id=current_user.id, division=models.Division(div)))

    db.commit()

    prefs = db.query(models.DivisionPreference).filter(
        models.DivisionPreference.user_id == current_user.id
    ).all()
    return PreferencesResponse(divisions=[p.division.value for p in prefs])
