'''API router for handling OAuth authentication with Supabase.'''

from urllib.parse import urlencode
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from app.config import get_settings

router = APIRouter(prefix="/oauth", tags=["oauth"])
settings = get_settings()

ALLOWED_PROVIDERS = {"google", "github", "azure", "facebook", "twitter", "discord", "slack"}


@router.get("/consent")
def oauth_consent(provider: str = "google"):
    """Redirect the user to Supabase's OAuth consent page for the given provider."""
    if provider not in ALLOWED_PROVIDERS:
        raise HTTPException(status_code=400,
                    detail=f"Unsupported provider. Allowed: {', '.join(sorted(ALLOWED_PROVIDERS))}")
    callback_url = f"{settings.app_base_url}/oauth/callback"
    params = urlencode({"provider": provider, "redirect_to": callback_url})
    supabase_auth_url = f"{settings.supabase_url}/auth/v1/authorize?{params}"
    return RedirectResponse(url=supabase_auth_url)
