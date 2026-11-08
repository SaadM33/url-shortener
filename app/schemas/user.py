from pydantic import BaseModel, EmailStr, Field

# bcrypt ignores everything after 72 bytes, so cap there
PasswordStr = Field(min_length=8, max_length=72)

class UserCreate(BaseModel):
	email: EmailStr
	password: str = PasswordStr
	username: str


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
