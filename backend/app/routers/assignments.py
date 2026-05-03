'''API router for managing umpire assignments to games.'''

from datetime import datetime, date, time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import jwt
from app import models
from app.auth import get_current_user, require_admin
from app.database import get_db
from app.config import get_settings
from app.email_service import send_assignment_email, send_admin_notification

router = APIRouter(prefix="/assignments", tags=["assignments"])
settings = get_settings()


class AssignmentCreate(BaseModel):
    '''Request model for creating a new assignment.'''
    game_id: int
    umpire_id: int


class AssignmentRespond(BaseModel):
    '''Request model for responding to an assignment.'''
    action: str  # "accept" or "decline"


class GameBrief(BaseModel):
    '''Brief information about the game associated with an assignment.'''
    id: int
    title: str
    date: date
    start_time: time
    end_time: Optional[time]
    location: Optional[str]
    division: Optional[str]

    class Config:
        '''Configure Pydantic to allow population from ORM objects.'''
        from_attributes = True


class AssignmentOut(BaseModel):
    '''Response model for an assignment, including related game information.'''
    id: int
    game_id: int
    umpire_id: int
    status: str
    assigned_at: datetime
    responded_at: Optional[datetime]
    game: GameBrief

    class Config:
        '''Configure Pydantic to allow population from ORM objects.'''
        from_attributes = True


def _make_action_token(assignment_id: int) -> str:
    payload = {"assignment_id": assignment_id}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def _decode_action_token(token: str) -> int:
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    return payload["assignment_id"]


@router.post("", response_model=AssignmentOut, status_code=201)
async def create_assignment(
    req: AssignmentCreate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    '''Create a new umpire assignment for a game. Only admins can perform this action.'''
    game = db.query(models.Game).filter(models.Game.id == req.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    umpire = db.query(models.User).filter(
        models.User.id == req.umpire_id,
        models.User.role == models.UserRole.umpire,
    ).first()
    if not umpire:
        raise HTTPException(status_code=404, detail="Umpire not found")

    assignment = models.Assignment(
        game_id=game.id,
        umpire_id=umpire.id,
        status=models.AssignmentStatus.pending,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    token = _make_action_token(assignment.id)
    try:
        await send_assignment_email(
            umpire_email=umpire.email,
            umpire_name=umpire.name,
            assignment_id=assignment.id,
            game_title=game.title,
            game_date=str(game.date),
            game_start_time=str(game.start_time),
            game_location=game.location,
            game_division=game.division.value if game.division else "Unknown",
            token=token,
        )
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")

    return assignment


@router.get("", response_model=List[AssignmentOut])
def list_assignments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    '''List assignments for the current user.
    Admins see all assignments, while umpires only see their own.'''
    if current_user.role == models.UserRole.admin:
        return db.query(models.Assignment).join(models.Game).all()
    return db.query(models.Assignment).filter(
        models.Assignment.umpire_id == current_user.id
    ).join(models.Game).all()


@router.patch("/{assignment_id}", response_model=AssignmentOut)
async def respond_to_assignment(
    assignment_id: int,
    req: AssignmentRespond,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    '''Allow the umpire to accept or decline an assignment. Admins can also update the status.'''
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.umpire_id != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    if assignment.status != models.AssignmentStatus.pending:
        raise HTTPException(status_code=400, detail=f"Assignment already {assignment.status.value}")

    if req.action == "accept":
        assignment.status = models.AssignmentStatus.accepted
    elif req.action == "decline":
        assignment.status = models.AssignmentStatus.declined
    else:
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'decline'")

    assignment.responded_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)

    if req.action == "decline":
        await _notify_admin_of_decline(db, assignment, "Umpire declined the assignment")

    return assignment


@router.post("/respond-by-token", response_model=AssignmentOut)
async def respond_by_token(
    token: str,
    action: str,
    db: Session = Depends(get_db),
):
    '''Allow the umpire to accept or decline an assignment using the token from the email link.'''
    try:
        assignment_id = _decode_action_token(token)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.status != models.AssignmentStatus.pending:
        raise HTTPException(status_code=400, detail=f"Assignment already {assignment.status.value}")

    if action == "accept":
        assignment.status = models.AssignmentStatus.accepted
    elif action == "decline":
        assignment.status = models.AssignmentStatus.declined
    else:
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'decline'")

    assignment.responded_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)

    if action == "decline":
        await _notify_admin_of_decline(db, assignment, "Umpire declined the assignment")

    return assignment


@router.get("/{assignment_id}/ical")
def download_ical(
    assignment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    '''Allow the umpire to download an iCal file for their accepted assignment.'''
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.umpire_id != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    if assignment.status != models.AssignmentStatus.accepted:
        raise HTTPException(status_code=400, detail="Assignment must be accepted to download iCal")

    game = assignment.game
    from icalendar import Calendar, Event
    from datetime import timezone

    cal = Calendar()
    cal.add("prodid", "-//Umpire Assignment//EN")
    cal.add("version", "2.0")

    event = Event()
    event.add("summary", f"Umpire: {game.title}")
    event.add("dtstart", datetime.combine(game.date, game.start_time).replace(tzinfo=timezone.utc))
    if game.end_time:
        event.add("dtend", datetime.combine(game.date, game.end_time).replace(tzinfo=timezone.utc))
    if game.location:
        event.add("location", game.location)
    event.add("description", f"Division: {game.division.value if game.division else 'Unknown'}")
    cal.add_component(event)

    ical_bytes = cal.to_ical()
    return Response(
        content=ical_bytes,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="assignment-{assignment_id}.ics"'},
    )


async def _notify_admin_of_decline(db: Session, assignment: models.Assignment, reason: str):
    '''Notify admins about an assignment decline or expiration.'''
    admins = db.query(models.User).filter(models.User.role == models.UserRole.admin).all()
    for admin in admins:
        try:
            await send_admin_notification(
                admin_email=admin.email,
                assignment_id=assignment.id,
                umpire_name=assignment.umpire.name,
                umpire_email=assignment.umpire.email,
                game_title=assignment.game.title,
                game_date=str(assignment.game.date),
                reason=reason,
            )
        except Exception as e:
            print(f"[EMAIL ERROR] {e}")
    assignment.notified_admin = True
    db.commit()
