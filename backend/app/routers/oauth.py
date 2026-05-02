from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from app.config import get_settings

router = APIRouter(prefix="/oauth", tags=["oauth"])
settings = get_settings()


@router.get("/consent")
def oauth_consent(provider: str = "google"):
    """Redirect the user to Supabase's OAuth consent page for the given provider."""
    callback_url = f"{settings.app_base_url}/oauth/callback"
    supabase_auth_url = (
        f"{settings.supabase_url}/auth/v1/authorize"
        f"?provider={provider}"
        f"&redirect_to={callback_url}"
    )
    return RedirectResponse(url=supabase_auth_url)
