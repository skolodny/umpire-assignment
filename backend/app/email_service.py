import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from app.config import get_settings

settings = get_settings()

ASSIGNMENT_TEMPLATE = """
Hi {{ name }},

You have been assigned to umpire a game:

  Title:    {{ title }}
  Date:     {{ date }}
  Time:     {{ start_time }}
  Location: {{ location }}
  Division: {{ division }}

Please respond within 24 hours:

  Accept:  {{ accept_url }}
  Decline: {{ decline_url }}

Thank you,
Umpire Assignment System
"""

ADMIN_NOTIFICATION_TEMPLATE = """
Hi Admin,

This is a notification about assignment #{{ assignment_id }}:

  Umpire:  {{ umpire_name }} ({{ umpire_email }})
  Game:    {{ game_title }}
  Date:    {{ game_date }}
  Reason:  {{ reason }}

Please log in to reassign the game if needed.

{{ app_url }}
"""


async def send_email(to: str, subject: str, body: str) -> None:
    if not settings.smtp_username:
        print(f"[EMAIL] To: {to}\nSubject: {subject}\n{body}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(body, "plain"))

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_username,
        password=settings.smtp_password,
        start_tls=True,
    )


async def send_assignment_email(
    umpire_email: str,
    umpire_name: str,
    assignment_id: int,
    game_title: str,
    game_date: str,
    game_start_time: str,
    game_location: str,
    game_division: str,
    token: str,
) -> None:
    accept_url = f"{settings.app_base_url}/assignments?action=accept&token={token}"
    decline_url = f"{settings.app_base_url}/assignments?action=decline&token={token}"
    body = Template(ASSIGNMENT_TEMPLATE).render(
        name=umpire_name,
        title=game_title,
        date=game_date,
        start_time=game_start_time,
        location=game_location or "TBD",
        division=game_division,
        accept_url=accept_url,
        decline_url=decline_url,
    )
    await send_email(umpire_email, f"Umpire Assignment: {game_title}", body)


async def send_admin_notification(
    admin_email: str,
    assignment_id: int,
    umpire_name: str,
    umpire_email: str,
    game_title: str,
    game_date: str,
    reason: str,
) -> None:
    body = Template(ADMIN_NOTIFICATION_TEMPLATE).render(
        assignment_id=assignment_id,
        umpire_name=umpire_name,
        umpire_email=umpire_email,
        game_title=game_title,
        game_date=game_date,
        reason=reason,
        app_url=settings.app_base_url,
    )
    await send_email(admin_email, f"Assignment Update: {game_title}", body)
