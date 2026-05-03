'''Scheduler module to check for expired umpire assignments and notify admins.'''

from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from app.email_service import send_admin_notification

scheduler = AsyncIOScheduler()


async def check_expired_assignments():
    '''Check for pending assignments that have not been 
    accepted or declined within 24 hours and mark them as expired. 
    Notify admins about expired assignments.'''
    db: Session = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(hours=24)
        pending = db.query(models.Assignment).filter(
            models.Assignment.status == models.AssignmentStatus.pending,
            models.Assignment.assigned_at <= cutoff,
        ).all()

        for assignment in pending:
            assignment.status = models.AssignmentStatus.expired
            db.commit()

            if not assignment.notified_admin:
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
                            reason="Assignment expired (no response within 24 hours)",
                        )
                    except Exception as e:
                        print(f"[EMAIL ERROR] {e}")
                assignment.notified_admin = True
                db.commit()
    finally:
        db.close()


def start_scheduler():
    '''Start the scheduler to run the expiry check every hour.'''
    scheduler.add_job(check_expired_assignments, "interval", hours=1, id="expiry_check")
    scheduler.start()


def stop_scheduler():
    '''Stop the scheduler and clean up resources.'''
    scheduler.shutdown()
