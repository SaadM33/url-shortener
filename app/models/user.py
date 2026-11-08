from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, true

from app.db.base import Base

class User(Base):
	__tablename__ = "users"

	id = Column(Integer, primary_key=True)

	username = Column(String(50), unique=True, index=True)

	email = Column(String(100), unique=True, index=True, nullable=False)

	# NULL for accounts that only sign in with Google
	password_hash = Column(String(128), nullable=True)

	google_sub = Column(String(64), unique=True, nullable=True)

	role = Column(String(20), nullable=False, default="user", server_default="user")

	# False = banned
	is_active = Column(Boolean, nullable=False, default=True, server_default=true())

	created_at = Column(DateTime, default=datetime.now)