from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.click import Click


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def daily_counts(db: Session, column, since: datetime, days: int, *filters) -> list[dict]:
    """Rows per day for the last `days` days, zero-filled."""
    rows = (
        db.query(func.date(column), func.count())
        .filter(column >= since, *filters)
        .group_by(func.date(column))
        .all()
    )
    found = {r[0] if isinstance(r[0], date) else date.fromisoformat(str(r[0])): r[1] for r in rows}
    start = since.date()
    return [
        {"date": (start + timedelta(days=i)).isoformat(), "count": found.get(start + timedelta(days=i), 0)}
        for i in range(days + 1)
    ]


def _breakdown(db: Session, column, url_id: int, since: datetime, limit: int = 10) -> list[dict]:
    rows = (
        db.query(column, func.count().label("n"))
        .filter(Click.url_id == url_id, Click.clicked_at >= since)
        .group_by(column)
        .order_by(func.count().desc())
        .limit(limit)
        .all()
    )
    return [{"name": name or "(direct)", "count": n} for name, n in rows]


def link_stats(db: Session, url_id: int, days: int) -> dict:
    since = (utcnow() - timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)
    in_range = (Click.url_id == url_id, Click.clicked_at >= since)
    return {
        "days": days,
        "total_clicks": db.query(func.count(Click.id)).filter(*in_range).scalar(),
        "unique_visitors": db.query(func.count(func.distinct(Click.visitor_hash))).filter(*in_range).scalar(),
        "clicks_by_day": daily_counts(db, Click.clicked_at, since, days, Click.url_id == url_id),
        "top_referrers": _breakdown(db, Click.referrer, url_id, since),
        "devices": _breakdown(db, Click.device, url_id, since),
        "browsers": _breakdown(db, Click.browser, url_id, since),
    }
