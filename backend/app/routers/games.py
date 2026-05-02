from datetime import date, time, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx
from icalendar import Calendar
from app import models
from app.auth import require_admin, get_current_user
from app.database import get_db
from app.config import get_settings

router = APIRouter(prefix="/games", tags=["games"])
settings = get_settings()


class GameOut(BaseModel):
    id: int
    external_uid: str
    title: str
    division: Optional[str]
    date: date
    start_time: time
    end_time: Optional[time]
    location: Optional[str]
    home_team: Optional[str]
    away_team: Optional[str]

    class Config:
        from_attributes = True


class EligibleUmpire(BaseModel):
    id: int
    name: str
    email: str


@router.get("", response_model=List[GameOut])
def list_games(
    month: Optional[str] = None,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(models.Game)
    if month:
        try:
            year, mon = map(int, month.split("-"))
            from sqlalchemy import extract
            query = query.filter(
                extract("year", models.Game.date) == year,
                extract("month", models.Game.date) == mon,
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    return query.order_by(models.Game.date, models.Game.start_time).all()


def _fetch_and_import_feed(
    url: str,
    division: models.Division,
    db: Session,
) -> tuple[int, int]:
    """Fetch a single iCal feed and upsert its games, assigning *division* to every event."""
    try:
        resp = httpx.get(url, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch iCal feed ({url}): {e}")

    cal = Calendar.from_ical(resp.content)
    added = 0
    updated = 0

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        uid = str(component.get("UID", ""))
        if not uid:
            continue

        dtstart = component.get("DTSTART")
        dtend = component.get("DTEND")
        summary = str(component.get("SUMMARY", "Game"))
        location = str(component.get("LOCATION", "")) or None

        if not dtstart:
            continue

        dt = dtstart.dt
        if hasattr(dt, "date"):
            game_date = dt.date()
            game_start = dt.time()
        else:
            game_date = dt
            game_start = time(0, 0)

        game_end = None
        if dtend:
            dt_end = dtend.dt
            if hasattr(dt_end, "time"):
                game_end = dt_end.time()

        existing = db.query(models.Game).filter(models.Game.external_uid == uid).first()
        if existing:
            existing.title = summary
            existing.division = division
            existing.date = game_date
            existing.start_time = game_start
            existing.end_time = game_end
            existing.location = location
            existing.imported_at = datetime.utcnow()
            updated += 1
        else:
            db.add(models.Game(
                external_uid=uid,
                title=summary,
                division=division,
                date=game_date,
                start_time=game_start,
                end_time=game_end,
                location=location,
                imported_at=datetime.utcnow(),
            ))
            added += 1

    return added, updated


@router.post("/sync", status_code=200)
def sync_games(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not any([
        settings.ical_feed_url_int_i,
        settings.ical_feed_url_rookies,
        settings.ical_feed_url_int_ii,
    ]):
        raise HTTPException(
            status_code=400,
            detail="No iCal feed URLs configured (ICAL_FEED_URL_INT_I, ICAL_FEED_URL_ROOKIES, ICAL_FEED_URL_INT_II)",
        )

    added = 0
    updated = 0

    if settings.ical_feed_url_int_i:
        a, u = _fetch_and_import_feed(settings.ical_feed_url_int_i, models.Division.int_i, db)
        added += a
        updated += u

    if settings.ical_feed_url_rookies:
        a, u = _fetch_and_import_feed(settings.ical_feed_url_rookies, models.Division.rookies, db)
        added += a
        updated += u

    if settings.ical_feed_url_int_ii:
        a, u = _fetch_and_import_feed(settings.ical_feed_url_int_ii, models.Division.int_ii, db)
        added += a
        updated += u

    db.commit()
    return {"added": added, "updated": updated}


@router.get("/{game_id}/eligible-umpires", response_model=List[EligibleUmpire])
def get_eligible_umpires(
    game_id: int,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Umpires available on that day (any slot that covers the game start)
    available_query = db.query(models.AvailabilitySlot.user_id).filter(
        models.AvailabilitySlot.date == game.date,
        models.AvailabilitySlot.start_time <= game.start_time,
        models.AvailabilitySlot.end_time >= game.start_time,
    )
    available_ids = {row[0] for row in available_query}

    if not available_ids:
        return []

    # If game has a division, further filter by division preference
    if game.division:
        pref_query = db.query(models.DivisionPreference.user_id).filter(
            models.DivisionPreference.user_id.in_(available_ids),
            models.DivisionPreference.division == game.division,
        )
        eligible_ids = {row[0] for row in pref_query}
    else:
        eligible_ids = available_ids

    if not eligible_ids:
        return []

    umpires = db.query(models.User).filter(
        models.User.id.in_(eligible_ids),
        models.User.role == models.UserRole.umpire,
    ).all()
    return [EligibleUmpire(id=u.id, name=u.name, email=u.email) for u in umpires]
