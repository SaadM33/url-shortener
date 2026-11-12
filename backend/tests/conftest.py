import os

# Force a throwaway DB before the app imports its settings, so tests can never
# touch the dev database configured in .env.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_KEY"] = "test-key"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.ratelimit import ALL_LIMITERS
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import click, url, user  # noqa: F401  (register tables)


@pytest.fixture()
def session_factory():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override():
        db = factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    for limiter in ALL_LIMITERS:
        limiter.reset()
    yield factory
    app.dependency_overrides.clear()


@pytest.fixture()
def make_client(session_factory):
    """Returns a function that builds a fresh client (own cookies), optionally logged in."""

    def make(name: str | None = None) -> TestClient:
        client = TestClient(app)
        if name:
            creds = {"email": f"{name}@example.com", "password": "pw12345678"}
            client.post("/auth/register", json={**creds, "username": name})
            assert client.post("/auth/login", json=creds).status_code == 200
        return client

    return make
