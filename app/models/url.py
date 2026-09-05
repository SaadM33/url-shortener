from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.db.base import Base


class URL(Base):
    __tablename__ = "urls"

    id = Column(Integer, primary_key=True)

    long_url = Column(String(2048))

    short_code = Column(String(100), unique=True, index=True)

    visits = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.now)
