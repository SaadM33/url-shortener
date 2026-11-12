"""Shared bits for the OpenAPI docs served at /docs and /redoc."""

ERROR_TEXT = {
    400: "Invalid request (see `detail`)",
    401: "Not logged in, or the session expired",
    403: "Not allowed",
    404: "Not found",
    409: "Conflict: already exists",
    410: "Gone: the link expired",
    429: "Too many requests; wait for `Retry-After` seconds",
    503: "Feature not configured on this server",
}


def errors(*codes: int) -> dict:
    """`responses=` entries for the error codes an endpoint can return.

    422 is left out on purpose: FastAPI documents validation errors itself.
    """
    return {code: {"description": ERROR_TEXT[code]} for code in codes if code != 422}


TAGS = [
    {"name": "Auth", "description": "Register, log in and out, password reset, Google sign-in."},
    {"name": "Account", "description": "Your profile, password and account overview."},
    {"name": "Links", "description": "Create and manage your short links and see their stats."},
    {"name": "Redirect", "description": "The public short link itself."},
    {"name": "Admin", "description": "Admin only: users, link moderation and site-wide stats."},
    {"name": "Meta", "description": "Service status."},
]

DESCRIPTION = """
A URL shortener with accounts, link expiry, analytics and an admin area.

**Logging in.** `POST /auth/login` (or Google sign-in) sets an HTTP-only cookie.
Browsers send it automatically; for scripts, keep the cookie (`curl -c/-b`, `requests.Session`).
Endpoints marked with a lock need it. Changing your password logs out older sessions.

**Errors** look like `{"detail": "message"}`. Validation errors (422) list each bad field.

**Rate limits** (per minute): login 10 and register 5 per IP, forgot-password 3 per IP,
link creation 30 per user. Over the limit you get 429 with a `Retry-After` header.

**Times** are UTC. Send `expires_at` as ISO 8601; offsets are converted, no offset means UTC.
"""
