from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, false, true

from app.db.base import Base


class URL(Base):
    __tablename__ = "urls"

    id = Column(Integer, primary_key=True)

    long_url = Column(String(2048))

    short_code = Column(String(100), unique=True, index=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)    

    visits = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.now)

    is_active = Column(Boolean, nullable=False, default=True, server_default=true())

    # naive UTC; NULL means never expires
    expires_at = Column(DateTime, nullable=True)

    # NULL means unlimited visits
    max_visits = Column(Integer, nullable=True)

    # set when an admin disables the link; the owner cannot turn it back on
    admin_disabled = Column(Boolean, nullable=False, default=False, server_default=false())
