from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    DATABASE_URL: str

    JWT_KEY: str

    TOKEN_EXPIRE_MINUTES: int = 30

    COOKIE_NAME: str = "jwt_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # in-memory rate limits (requests per minute); see app/core/ratelimit.py
    RATE_LIMIT_ENABLED: bool = True
    RATE_LOGIN_PER_MIN: int = 10  # per client IP
    RATE_REGISTER_PER_MIN: int = 5  # per client IP
    RATE_CREATE_URL_PER_MIN: int = 30  # per user

    # Google OAuth is optional; endpoints return 503 until these are set
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
