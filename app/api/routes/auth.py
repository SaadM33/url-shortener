from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.schemas.user import UserCreate, UserResponse, UserLogin


router = APIRouter()

@router.get("/auth/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

COOKIE_NAME = "access_token"

def set_auth_cookie(response: Response, user_id: int):
    token = create_access_token(
        data={"user_id": str(user_id)},
        expires_minutes=settings.TOKEN_EXPIRE_MINUTES,
    )
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.TOKEN_EXPIRE_MINUTES * 60,
    )


# get list of users, this is just for testing purposes, in production you would not want to expose this endpoint
@router.get("/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/auth/register", response_model=UserResponse)
def register(data: UserCreate, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="email already registered")

    new_user = User(email=data.email, password_hash=hash_password(data.password), username=data.username)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    set_auth_cookie(response, new_user.id)
    return new_user


@router.post("/auth/login")
def login(data: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")

    set_auth_cookie(response, user.id)
    return {"detail": "logged in"}


@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, httponly=True, samesite="lax", secure=False)
    return {"detail": "logged out"}
