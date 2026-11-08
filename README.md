# URL Shortener

A small FastAPI URL shortener with SQLAlchemy models and Alembic migrations.

## What this project does

- Exposes a FastAPI app in `app/main.py`
- Cookie-based JWT auth (register, login, logout, refresh)
- Per-user short links; only the owner can list, edit or delete them
- Custom aliases, link expiry (date and/or max clicks), and enable/disable per link; `expires_at` is stored and returned as UTC
- Stores data with SQLAlchemy models in `app/models/`
- Validates payloads with Pydantic in `app/schemas/`
- Tracks schema changes through Alembic in `alembic/`

## Requirements

- Python 3.10+
- `.env` needs `DATABASE_URL`, `JWT_KEY`; optional `TOKEN_EXPIRE_MINUTES`, `COOKIE_SECURE`, `COOKIE_SAMESITE`, `COOKIE_NAME`
- Docker (for the local MySQL dev container)
- MySQL or another supported SQLAlchemy database

Install the Python dependencies:

```bash
python3 -m pip install -r requirements.txt
```

## Environment setup

Create a `.env` file in the project root with a `DATABASE_URL` variable. Example:

```env
DATABASE_URL=mysql+pymysql://root:root@localhost:3307/url_shortener
```

If you are using the provided Docker setup, the container is created with:

```bash
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=url_shortener
```

## Local development workflow

### 1) Install dependencies

```bash
make install
# or run the pip command directly
```

### 2) Start the MySQL dev container

```bash
make mysql-dev
```

This starts a local MySQL container named `mysql-dev` on port `3307`.

### 3) Start the project

There are two common options:

```bash
make dev
```

This is the easiest daily command. It will:
- start the MySQL container if needed
- run `alembic upgrade head` if migration files exist
- start the FastAPI app with uvicorn

Or if you only want the app itself:

```bash
make run
```

## Docker

Runs the app and MySQL together (migrations are applied on start):

```bash
make docker-up
```

The app is on `http://localhost:8000` (change with `APP_PORT=8010 make docker-up`), MySQL on host port 3308.
Secrets still come from `.env`; `DATABASE_URL` is overridden to point at the container.

## Tests and rate limits

```bash
pip install -r requirements-dev.txt
make test
```

A few smoke tests run against in-memory SQLite and never touch your dev database. CI runs them on every push.

Rate limits are in-memory (per worker process, reset on restart): login 10/min and register 5/min per IP,
link creation 30/min per user, forgot-password 3/min per IP. Tune with `RATE_LOGIN_PER_MIN`, `RATE_REGISTER_PER_MIN`,
`RATE_CREATE_URL_PER_MIN`, or turn off with `RATE_LIMIT_ENABLED=false`.

## Password reset and email

`POST /auth/forgot-password` emails a reset link (`FRONTEND_URL/reset-password?token=...`, valid 30 minutes, single use);
`POST /auth/reset-password` sets the new password. Changing a password logs out all existing sessions.

Without `SMTP_HOST` in `.env`, emails are printed in the server log instead of sent. To test real delivery locally,
run [Mailpit](https://mailpit.axllent.org) and set `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_STARTTLS=false`.
Other settings: `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `RESET_TOKEN_EXPIRE_MINUTES`.

## Background cleanup

While the app runs, it deletes links whose `expires_at` passed more than 30 days ago (with their click history),
once at startup and then hourly. Links that only hit their click limit are kept. Tune with
`EXPIRED_LINK_RETENTION_DAYS`, `CLEANUP_INTERVAL_MINUTES`, or turn off with `CLEANUP_ENABLED=false`.
Run it by hand with `python -m app.cli purge-expired`. With several workers each one runs the job; that is harmless.

## Google sign-in (optional)

Create an OAuth client in Google Cloud Console (type: Web application) with the redirect URI
`http://localhost:8000/auth/google/callback`, then add to `.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Visit `/auth/google/login` to start. Until these are set the endpoints return 503.
An existing account with the same (Google-verified) email is linked automatically.

## Admins

Promote a registered user:

```bash
make create-admin EMAIL=you@example.com
```

## API overview

Interactive docs at `http://localhost:8000/docs`.

- `GET /urls?q=&status=&sort=&order=&limit=&offset=` — your links (paginated)
- `GET /urls/{code}/stats?days=30` — clicks per day, unique visitors, referrers, devices, browsers
- `PATCH /auth/me` (username), `POST /auth/change-password`, `DELETE /auth/me` (body `{"password": ...}`) — profile management
- `GET /auth/me/overview?days=30` — your link/click totals, clicks per day and top links
- `/admin/users`, `/admin/urls`, `/admin/stats` — admin only (user management, link moderation, site stats)

Clicks store the referrer hostname, device/browser and a salted hash of IP + user agent
(used only to count unique visitors). Raw IPs are not stored.

## Alembic commands

Create a new migration:

```bash
make revision
```

Apply pending migrations:

```bash
make upgrade
```

Rollback to a previous revision:

```bash
make downgrade
```

This will prompt for the target revision.

## Important notes

- Alembic migrations should be reviewed before commit.
- `alembic/env.py` must import your model modules so `Base.metadata` includes all tables.
- If an autogenerated revision is empty, it usually means:
  - you ran plain `alembic revision` instead of `--autogenerate`
  - the model import is missing
  - the DB is already in the expected state

## Useful Makefile commands

```bash
make help
make install
make dev
make run
make mysql-dev
make upgrade
make downgrade
make revision
```

## Project files

- `app/main.py` — FastAPI app setup
- `app/api/` — routes and dependencies
- `app/core/` — config and security helpers
- `app/db/` — engine, session, Base
- `app/models/` — ORM models
- `app/schemas/` — request/response validation
- `alembic/` — migration scripts
- `Makefile` — local developer shortcuts

## Quick start

```bash
make install
make dev
```

Then open the app at:

```text
http://localhost:8000
```
