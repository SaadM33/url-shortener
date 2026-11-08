from datetime import datetime, timezone

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator

ALIAS_PATTERN = r"^[A-Za-z0-9_-]{3,50}$"


def _to_naive_utc(value: datetime | None) -> datetime | None:
    """Store datetimes as naive UTC. Naive input is assumed to be UTC."""
    if value is None:
        return None
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


class URLInput(BaseModel):
    url: AnyHttpUrl
    alias: str | None = Field(default=None, pattern=ALIAS_PATTERN)
    expires_at: datetime | None = None
    max_visits: int | None = Field(default=None, gt=0)

    @field_validator("expires_at")
    @classmethod
    def _expiry_in_future(cls, v):
        v = _to_naive_utc(v)
        if v is not None and v <= datetime.now(timezone.utc).replace(tzinfo=None):
            raise ValueError("expires_at must be in the future")
        return v


class URLUpdate(BaseModel):
    """All fields optional. Send null for expires_at/max_visits to clear them."""

    url: AnyHttpUrl | None = None
    expires_at: datetime | None = None
    max_visits: int | None = Field(default=None, gt=0)
    is_active: bool | None = None

    @field_validator("expires_at")
    @classmethod
    def _norm_expiry(cls, v):
        return _to_naive_utc(v)


class URLResponse(BaseModel):
    id: int
    long_url: str
    short_code: str
    visits: int
    created_at: datetime
    is_active: bool
    admin_disabled: bool
    expires_at: datetime | None
    max_visits: int | None
    owner_id: int | None

    class Config:
        from_attributes = True


class URLPage(BaseModel):
    items: list[URLResponse]
    total: int
    limit: int
    offset: int


class CountItem(BaseModel):
    name: str
    count: int


class DayCount(BaseModel):
    date: str
    count: int


class URLStats(BaseModel):
    days: int
    total_clicks: int
    unique_visitors: int
    clicks_by_day: list[DayCount]
    top_referrers: list[CountItem]
    devices: list[CountItem]
    browsers: list[CountItem]
