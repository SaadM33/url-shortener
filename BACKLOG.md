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
- [x] Custom aliases with reserved words (1)
- [x] Link expiry by date or click count (2)
- [x] Enable/disable a link (3)

## Phase 3: Auth
- [x] Google OAuth, linked by email (11)
- [x] Roles: user/admin + CLI to create first admin (19)

## Phase 4: Dashboard + Admin
- [x] My links: pagination, search, filter, sort (15)
- [x] Per-link analytics (16)
- [x] User management (20)
- [x] Link moderation (21)
- [x] Site-wide stats (22)

## Phase 5: Platform
- [x] Docker-compose for app + MySQL (28)
- [x] Minimal smoke tests + CI (27)
- [x] In-memory rate limiting on login and link creation (24)

## Phase 6: Next tier
- [ ] QR codes (7)
- [x] Password reset by email (12)
- [ ] Email verification (12)
- [x] Profile management (13)
- [ ] API keys (14)
- [x] Account overview (17)
- [x] Background cleanup of expired links (26)
- [ ] Async click recording (26)
- [x] API docs (29)
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
