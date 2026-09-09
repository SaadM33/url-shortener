
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.user import UserCreate, UserResponse
from app.models.user import User
from app.db.session import get_db
from app.core.security import hash_password

router = APIRouter()

#get list of users, this is just for testing purposes, in production you would not want to expose this endpoint
@router.get("/auth/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/auth/register", response_model=UserResponse)
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="email already registered")

    new_user = User(email=data.email, password_hash=hash_password(data.password), username=data.username)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user