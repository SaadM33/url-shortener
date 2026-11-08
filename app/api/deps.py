from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from jose import JWTError

from app.db.session import get_db
from app.models.user import User
from app.core.config import settings
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

    return user