import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.url import URL
from app.models.user import User
from app.schemas.url import URLInput, URLResponse

router = APIRouter()


def generate_short_code(length: int = 6) -> str:
    pool = string.ascii_letters + string.digits
    return "".join(secrets.choice(pool) for _ in range(length))


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
    while True:
        code = generate_short_code()
        exists = db.query(URL).filter(URL.short_code == code).first()
        if not exists:
            break

    new_url = URL(long_url=str(data.url), short_code=code, owner_id=current_user.id)
    db.add(new_url)
    db.commit()
    db.refresh(new_url)
    return new_url


@router.put("/urls/{code}", response_model=URLResponse)
def update_url(
    code: str,
    data: URLInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = get_owned_url(code, db, current_user)

    url.long_url = str(data.url)
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
    if not url:
        raise HTTPException(status_code=404, detail="short code not found")

    # atomic increment in SQL so concurrent hits don't lose counts
    db.query(URL).filter(URL.id == url.id).update(
        {URL.visits: func.coalesce(URL.visits, 0) + 1}
    )
    db.commit()
    return RedirectResponse(url=url.long_url, status_code=302)
