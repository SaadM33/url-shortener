import re

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.routes.auth import set_auth_cookie
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.api.docs import errors

router = APIRouter()

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def _require_configured() -> None:
    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET):
        raise HTTPException(status_code=503, detail="Google login is not configured")


def _unique_username(db: Session, email: str) -> str:
    base = re.sub(r"[^A-Za-z0-9_.-]", "", email.split("@")[0])[:40] or "user"
    candidate, n = base, 1
    while db.query(User.id).filter(User.username == candidate).first():
        n += 1
        candidate = f"{base}{n}"
    return candidate


def get_or_create_google_user(db: Session, sub: str, email: str, email_verified: bool) -> User:
    """Find the user for a Google identity, linking by email or creating one."""
    user = db.query(User).filter(User.google_sub == sub).first()
    if user:
        return user

    # Only trust the email if Google verified it, otherwise anyone could claim
    # someone else's account by registering that address at Google unverified.
    if not email_verified:
        raise HTTPException(status_code=400, detail="Google email is not verified")

    user = db.query(User).filter(User.email == email).first()
    if user:
        user.google_sub = sub
        user.email_verified = True
    else:
        user = User(email=email, username=_unique_username(db, email), google_sub=sub, email_verified=True)
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/auth/providers", tags=["Auth"], summary="Available sign-in methods",
            description="Lets the frontend show the Google button only when Google sign-in is configured.")
def providers():
    return {"password": True, "google": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)}


def _back_to_login(error: str) -> RedirectResponse:
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error={error}", status_code=302)


@router.get("/auth/google/login", tags=["Auth"], summary='Start Google sign-in', description='Redirects the browser to Google. Open it as a page, not via fetch.', responses=errors(503))
async def google_login(request: Request):
    _require_configured()
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/auth/google/callback", tags=["Auth"], summary='Finish Google sign-in', description='Google redirects here. Links to an existing account when the email matches and Google verified it, otherwise creates one, sets the cookie and redirects to the frontend. On failure it redirects to `FRONTEND_URL/login?error=...`.')
async def google_callback(request: Request, db: Session = Depends(get_db)):
    # this is a browser redirect, so failures go back to the login page instead of showing JSON
    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET):
        return _back_to_login("google_unavailable")
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError:
        return _back_to_login("google_failed")

    info = token.get("userinfo")
    if not info or not info.get("email"):
        return _back_to_login("google_no_email")

    try:
        user = get_or_create_google_user(db, info["sub"], info["email"], bool(info.get("email_verified")))
    except HTTPException:
        return _back_to_login("google_unverified")

    if not user.is_active:
        return _back_to_login("account_disabled")

    response = RedirectResponse(url=settings.FRONTEND_URL, status_code=302)
    set_auth_cookie(response, user)
    return response
