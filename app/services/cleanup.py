from sqlalchemy.orm import Session

from app.models.click import Click
from app.models.url import URL


def delete_urls(db: Session, *criteria) -> int:
    """Delete matching links and their click history. Returns how many links went."""
    ids = db.query(URL.id).filter(*criteria)
    # explicit so it also works where the database doesn't enforce ON DELETE CASCADE
    db.query(Click).filter(Click.url_id.in_(ids)).delete(synchronize_session=False)
    deleted = db.query(URL).filter(*criteria).delete(synchronize_session=False)
    db.commit()
    return deleted
