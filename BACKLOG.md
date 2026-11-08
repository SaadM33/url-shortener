# Backlog (main branch, built by Claude)

Runs locally on WSL. Docker-compose for MySQL. `.env` stays as is. Frontend comes after the backend is done.
Tests: keep minimal, a few smoke tests only.

## Phase 1: Foundations
- [x] Pin dependencies (requirements.txt), fix README
- [x] Logout + token refresh (10)
- [x] Link ownership: require login to edit/delete, set `owner_id`
- [x] Remove public `/auth/users`
- [x] Atomic visit counter
- [x] Cookie settings moved to config

## Phase 2: Core links
- [ ] Custom aliases with reserved words (1)
- [ ] Link expiry by date or click count (2)
- [ ] Enable/disable a link (3)

## Phase 3: Auth
- [ ] Google OAuth, linked by email (11)
- [ ] Roles: user/admin + CLI to create first admin (19)

## Phase 4: Dashboard + Admin
- [ ] My links: pagination, search, filter, sort (15)
- [ ] Per-link analytics (16)
- [ ] User management (20)
- [ ] Link moderation (21)
- [ ] Site-wide stats (22)

## Phase 5: Platform
- [ ] Docker-compose for app + MySQL (28)
- [ ] Minimal smoke tests + CI (27)
- [ ] In-memory rate limiting on login and link creation (24)

## Phase 6: Next tier
- [ ] QR codes (7)
- [ ] Email verification + password reset, Mailpit locally (12)
- [ ] Profile management (13)
- [ ] API keys (14)
- [ ] Account overview (17)
- [ ] Background cleanup of expired links, async click recording (26)
- [ ] API docs polish, consistent errors (29)
- [ ] Logging + health check (30)

## Phase 7: Extras
- [ ] Password-protected links (4)
- [ ] Link metadata/tags (5)
- [ ] Bulk create (6)
- [ ] Guest links (9)
- [ ] CSV export (18)
- [ ] Audit log (23)

## Later (nice to have)
- [ ] Redis: rate limiting (24) and redirect caching (25)
- [ ] Country stats (needs MaxMind GeoLite2)

## Dropped
- URL safety checks (8)
