from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from jose import JWTError

from app.db.session import get_db
from app.models.user import User
from app.core.config import settings
from app.core.ratelimit import create_url_limiter, login_limiter, register_limiter
from app.core.security import decode_access_token

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="not authenticated")

    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid or expired token")

    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="invalid token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="user not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="account disabled")

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="admin only")
    return current_user


def _client_ip(request: Request) -> str:
    # behind a reverse proxy this is the proxy's address unless uvicorn is
    # started with --proxy-headers and trusted forwarded IPs
    return request.client.host if request.client else "unknown"


def limit_login(request: Request) -> None:
    login_limiter.check(_client_ip(request))


def limit_register(request: Request) -> None:
    register_limiter.check(_client_ip(request))


def limit_create_url(current_user: User = Depends(get_current_user)) -> None:
    create_url_limiter.check(f"user:{current_user.id}")
