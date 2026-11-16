from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response
from jose import JWTError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, limit_login, limit_register, limit_resend_verify
from app.models.user import User
from app.core.security import create_session_token, create_verify_token, decode_access_token, hash_password, verify_password
from app.core.config import settings
from app.schemas.user import UserCreate, UserResponse, UserLogin, VerifyEmail
from app.services.email import send_email
from app.api.docs import errors

router = APIRouter()


def send_verification_email(background: BackgroundTasks, user: User) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={create_verify_token(user)}"
    hours = settings.VERIFY_TOKEN_EXPIRE_MINUTES // 60
    body = (
        f"Welcome! Confirm this is your email address by opening this link within {hours} hours:\n{link}\n\n"
        "If you didn't create an account, ignore this email."
    )
    background.add_task(send_email, user.email, "Confirm your email address", body)


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

@router.post("/auth/register", response_model=UserResponse, dependencies=[Depends(limit_register)], tags=["Auth"], summary='Create an account', description='Registers with email, username and a password of 8 to 72 characters, and emails a link to confirm the address. Does not log you in.', responses=errors(400, 422, 429))
def register(data: UserCreate, background: BackgroundTasks, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="email already registered")

    new_user = User(email=data.email, password_hash=hash_password(data.password), username=data.username)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    send_verification_email(background, new_user)
    return new_user


@router.post("/auth/verify-email", response_model=UserResponse, tags=["Auth"], summary='Confirm an email address', description='Uses the token from the verification email. Works without being logged in. Using it twice is harmless.', responses=errors(400, 422))
def verify_email(data: VerifyEmail, db: Session = Depends(get_db)):
    invalid = HTTPException(status_code=400, detail="invalid or expired verification link")
    try:
        payload = decode_access_token(data.token)
    except JWTError:
        raise invalid

    user = db.query(User).filter(User.id == int(payload.get("user_id", 0))).first()
    if not user or payload.get("typ") != "verify" or payload.get("email") != user.email:
        raise invalid

    user.email_verified = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/resend-verification", dependencies=[Depends(limit_resend_verify)], tags=["Auth"], summary='Send the verification email again', description='For the logged-in user. Does nothing if the address is already verified.', responses=errors(401, 403, 429))
def resend_verification(background: BackgroundTasks, current_user: User = Depends(get_current_user)):
    if not current_user.email_verified:
        send_verification_email(background, current_user)
    return {"detail": "verification email sent"}


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
