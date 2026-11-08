import re

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.routes.auth import set_auth_cookie
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

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
    else:
        user = User(email=email, username=_unique_username(db, email), google_sub=sub)
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/auth/google/login")
async def google_login(request: Request):
    _require_configured()
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    _require_configured()
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError:
        raise HTTPException(status_code=400, detail="Google login failed")

    info = token.get("userinfo")
    if not info or not info.get("email"):
        raise HTTPException(status_code=400, detail="Google did not return an email")

    user = get_or_create_google_user(
        db, info["sub"], info["email"], bool(info.get("email_verified"))
    )

    response = RedirectResponse(url=settings.FRONTEND_URL, status_code=302)
    set_auth_cookie(response, user.id)
    return response
