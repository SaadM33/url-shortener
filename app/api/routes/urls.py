import secrets
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.url import URL
from app.models.user import User
from app.schemas.url import URLInput, URLResponse, URLUpdate

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


@router.get("/urls", response_model=list[URLResponse])
def get_urls(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(URL).filter(URL.owner_id == current_user.id).all()


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
        url.is_active = data.is_active
    if "expires_at" in sent:
        url.expires_at = data.expires_at
    if "max_visits" in sent:
        url.max_visits = data.max_visits

    db.commit()
    db.refresh(url)
    return url


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
def redirect_to_url(code: str, db: Session = Depends(get_db)):
    url = db.query(URL).filter(URL.short_code == code).first()
    if not url or not url.is_active:
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
    db.commit()
    if updated == 0:
        raise HTTPException(status_code=410, detail="link expired")

    return RedirectResponse(url=url.long_url, status_code=302)
