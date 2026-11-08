import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    if not hashed_password:  # Google-only account, no password set
        return False
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_minutes: int = 30):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_KEY, algorithm="HS256")

def decode_access_token(token: str):
    return jwt.decode(token, settings.JWT_KEY, algorithms=["HS256"])


def password_fingerprint(password_hash: str | None) -> str:
    """Changes whenever the password changes. Embedded in tokens so that a
    password change/reset invalidates every older session and reset link."""
    return hmac.new(settings.JWT_KEY.encode(), (password_hash or "").encode(), hashlib.sha256).hexdigest()[:16]


def create_session_token(user) -> str:
    return create_access_token(
        data={"user_id": str(user.id), "typ": "access", "pwf": password_fingerprint(user.password_hash)},
        expires_minutes=settings.TOKEN_EXPIRE_MINUTES,
    )


def create_reset_token(user) -> str:
    return create_access_token(
        data={"user_id": str(user.id), "typ": "reset", "pwf": password_fingerprint(user.password_hash)},
        expires_minutes=settings.RESET_TOKEN_EXPIRE_MINUTES,
    )
