from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    DATABASE_URL: str

    JWT_KEY: str

    TOKEN_EXPIRE_MINUTES: int = 30

    COOKIE_NAME: str = "jwt_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    class Config:
        env_file = ".env"


settings = Settings()
