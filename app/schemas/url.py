from datetime import datetime

from pydantic import AnyHttpUrl, BaseModel


class URLInput(BaseModel):
    url: AnyHttpUrl


class URLResponse(BaseModel):
    id: int
    long_url: str
    short_code: str
    visits: int
    created_at: datetime

    class Config:
        from_attributes = True
