import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.routes import admin, urls, auth, google, password, profile
from app.core.config import settings
from app.api.docs import DESCRIPTION, TAGS
from app.services.cleanup import cleanup_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(cleanup_loop()) if settings.CLEANUP_ENABLED else None
    yield
    if task:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


app = FastAPI(
    title="URL Shortener",
    version="1.0.0",
    description=DESCRIPTION,
    openapi_tags=TAGS,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL.rstrip("/")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# short-lived session cookie used only to hold OAuth state during the Google redirect
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.JWT_KEY,
    max_age=600,
    same_site="lax",
    https_only=settings.COOKIE_SECURE,
)

app.include_router(auth.router)
app.include_router(google.router)
app.include_router(password.router)
app.include_router(profile.router)
app.include_router(admin.router)
app.include_router(urls.router)


@app.get("/", tags=["Meta"], summary="Service status")
def home():
    return {"message": "URL shorener is running 👍"}
