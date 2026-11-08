import threading
import time
from collections import deque
from typing import Callable

from fastapi import HTTPException

from app.core.config import settings


class RateLimiter:
    """Sliding-window limiter kept in this process's memory.

    Limits are per worker process and reset on restart. Swap the storage for
    Redis later if you run several workers.
    """

    def __init__(self, limit: Callable[[], int], window_seconds: int = 60):
        self._limit = limit
        self._window = window_seconds
        self._hits: dict[str, deque] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] > self._window:
                hits.popleft()
            if len(hits) >= self._limit():
                retry_after = int(self._window - (now - hits[0])) + 1
                raise HTTPException(
                    status_code=429,
                    detail="too many requests, try again later",
                    headers={"Retry-After": str(retry_after)},
                )
            hits.append(now)
            if len(self._hits) > 10_000:  # keep memory bounded
                self._hits = {k: v for k, v in self._hits.items() if v and now - v[-1] <= self._window}

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


login_limiter = RateLimiter(lambda: settings.RATE_LOGIN_PER_MIN)
register_limiter = RateLimiter(lambda: settings.RATE_REGISTER_PER_MIN)
create_url_limiter = RateLimiter(lambda: settings.RATE_CREATE_URL_PER_MIN)

ALL_LIMITERS = [login_limiter, register_limiter, create_url_limiter]
