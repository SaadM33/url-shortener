import hashlib
import re
from urllib.parse import urlparse

from app.core.config import settings

_BOT = re.compile(r"bot|crawl|spider|slurp|curl|wget|python-requests|httpx|headless|preview", re.I)


def parse_user_agent(ua: str | None) -> tuple[str, str]:
    """Return (device, browser) using simple substring rules."""
    ua = ua or ""
    if _BOT.search(ua):
        device = "bot"
    elif re.search(r"iPad|Tablet", ua):
        device = "tablet"
    elif re.search(r"Mobile|Android|iPhone", ua):
        device = "mobile"
    else:
        device = "desktop"

    # order matters: Edge/Opera/Chrome all also say "Safari"
    if "Edg/" in ua:
        browser = "Edge"
    elif "OPR/" in ua:
        browser = "Opera"
    elif "Firefox/" in ua or "FxiOS" in ua:
        browser = "Firefox"
    elif "Chrome/" in ua or "CriOS" in ua:
        browser = "Chrome"
    elif "Safari/" in ua:
        browser = "Safari"
    else:
        browser = "Other"
    return device, browser


def referrer_host(referer: str | None) -> str | None:
    if not referer:
        return None
    try:
        return (urlparse(referer).hostname or None) and urlparse(referer).hostname[:255]
    except ValueError:
        return None


def visitor_hash(ip: str | None, ua: str | None) -> str:
    raw = f"{settings.JWT_KEY}|{ip or ''}|{ua or ''}"
    return hashlib.sha256(raw.encode()).hexdigest()
