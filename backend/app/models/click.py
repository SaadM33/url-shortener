from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Click(Base):
    """One counted visit to a short link. Raw IPs are never stored."""

    __tablename__ = "clicks"

    id = Column(Integer, primary_key=True)

    url_id = Column(Integer, ForeignKey("urls.id", ondelete="CASCADE"), nullable=False)

    # naive UTC
    clicked_at = Column(DateTime, nullable=False, default=_utcnow, index=True)

    # hostname of the Referer header only, NULL for direct visits
    referrer = Column(String(255), nullable=True)

    device = Column(String(20), nullable=True)

    browser = Column(String(40), nullable=True)

    # salted hash of ip + user agent, only used to count unique visitors
    visitor_hash = Column(String(64), nullable=True)

    __table_args__ = (Index("ix_clicks_url_id_clicked_at", "url_id", "clicked_at"),)
