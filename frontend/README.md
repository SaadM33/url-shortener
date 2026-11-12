# Shortly frontend

React + TypeScript single-page app for the URL shortener API.

## Run it

From the repo root: `make api` in one terminal, `make web` in another (http://localhost:3000).
Or run everything in Docker with `make up`; this folder's `Dockerfile` builds the app and serves it with nginx.

Port 3000 taken? `PORT=3010 make web`, and set `FRONTEND_URL=http://localhost:3010` in `backend/.env`
(CORS, Google sign-in and password-reset links all point there). API on another address? Copy `.env.example`
to `.env.local` and set `VITE_API_URL`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | ESLint |
| `npm run gen:api` | Regenerate `src/api/schema.d.ts` from `../docs/openapi.json` (run `make docs` in the root to refresh both) |

## Features

- Log in, register, forgot/reset password, Google sign-in (button appears only when the API has it configured)
- Dashboard: totals, clicks chart, top links
- Links: search, status filter, sorting and pagination kept in the URL; create with custom alias, expiry date and click limit
- Link page: analytics (clicks per day, unique visitors, referrers, devices, browsers), QR code download, edit, enable/disable, delete
- Settings: username, change or set password, theme, delete account
- Admin (admins only): site stats, user management (roles, bans, delete), link moderation
- Light, dark and system themes; responsive down to phone width

## How it's built

| Concern | Choice |
|---|---|
| Build | Vite, TypeScript (strict) |
| Routing | React Router, every page lazy-loaded |
| Server state | TanStack Query: caching, background refresh, invalidation after changes |
| Forms | react-hook-form + zod; API validation errors land on the matching field |
| Styling | Tailwind CSS v4, small hand-written components in `src/components/ui` |
| Charts / QR | Recharts / qrcode.react |
| API types | Generated from the backend's OpenAPI schema (`src/api/schema.d.ts`) |

Layout:

```
src/
  api/         fetch client, generated types, query/mutation hooks
  auth/        route guards (logged in, admin, guests only)
  components/  ui/ primitives, charts/, links/
  hooks/       theme, debounce, page title, session keep-alive
  layouts/     app shell (sidebar) and auth pages
  lib/         formatting, form helpers, link helpers
  pages/       one file per route, admin/ for the admin area
```

Auth uses the API's HTTP-only cookie (`credentials: 'include'`), so no token is ever readable from JavaScript.
Any 401 clears the cached user and the guards send you to `/login?next=...`. While you're active, the session is
refreshed every 10 minutes.
