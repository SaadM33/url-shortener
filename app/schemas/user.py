from pydantic import BaseModel, EmailStr, Field

from app.schemas.url import DayCount, TopLink

# bcrypt ignores everything after 72 bytes, so cap there
PasswordStr = Field(min_length=8, max_length=72)

class UserCreate(BaseModel):
	email: EmailStr
	password: str = PasswordStr
	username: str

	model_config = {
		"json_schema_extra": {"examples": [{"email": "you@example.com", "password": "a-long-password", "username": "you"}]}
	}


class UserResponse(BaseModel):
	id: int
	email: str
	username: str
	role: str

	class Config:
		from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str
    new_password: str = PasswordStr


class ProfileUpdate(BaseModel):
    username: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_.-]{3,50}$")


class ChangePassword(BaseModel):
    # omit current_password only if the account has no password yet (Google-only)
    current_password: str | None = None
    new_password: str = PasswordStr


class DeleteAccount(BaseModel):
    password: str | None = None


class Overview(BaseModel):
    total_links: int
    active_links: int
    total_clicks: int
    clicks_last_7_days: int
    clicks_by_day: list[DayCount]
    top_links: list[TopLink]
