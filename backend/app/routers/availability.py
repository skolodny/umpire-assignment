'''API router for managing umpire availability slots.
Umpires can create, edit, and delete their own availability slots, 
while admins can manage slots for any user.'''

from datetime import date, time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app import models
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/availability", tags=["availability"])


class SlotCreate(BaseModel):
    '''Request model for creating a new availability slot.'''
    date: date
    start_time: time
    end_time: time

class SlotEdit(BaseModel):
    '''Request model for editing an existing availability slot.'''
    start_time: time
    end_time: time

class SlotOut(BaseModel):
    '''Response model for an availability slot.'''
    id: int
    user_id: int
    date: date
    start_time: time
    end_time: time

    class Config:
        '''Configure Pydantic to allow population from ORM objects.'''
        from_attributes = True


@router.get("", response_model=List[SlotOut])
def get_availability(
    user_id: Optional[int] = None,
    month: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    '''Get availability slots for the current user, or for a specified user 
    if the current user is an admin. Optionally filter by month (YYYY-MM) or
    by date range (start_date / end_date).'''
    target_user_id = user_id if (user_id and current_user.role == models.UserRole.admin) else current_user.id
    query = db.query(models.AvailabilitySlot).filter(models.AvailabilitySlot.user_id == target_user_id)
    if start_date and end_date:
        query = query.filter(
            models.AvailabilitySlot.date >= start_date,
            models.AvailabilitySlot.date <= end_date,
        )
    elif month:
        try:
            year, mon = map(int, month.split("-"))
            from sqlalchemy import extract
            query = query.filter(
                extract("year", models.AvailabilitySlot.date) == year,
                extract("month", models.AvailabilitySlot.date) == mon,
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    return query.all()


@router.post("", response_model=SlotOut, status_code=201)
def create_slot(
    slot: SlotCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ''''Create a new availability slot for the current user.'''
    if slot.start_time >= slot.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")
    db_slot = models.AvailabilitySlot(
        user_id=current_user.id,
        date=slot.date,
        start_time=slot.start_time,
        end_time=slot.end_time,
    )
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot

@router.put("/{slot_id}", response_model=SlotOut, status_code=200)
def update_slot(
    slot_id: int,
    slot: SlotEdit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    '''Edit an existing availability slot. Users can only edit their own slots, while admins can edit any slot.'''
    db_slot = db.query(models.AvailabilitySlot).filter(models.AvailabilitySlot.id == slot_id).first()
    if not db_slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if db_slot.user_id != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    if slot.start_time >= slot.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")
    db_slot.start_time = slot.start_time
    db_slot.end_time = slot.end_time
    db.commit()
    db.refresh(db_slot)
    return db_slot


@router.delete("/{slot_id}", status_code=204)
def delete_slot(
    slot_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    '''Delete an availability slot. 
    Users can only delete their own slots, while admins can delete any slot.'''
    slot = db.query(models.AvailabilitySlot).filter(models.AvailabilitySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.user_id != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(slot)
    db.commit()
