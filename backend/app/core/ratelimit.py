import threading
import time
from collections import deque
from typing import Callable

import redis
from fastapi import HTTPException

from app.core.config import settings


_redis: redis.Redis | None = None


def _redis_client() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.Redis.from_url(settings.REDIS_URL)
    return _redis


def _too_many(retry_after: int) -> HTTPException:
    return HTTPException(
        status_code=429,
        detail="too many requests, try again later",
        headers={"Retry-After": str(retry_after)},
    )


class RateLimiter:
    """Counts requests per key per minute.

    With REDIS_URL set the counts live in Redis, shared by every worker and kept
    across restarts. Without it they live in this process's memory (tests, quick runs).
    """

    def __init__(self, name: str, limit: Callable[[], int], window_seconds: int = 60):
        self._name = name
        self._limit = limit
        self._window = window_seconds
        self._hits: dict[str, deque] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        if settings.REDIS_URL:
            self._check_redis(key)
        else:
            self._check_memory(key)

    def _check_redis(self, key: str) -> None:
        # fixed window: one counter per key per minute, which Redis deletes when the minute is over
        now = time.time()
        counter = f"ratelimit:{self._name}:{key}:{int(now // self._window)}"
        pipe = _redis_client().pipeline()
        pipe.incr(counter)
        pipe.expire(counter, self._window)
        count, _ = pipe.execute()
        if count > self._limit():
            raise _too_many(int(self._window - now % self._window) + 1)

    def _check_memory(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] > self._window:
                hits.popleft()
            if len(hits) >= self._limit():
                raise _too_many(int(self._window - (now - hits[0])) + 1)
            hits.append(now)
            if len(self._hits) > 10_000:  # keep memory bounded
                self._hits = {k: v for k, v in self._hits.items() if v and now - v[-1] <= self._window}

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


login_limiter = RateLimiter("login", lambda: settings.RATE_LOGIN_PER_MIN)
register_limiter = RateLimiter("register", lambda: settings.RATE_REGISTER_PER_MIN)
create_url_limiter = RateLimiter("create_url", lambda: settings.RATE_CREATE_URL_PER_MIN)
forgot_limiter = RateLimiter("forgot", lambda: settings.RATE_FORGOT_PER_MIN)

ALL_LIMITERS = [login_limiter, register_limiter, create_url_limiter, forgot_limiter]
