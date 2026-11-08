from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.api.routes.urls import filter_urls, paginate_urls
from app.db.session import get_db
from app.models.click import Click
from app.models.url import URL
from app.models.user import User
from app.schemas.admin import (
    AdminURLUpdate,
    AdminUserPage,
    AdminUserResponse,
    AdminUserUpdate,
    SiteStats,
)
from app.schemas.url import TopLink, URLPage, URLResponse
from app.services.stats import daily_counts, utcnow

router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])


# ---------- users ----------

@router.get("/users", response_model=AdminUserPage)
def list_users(
    q: str | None = Query(None, max_length=200, description="search email or username"),
    role: Literal["user", "admin"] | None = None,
    is_active: bool | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.email.like(like), User.username.like(like)))
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active.is_(is_active))
    total = query.count()
    items = query.order_by(User.id).offset(offset).limit(limit).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def _get_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    return user


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
def update_user(
    user_id: int,
    data: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = _get_user(db, user_id)
    if user.id == admin.id and (data.role == "user" or data.is_active is False):
        raise HTTPException(status_code=400, detail="you cannot demote or ban yourself")
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = _get_user(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="you cannot delete yourself")
    # their links (and, via ON DELETE CASCADE, the click history) go with them
    db.query(URL).filter(URL.owner_id == user.id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    return {"detail": "user and their links deleted"}


# ---------- link moderation ----------

@router.get("/urls", response_model=URLPage)
def list_all_urls(
    q: str | None = Query(None, max_length=200),
    status: Literal["active", "expired", "disabled"] | None = None,
    owner_id: int | None = None,
    sort: Literal["created_at", "visits", "expires_at"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(URL)
    if owner_id is not None:
        query = query.filter(URL.owner_id == owner_id)
    return paginate_urls(filter_urls(query, q, status), sort, order, limit, offset)


def _get_url(db: Session, code: str) -> URL:
    url = db.query(URL).filter(URL.short_code == code).first()
    if not url:
        raise HTTPException(status_code=404, detail="short code not found")
    return url


@router.patch("/urls/{code}", response_model=URLResponse)
def moderate_url(code: str, data: AdminURLUpdate, db: Session = Depends(get_db)):
    url = _get_url(db, code)
    if data.is_active:
        url.admin_disabled = False
        url.is_active = True
    else:
        url.admin_disabled = True
        url.is_active = False
    db.commit()
    db.refresh(url)
    return url


@router.delete("/urls/{code}")
def admin_delete_url(code: str, db: Session = Depends(get_db)):
    db.delete(_get_url(db, code))
    db.commit()
    return {"detail": "URL deleted successfully"}


# ---------- site-wide stats ----------

@router.get("/stats", response_model=SiteStats)
def site_stats(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    since = (utcnow() - timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)
    top = db.query(URL).order_by(func.coalesce(URL.visits, 0).desc()).limit(5).all()
    return {
        "days": days,
        "total_users": db.query(func.count(User.id)).scalar(),
        "total_links": db.query(func.count(URL.id)).scalar(),
        "total_clicks": db.query(func.count(Click.id)).scalar(),
        "new_users_by_day": daily_counts(db, User.created_at, since, days),
        "new_links_by_day": daily_counts(db, URL.created_at, since, days),
        "clicks_by_day": daily_counts(db, Click.clicked_at, since, days),
        "top_links": [
            TopLink(short_code=u.short_code, long_url=u.long_url, visits=u.visits or 0) for u in top
        ],
    }
