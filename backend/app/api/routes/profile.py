from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes.auth import set_auth_cookie
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.click import Click
from app.models.url import URL
from app.models.user import User
from app.schemas.url import TopLink
from app.schemas.user import ChangePassword, DeleteAccount, Overview, ProfileUpdate, UserResponse
from app.services.cleanup import delete_urls
from app.services.stats import daily_counts, utcnow
from app.api.docs import errors

router = APIRouter()


@router.patch("/auth/me", response_model=UserResponse, tags=["Account"], summary='Change username', description='Only the fields you send are changed.', responses=errors(401, 403, 409, 422))
def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.username is not None and data.username != current_user.username:
        taken = db.query(User.id).filter(User.username == data.username, User.id != current_user.id).first()
        if taken:
            raise HTTPException(status_code=409, detail="username already taken")
        current_user.username = data.username
        db.commit()
        db.refresh(current_user)
    return current_user


@router.post("/auth/change-password", tags=["Account"], summary='Change password', description='Needs the current password (omit it only for Google-only accounts that have none). Other sessions are logged out; this one stays logged in.', responses=errors(400, 401, 403, 422))
def change_password(
    data: ChangePassword,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.password_hash:
        if not data.current_password or not verify_password(data.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="current password is incorrect")

    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    # the change invalidated every session, including this one, so issue a fresh cookie
    set_auth_cookie(response, current_user)
    return {"detail": "password updated"}


@router.delete("/auth/me", tags=["Account"], summary='Delete my account', description='Deletes the account and all its links and click history. Send `{"password": ...}` in the body. The last admin cannot delete themselves.', responses=errors(400, 401, 403))
def delete_account(
    response: Response,
    data: DeleteAccount | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.password_hash:
        if not data or not data.password or not verify_password(data.password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="password is required to delete the account")

    if current_user.role == "admin":
        other_admins = (
            db.query(func.count(User.id))
            .filter(User.role == "admin", User.is_active.is_(True), User.id != current_user.id)
            .scalar()
        )
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="you are the last admin; promote someone else first")

    delete_urls(db, URL.owner_id == current_user.id)
    db.delete(current_user)
    db.commit()
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
    )
    return {"detail": "account and links deleted"}


@router.get("/auth/me/overview", response_model=Overview, tags=["Account"], summary='Account overview', description='Your link and click totals, clicks per day for the last `days` days (1-365), and your top 5 links.', responses=errors(401, 403))
def account_overview(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    days = max(1, min(days, 365))
    mine = URL.owner_id == current_user.id
    now = utcnow()
    since = (now - timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)
    my_link_ids = db.query(URL.id).filter(mine)

    top = db.query(URL).filter(mine).order_by(func.coalesce(URL.visits, 0).desc()).limit(5).all()
    return {
        "total_links": db.query(func.count(URL.id)).filter(mine).scalar(),
        "active_links": db.query(func.count(URL.id))
        .filter(mine, URL.is_active.is_(True), URL.admin_disabled.is_(False))
        .scalar(),
        "total_clicks": db.query(func.coalesce(func.sum(URL.visits), 0)).filter(mine).scalar(),
        "clicks_last_7_days": db.query(func.count(Click.id))
        .filter(Click.url_id.in_(my_link_ids), Click.clicked_at >= now - timedelta(days=7))
        .scalar(),
        "clicks_by_day": [
            {"date": d["date"], "count": d["count"]}
            for d in daily_counts(db, Click.clicked_at, since, days, Click.url_id.in_(my_link_ids))
        ],
        "top_links": [TopLink(short_code=u.short_code, long_url=u.long_url, visits=u.visits or 0) for u in top],
    }
