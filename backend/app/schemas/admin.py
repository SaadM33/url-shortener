from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.url import DayCount, TopLink


class AdminUserResponse(BaseModel):
    id: int
    email: str
    username: str | None
    role: str
    is_active: bool
    email_verified: bool
    created_at: datetime | None

    class Config:
        from_attributes = True


class AdminUserPage(BaseModel):
    items: list[AdminUserResponse]
    total: int
    limit: int
    offset: int


class AdminUserUpdate(BaseModel):
    role: Literal["user", "admin"] | None = None
    is_active: bool | None = None


class AdminURLUpdate(BaseModel):
    """is_active=False disables the link and locks it against the owner."""

    is_active: bool


class SiteStats(BaseModel):
    days: int
    total_users: int
    total_links: int
    total_clicks: int
    new_users_by_day: list[DayCount]
    new_links_by_day: list[DayCount]
    clicks_by_day: list[DayCount]
    top_links: list[TopLink]
