import secrets
import string
from datetime import datetime, timezone

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import and_, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.click import Click
from app.models.url import URL
from app.models.user import User
from app.schemas.url import URLInput, URLPage, URLResponse, URLStats, URLUpdate
from app.services.stats import link_stats
from app.services.useragent import parse_user_agent, referrer_host, visitor_hash

router = APIRouter()

# aliases that would collide with real routes (compared case-insensitively)
RESERVED_ALIASES = {
    "urls", "auth", "docs", "redoc", "openapi", "openapi.json",
    "admin", "api", "health", "static", "favicon.ico", "login", "logout",
}


def generate_short_code(length: int = 6) -> str:
    pool = string.ascii_letters + string.digits
    return "".join(secrets.choice(pool) for _ in range(length))


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def code_exists(db: Session, code: str) -> bool:
    return db.query(URL.id).filter(URL.short_code == code).first() is not None


def filter_urls(query, search: str | None, status: str | None):
    """Shared by the user dashboard and the admin link list."""
    if search:
        like = f"%{search}%"
        query = query.filter(or_(URL.long_url.like(like), URL.short_code.like(like)))

    now = utcnow()
    expired = or_(
        and_(URL.expires_at.is_not(None), URL.expires_at <= now),
        and_(URL.max_visits.is_not(None), func.coalesce(URL.visits, 0) >= URL.max_visits),
    )
    if status == "expired":
        query = query.filter(URL.is_active.is_(True), expired)
    elif status == "disabled":
        query = query.filter(or_(URL.is_active.is_(False), URL.admin_disabled.is_(True)))
    elif status == "active":
        query = query.filter(URL.is_active.is_(True), URL.admin_disabled.is_(False), ~expired)
    return query


def paginate_urls(query, sort: str, order: str, limit: int, offset: int) -> dict:
    column = {"created_at": URL.created_at, "visits": URL.visits, "expires_at": URL.expires_at}[sort]
    ordering = column.asc() if order == "asc" else column.desc()
    total = query.count()
    items = query.order_by(ordering, URL.id.desc()).offset(offset).limit(limit).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/urls", response_model=URLPage)
def get_urls(
    q: str | None = Query(None, max_length=200, description="search in short code and target URL"),
    status: Literal["active", "expired", "disabled"] | None = None,
    sort: Literal["created_at", "visits", "expires_at"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = filter_urls(db.query(URL).filter(URL.owner_id == current_user.id), q, status)
    return paginate_urls(query, sort, order, limit, offset)


def get_owned_url(code: str, db: Session, user: User) -> URL:
    url = db.query(URL).filter(URL.short_code == code).first()
    if not url:
        raise HTTPException(status_code=404, detail="short code not found")
    if url.owner_id != user.id:
        raise HTTPException(status_code=403, detail="not your link")
    return url


@router.post("/urls", response_model=URLResponse)
def create_url(
    data: URLInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.alias:
        if data.alias.lower() in RESERVED_ALIASES:
            raise HTTPException(status_code=400, detail="alias is reserved")
        if code_exists(db, data.alias):
            raise HTTPException(status_code=409, detail="alias already taken")
        code = data.alias
    else:
        code = generate_short_code()
        while code_exists(db, code):
            code = generate_short_code()

    new_url = URL(
        long_url=str(data.url),
        short_code=code,
        owner_id=current_user.id,
        expires_at=data.expires_at,
        max_visits=data.max_visits,
    )
    db.add(new_url)
    try:
        db.commit()
    except IntegrityError:
        # lost a race for the same code
        db.rollback()
        raise HTTPException(status_code=409, detail="short code already taken, try again")
    db.refresh(new_url)
    return new_url


@router.put("/urls/{code}", response_model=URLResponse)
def update_url(
    code: str,
    data: URLUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = get_owned_url(code, db, current_user)

    # only touch fields the client actually sent, so null can clear expiry/limit
    sent = data.model_fields_set
    if "url" in sent:
        if data.url is None:
            raise HTTPException(status_code=422, detail="url cannot be null")
        url.long_url = str(data.url)
    if "is_active" in sent:
        if data.is_active is None:
            raise HTTPException(status_code=422, detail="is_active cannot be null")
        if data.is_active and url.admin_disabled:
            raise HTTPException(status_code=403, detail="link was disabled by an admin")
        url.is_active = data.is_active
    if "expires_at" in sent:
        url.expires_at = data.expires_at
    if "max_visits" in sent:
        url.max_visits = data.max_visits

    db.commit()
    db.refresh(url)
    return url


@router.get("/urls/{code}/stats", response_model=URLStats)
def get_url_stats(
    code: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = db.query(URL).filter(URL.short_code == code).first()
    if not url:
        raise HTTPException(status_code=404, detail="short code not found")
    if url.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="not your link")
    return link_stats(db, url.id, days)


@router.delete("/urls/{code}")
def delete_url(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = get_owned_url(code, db, current_user)

    db.delete(url)
    db.commit()
    return {"detail": "URL deleted successfully"}


@router.get("/{code}")
def redirect_to_url(code: str, request: Request, db: Session = Depends(get_db)):
    url = db.query(URL).filter(URL.short_code == code).first()
    if not url or not url.is_active or url.admin_disabled:
        raise HTTPException(status_code=404, detail="short code not found")

    now = utcnow()
    if url.expires_at is not None and url.expires_at <= now:
        raise HTTPException(status_code=410, detail="link expired")

    # one atomic UPDATE both counts the visit and enforces the click limit,
    # so concurrent hits can't slip past max_visits
    updated = (
        db.query(URL)
        .filter(
            URL.id == url.id,
            or_(URL.max_visits.is_(None), func.coalesce(URL.visits, 0) < URL.max_visits),
        )
        .update({URL.visits: func.coalesce(URL.visits, 0) + 1}, synchronize_session=False)
    )
    if updated == 0:
        db.commit()
        raise HTTPException(status_code=410, detail="link expired")

    # record the counted visit in the same transaction
    ua = request.headers.get("user-agent")
    device, browser = parse_user_agent(ua)
    db.add(
        Click(
            url_id=url.id,
            clicked_at=now,
            referrer=referrer_host(request.headers.get("referer")),
            device=device,
            browser=browser,
            visitor_hash=visitor_hash(request.client.host if request.client else None, ua),
        )
    )
    db.commit()

    return RedirectResponse(url=url.long_url, status_code=302)
