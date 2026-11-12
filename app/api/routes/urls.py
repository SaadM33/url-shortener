import secrets
import string
from datetime import datetime, timezone

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import and_, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, limit_create_url
from app.db.session import get_db
from app.models.click import Click
from app.models.url import URL
from app.models.user import User
from app.schemas.url import URLInput, URLPage, URLResponse, URLStats, URLUpdate
from app.services.stats import link_stats
from app.services.useragent import parse_user_agent, referrer_host, visitor_hash
from app.api.docs import errors

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


@router.get("/urls", response_model=URLPage, tags=["Links"], summary='List my links', description='Paginated, newest first by default. Filter with `status`, search the short code and target with `q`.', responses=errors(401, 403, 422))
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


@router.post("/urls", response_model=URLResponse, dependencies=[Depends(limit_create_url)], tags=["Links"], summary='Create a short link', description='Random 6-character code, or pick your own with `alias` (3-50 letters, digits, `-`, `_`; reserved words not allowed). Optionally expire it by date and/or number of clicks.', responses=errors(400, 401, 403, 409, 422, 429))
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


@router.put("/urls/{code}", response_model=URLResponse, tags=["Links"], summary='Update a link', description='Send only what you want to change. Send `null` for `expires_at` or `max_visits` to remove the limit. Links disabled by an admin cannot be re-enabled.', responses=errors(401, 403, 404, 422))
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


@router.get("/urls/{code}", response_model=URLResponse, tags=["Links"], summary='Get one link', description='Owner or admin.', responses=errors(401, 403, 404))
def get_url(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = db.query(URL).filter(URL.short_code == code).first()
    if not url:
        raise HTTPException(status_code=404, detail="short code not found")
    if url.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="not your link")
    return url


@router.get("/urls/{code}/stats", response_model=URLStats, tags=["Links"], summary='Link analytics', description='Clicks per day, unique visitors, top referrers, devices and browsers over the last `days` days (1-365). Owner or admin.', responses=errors(401, 403, 404, 422))
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


@router.delete("/urls/{code}", tags=["Links"], summary='Delete a link', description='Deletes the link and its click history.', responses=errors(401, 403, 404))
def delete_url(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = get_owned_url(code, db, current_user)

    db.delete(url)
    db.commit()
    return {"detail": "URL deleted successfully"}


_UNAVAILABLE_PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title>
<style>body{{font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;
background:#f8fafc;color:#0f172a}}@media (prefers-color-scheme:dark){{body{{background:#0b1120;color:#e2e8f0}}}}
main{{text-align:center;padding:24px;max-width:28rem}}h1{{font-size:1.5rem;margin:0 0 8px}}p{{opacity:.75;margin:0}}</style>
</head><body><main><h1>{title}</h1><p>{text}</p></main></body></html>"""


def _unavailable(request: Request, status: int, detail: str, title: str, text: str):
    """Browsers get a small page; API clients keep the JSON error."""
    if "text/html" in request.headers.get("accept", ""):
        return HTMLResponse(_UNAVAILABLE_PAGE.format(title=title, text=text), status_code=status)
    raise HTTPException(status_code=status, detail=detail)


@router.get("/{code}", tags=["Redirect"], summary='Follow a short link', description='302 redirect to the target and counts the visit. 404 if the code does not exist or the link is disabled; 410 if it expired or reached its click limit.', responses=errors(404, 410))
def redirect_to_url(code: str, request: Request, db: Session = Depends(get_db)):
    url = db.query(URL).filter(URL.short_code == code).first()
    if not url or not url.is_active or url.admin_disabled:
        return _unavailable(request, 404, "short code not found", "Link not found",
                            "This short link doesn't exist or has been turned off.")

    now = utcnow()
    if url.expires_at is not None and url.expires_at <= now:
        return _unavailable(request, 410, "link expired", "Link expired", "This short link is no longer active.")

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
        return _unavailable(request, 410, "link expired", "Link expired", "This short link is no longer active.")

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
