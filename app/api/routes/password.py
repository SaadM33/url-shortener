from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from jose import JWTError
from sqlalchemy.orm import Session

from app.api.deps import limit_forgot, limit_login
from app.core.config import settings
from app.core.security import (
    create_reset_token,
    decode_access_token,
    hash_password,
    password_fingerprint,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import ForgotPassword, ResetPassword
from app.services.email import send_email

router = APIRouter()


@router.post("/auth/forgot-password", dependencies=[Depends(limit_forgot)])
def forgot_password(data: ForgotPassword, background: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if user and user.is_active:
        link = f"{settings.FRONTEND_URL}/reset-password?token={create_reset_token(user)}"
        body = (
            "Someone asked to reset the password for this account.\n\n"
            f"Open this link within {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes to choose a new one:\n{link}\n\n"
            "If that wasn't you, ignore this email; your password has not changed."
        )
        background.add_task(send_email, user.email, "Reset your password", body)
    # same answer whether or not the email exists, so it can't be used to probe accounts
    return {"detail": "If that email is registered, a reset link has been sent"}


@router.post("/auth/reset-password", dependencies=[Depends(limit_login)])
def reset_password(data: ResetPassword, db: Session = Depends(get_db)):
    invalid = HTTPException(status_code=400, detail="invalid or expired reset token")
    try:
        payload = decode_access_token(data.token)
    except JWTError:
        raise invalid

    user = db.query(User).filter(User.id == int(payload.get("user_id", 0))).first()
    # the fingerprint check makes each link single-use: it stops matching once the password changes
    if (
        not user
        or not user.is_active
        or payload.get("typ") != "reset"
        or payload.get("pwf") != password_fingerprint(user.password_hash)
    ):
        raise invalid

    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"detail": "password updated, please log in"}
