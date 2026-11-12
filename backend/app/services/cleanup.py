import asyncio
import logging
from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal

from app.models.click import Click
from app.models.url import URL
from app.services.stats import utcnow

logger = logging.getLogger("uvicorn.error")


def delete_urls(db: Session, *criteria) -> int:
    """Delete matching links and their click history. Returns how many links went."""
    ids = db.query(URL.id).filter(*criteria)
    # explicit so it also works where the database doesn't enforce ON DELETE CASCADE
    db.query(Click).filter(Click.url_id.in_(ids)).delete(synchronize_session=False)
    deleted = db.query(URL).filter(*criteria).delete(synchronize_session=False)
    db.commit()
    return deleted


def purge_expired_links(db: Session, retention_days: int) -> int:
    """Delete links that expired more than `retention_days` ago (with their clicks)."""
    cutoff = utcnow() - timedelta(days=retention_days)
    return delete_urls(db, URL.expires_at.is_not(None), URL.expires_at < cutoff)


def run_cleanup_once() -> int:
    db = SessionLocal()
    try:
        return purge_expired_links(db, settings.EXPIRED_LINK_RETENTION_DAYS)
    finally:
        db.close()


async def cleanup_loop() -> None:
    """Runs for the life of the app; errors are logged and never stop the loop."""
    while True:
        try:
            deleted = await asyncio.to_thread(run_cleanup_once)
            if deleted:
                logger.info("cleanup: deleted %d expired link(s)", deleted)
        except Exception:
            logger.exception("cleanup run failed")
        await asyncio.sleep(settings.CLEANUP_INTERVAL_MINUTES * 60)
