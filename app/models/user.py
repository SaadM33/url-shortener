from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.db.base import Base

class User(Base):
	__tablename__ = "users"

	id = Column(Integer, primary_key=True)

	username = Column(String(50), unique=True, index=True)

	email = Column(String(100), unique=True, index=True, nullable=False)

	password_hash = Column(String(128), nullable=False)

	created_at = Column(DateTime, default=datetime.now)