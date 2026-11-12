from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, limit_login, limit_register
from app.models.user import User
from app.core.security import create_session_token, hash_password, verify_password
from app.core.config import settings
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.api.docs import errors

router = APIRouter()


def set_auth_cookie(response: Response, user: User) -> None:
    token = create_session_token(user)
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        max_age=settings.TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/auth/me", response_model=UserResponse, tags=["Auth"], summary='Who am I', description='Returns the logged-in user.', responses=errors(401, 403))
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/auth/register", response_model=UserResponse, dependencies=[Depends(limit_register)], tags=["Auth"], summary='Create an account', description='Registers with email, username and a password of 8 to 72 characters. Does not log you in.', responses=errors(400, 422, 429))
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="email already registered")

    new_user = User(email=data.email, password_hash=hash_password(data.password), username=data.username)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/auth/login", dependencies=[Depends(limit_login)], tags=["Auth"], summary='Log in', description='Checks email and password and sets the session cookie. Banned accounts get 403.', responses=errors(401, 403, 429))
def login(data: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="account disabled")

    set_auth_cookie(response, user)
    return {"detail": "logged in"}


@router.post("/auth/refresh", tags=["Auth"], summary='Extend the session', description='Issues a fresh cookie with a new expiry for a still-valid session.', responses=errors(401, 403))
def refresh(response: Response, current_user: User = Depends(get_current_user)):
    """Issue a fresh token for a still-valid session (sliding expiry)."""
    set_auth_cookie(response, current_user)
    return {"detail": "token refreshed"}


@router.post("/auth/logout", tags=["Auth"], summary='Log out', description='Clears the session cookie. Safe to call when not logged in.')
def logout(response: Response):
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
    )
    return {"detail": "logged out"}
