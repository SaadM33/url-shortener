# URL Shortener API

A URL shortener with accounts, link expiry, analytics and an admin area.

**Logging in.** `POST /auth/login` (or Google sign-in) sets an HTTP-only cookie.
Browsers send it automatically; for scripts, keep the cookie (`curl -c/-b`, `requests.Session`).
Endpoints marked with a lock need it. Changing your password logs out older sessions.

**Errors** look like `{"detail": "message"}`. Validation errors (422) list each bad field.

**Rate limits** (per minute): login 10 and register 5 per IP, forgot-password 3 per IP,
link creation 30 per user. Over the limit you get 429 with a `Retry-After` header.

**Times** are UTC. Send `expires_at` as ISO 8601; offsets are converted, no offset means UTC.

Interactive version: `/docs` (Swagger UI) or `/redoc`. Raw schema: `/openapi.json`.
_This file is generated: run `make docs` after changing the API._

## Auth

Register, log in and out, password reset, Google sign-in.

### `GET /auth/me` 🔒

**Who am I**

Returns the logged-in user.

Responses: `200` [UserResponse](#userresponse) · `401` Not logged in, or the session expired · `403` Not allowed

### `POST /auth/register`

**Create an account**

Registers with email, username and a password of 8 to 72 characters, and emails a link to confirm the address. Does not log you in.

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|
| `email` | string (email) | yes |  |
| `password` | string | yes | min length 8; max length 72 |
| `username` | string | yes |  |

Responses: `200` [UserResponse](#userresponse) · `400` Invalid request (see `detail`) · `429` Too many requests; wait for `Retry-After` seconds · `422` validation error

### `POST /auth/verify-email`

**Confirm an email address**

Uses the token from the verification email. Works without being logged in. Using it twice is harmless.

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|
| `token` | string | yes |  |

Responses: `200` [UserResponse](#userresponse) · `400` Invalid request (see `detail`) · `422` validation error

### `POST /auth/resend-verification` 🔒

**Send the verification email again**

For the logged-in user. Does nothing if the address is already verified.

Responses: `200` Successful Response · `401` Not logged in, or the session expired · `403` Not allowed · `429` Too many requests; wait for `Retry-After` seconds

### `POST /auth/login`

**Log in**

Checks email and password and sets the session cookie. Banned accounts get 403.

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|
| `email` | string (email) | yes |  |
| `password` | string | yes |  |

Responses: `200` Successful Response · `401` Not logged in, or the session expired · `403` Not allowed · `429` Too many requests; wait for `Retry-After` seconds · `422` validation error

### `POST /auth/refresh` 🔒

**Extend the session**

Issues a fresh cookie with a new expiry for a still-valid session.

Responses: `200` Successful Response · `401` Not logged in, or the session expired · `403` Not allowed

### `POST /auth/logout`

**Log out**

Clears the session cookie. Safe to call when not logged in.

Responses: `200` Successful Response

### `GET /auth/providers`

**Available sign-in methods**

Lets the frontend show the Google button only when Google sign-in is configured.

Responses: `200` Successful Response

### `GET /auth/google/login`

**Start Google sign-in**

Redirects the browser to Google. Open it as a page, not via fetch.

Responses: `200` Successful Response · `503` Feature not configured on this server

### `GET /auth/google/callback`

**Finish Google sign-in**

Google redirects here. Links to an existing account when the email matches and Google verified it, otherwise creates one, sets the cookie and redirects to the frontend. On failure it redirects to `FRONTEND_URL/login?error=...`.

Responses: `200` Successful Response

### `POST /auth/forgot-password`

**Request a password reset email**

Always answers the same way, whether or not the email is registered. The emailed link is valid for 30 minutes and works once.

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|
| `email` | string (email) | yes |  |

Responses: `200` Successful Response · `429` Too many requests; wait for `Retry-After` seconds · `422` validation error

### `POST /auth/reset-password`

**Set a new password from a reset token**

Uses the token from the reset email. Afterwards every existing session is logged out.

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|
| `token` | string | yes |  |
| `new_password` | string | yes | min length 8; max length 72 |

Responses: `200` Successful Response · `400` Invalid request (see `detail`) · `429` Too many requests; wait for `Retry-After` seconds · `422` validation error

## Account

Your profile, password and account overview.

### `PATCH /auth/me` 🔒

**Change username**

Only the fields you send are changed.

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|
| `username` | string or null | no |  |

Responses: `200` [UserResponse](#userresponse) · `401` Not logged in, or the session expired · `403` Not allowed · `409` Conflict: already exists · `422` validation error

### `DELETE /auth/me` 🔒

**Delete my account**

Deletes the account and all its links and click history. Send `{"password": ...}` in the body. The last admin cannot delete themselves.

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|

Responses: `200` Successful Response · `400` Invalid request (see `detail`) · `401` Not logged in, or the session expired · `403` Not allowed · `422` validation error

### `POST /auth/change-password` 🔒

**Change password**

Needs the current password (omit it only for Google-only accounts that have none). Other sessions are logged out; this one stays logged in.

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|
| `current_password` | string or null | no |  |
| `new_password` | string | yes | min length 8; max length 72 |

Responses: `200` Successful Response · `400` Invalid request (see `detail`) · `401` Not logged in, or the session expired · `403` Not allowed · `422` validation error

### `GET /auth/me/overview` 🔒

**Account overview**

Your link and click totals, clicks per day for the last `days` days (1-365), and your top 5 links.

Query parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `days` | integer | no | default `30` |

Responses: `200` [Overview](#overview) · `401` Not logged in, or the session expired · `403` Not allowed · `422` validation error

## Links

Create and manage your short links and see their stats.

### `GET /urls` 🔒

**List my links**

Paginated, newest first by default. Filter with `status`, search the short code and target with `q`.

Query parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `q` | string or null | no | search in short code and target URL |
| `status` | `active` / `expired` / `disabled` or null | no |  |
| `sort` | `created_at` / `visits` / `expires_at` | no | default `created_at` |
| `order` | `asc` / `desc` | no | default `desc` |
| `limit` | integer | no | min 1; max 100; default `20` |
| `offset` | integer | no | min 0; default `0` |

Responses: `200` [URLPage](#urlpage) · `401` Not logged in, or the session expired · `403` Not allowed · `422` validation error

### `POST /urls` 🔒

**Create a short link**

Random 6-character code, or pick your own with `alias` (3-50 letters, digits, `-`, `_`; reserved words not allowed). Optionally expire it by date and/or number of clicks. Needs a verified email address.

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|
| `url` | string (uri) | yes | The page to redirect to (http or https) |
| `alias` | string or null | no | Custom short code. Leave out for a random 6-character one |
| `expires_at` | string (date-time) or null | no | Stop redirecting after this time (UTC, must be in the future) |
| `max_visits` | integer or null | no | Stop redirecting after this many clicks |

Responses: `200` [URLResponse](#urlresponse) · `400` Invalid request (see `detail`) · `401` Not logged in, or the session expired · `403` Not allowed · `409` Conflict: already exists · `429` Too many requests; wait for `Retry-After` seconds · `422` validation error

### `GET /urls/{code}` 🔒

**Get one link**

Owner or admin.

Path parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes |  |

Responses: `200` [URLResponse](#urlresponse) · `401` Not logged in, or the session expired · `403` Not allowed · `404` Not found · `422` validation error

### `PUT /urls/{code}` 🔒

**Update a link**

Send only what you want to change. Send `null` for `expires_at` or `max_visits` to remove the limit. Links disabled by an admin cannot be re-enabled.

Path parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes |  |

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|
| `url` | string (uri) or null | no | New target URL |
| `expires_at` | string (date-time) or null | no | New expiry (UTC), or null to remove it |
| `max_visits` | integer or null | no | New click limit, or null to remove it |
| `is_active` | boolean or null | no | false disables the link (404), true re-enables it |

Responses: `200` [URLResponse](#urlresponse) · `401` Not logged in, or the session expired · `403` Not allowed · `404` Not found · `422` validation error

### `DELETE /urls/{code}` 🔒

**Delete a link**

Deletes the link and its click history.

Path parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes |  |

Responses: `200` Successful Response · `401` Not logged in, or the session expired · `403` Not allowed · `404` Not found · `422` validation error

### `GET /urls/{code}/stats` 🔒

**Link analytics**

Clicks per day, unique visitors, top referrers, devices and browsers over the last `days` days (1-365). Owner or admin.

Path parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes |  |

Query parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `days` | integer | no | min 1; max 365; default `30` |

Responses: `200` [URLStats](#urlstats) · `401` Not logged in, or the session expired · `403` Not allowed · `404` Not found · `422` validation error

## Redirect

The public short link itself.

### `GET /{code}`

**Follow a short link**

302 redirect to the target and counts the visit. 404 if the code does not exist or the link is disabled; 410 if it expired or reached its click limit.

Path parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes |  |

Responses: `200` Successful Response · `404` Not found · `410` Gone: the link expired · `422` validation error

## Admin

Admin only: users, link moderation and site-wide stats.

### `GET /admin/users` 🔒

**List users**

Search by email or username; filter by role and active state.

Query parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `q` | string or null | no | search email or username |
| `role` | `user` / `admin` or null | no |  |
| `is_active` | boolean or null | no |  |
| `limit` | integer | no | min 1; max 100; default `20` |
| `offset` | integer | no | min 0; default `0` |

Responses: `200` [AdminUserPage](#adminuserpage) · `401` Not logged in, or the session expired · `403` Not allowed · `422` validation error

### `PATCH /admin/users/{user_id}` 🔒

**Change a user's role or ban state**

`is_active: false` bans (they are blocked immediately). You cannot demote or ban yourself.

Path parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `user_id` | integer | yes |  |

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|
| `role` | `user` / `admin` or null | no |  |
| `is_active` | boolean or null | no |  |

Responses: `200` [AdminUserResponse](#adminuserresponse) · `400` Invalid request (see `detail`) · `401` Not logged in, or the session expired · `403` Not allowed · `404` Not found · `422` validation error

### `DELETE /admin/users/{user_id}` 🔒

**Delete a user**

Deletes the user, their links and click history. You cannot delete yourself.

Path parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `user_id` | integer | yes |  |

Responses: `200` Successful Response · `400` Invalid request (see `detail`) · `401` Not logged in, or the session expired · `403` Not allowed · `404` Not found · `422` validation error

### `GET /admin/urls` 🔒

**List all links**

Same filters as the user list, plus `owner_id`.

Query parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `q` | string or null | no |  |
| `status` | `active` / `expired` / `disabled` or null | no |  |
| `owner_id` | integer or null | no |  |
| `sort` | `created_at` / `visits` / `expires_at` | no | default `created_at` |
| `order` | `asc` / `desc` | no | default `desc` |
| `limit` | integer | no | min 1; max 100; default `20` |
| `offset` | integer | no | min 0; default `0` |

Responses: `200` [URLPage](#urlpage) · `401` Not logged in, or the session expired · `403` Not allowed · `422` validation error

### `PATCH /admin/urls/{code}` 🔒

**Disable or re-enable a link**

`is_active: false` disables it and locks it so the owner cannot turn it back on.

Path parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes |  |

JSON body:

| Name | Type | Required | Notes |
|---|---|---|---|
| `is_active` | boolean | yes |  |

Responses: `200` [URLResponse](#urlresponse) · `401` Not logged in, or the session expired · `403` Not allowed · `404` Not found · `422` validation error

### `DELETE /admin/urls/{code}` 🔒

**Delete any link**

Deletes the link and its click history.

Path parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes |  |

Responses: `200` Successful Response · `401` Not logged in, or the session expired · `403` Not allowed · `404` Not found · `422` validation error

### `GET /admin/stats` 🔒

**Site-wide stats**

Totals, new users, new links and clicks per day for the last `days` days, and the top 5 links.

Query parameters:

| Name | Type | Required | Notes |
|---|---|---|---|
| `days` | integer | no | min 1; max 365; default `30` |

Responses: `200` [SiteStats](#sitestats) · `401` Not logged in, or the session expired · `403` Not allowed · `422` validation error

## Meta

Service status.

### `GET /health`

**Health check**

200 when the API can reach its database.

Responses: `200` Successful Response

### `GET /`

**Service status**

Responses: `200` Successful Response

## Schemas

<a id="adminurlupdate"></a>
### AdminURLUpdate

| Name | Type | Required | Notes |
|---|---|---|---|
| `is_active` | boolean | yes |  |

<a id="adminuserpage"></a>
### AdminUserPage

| Name | Type | Required | Notes |
|---|---|---|---|
| `items` | [AdminUserResponse](#adminuserresponse)[] | yes |  |
| `total` | integer | yes |  |
| `limit` | integer | yes |  |
| `offset` | integer | yes |  |

<a id="adminuserresponse"></a>
### AdminUserResponse

| Name | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | yes |  |
| `email` | string | yes |  |
| `username` | string or null | yes |  |
| `role` | string | yes |  |
| `is_active` | boolean | yes |  |
| `email_verified` | boolean | yes |  |
| `created_at` | string (date-time) or null | yes |  |

<a id="adminuserupdate"></a>
### AdminUserUpdate

| Name | Type | Required | Notes |
|---|---|---|---|
| `role` | `user` / `admin` or null | no |  |
| `is_active` | boolean or null | no |  |

<a id="changepassword"></a>
### ChangePassword

| Name | Type | Required | Notes |
|---|---|---|---|
| `current_password` | string or null | no |  |
| `new_password` | string | yes | min length 8; max length 72 |

<a id="countitem"></a>
### CountItem

| Name | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes |  |
| `count` | integer | yes |  |

<a id="daycount"></a>
### DayCount

| Name | Type | Required | Notes |
|---|---|---|---|
| `date` | string | yes |  |
| `count` | integer | yes |  |

<a id="deleteaccount"></a>
### DeleteAccount

| Name | Type | Required | Notes |
|---|---|---|---|
| `password` | string or null | no |  |

<a id="forgotpassword"></a>
### ForgotPassword

| Name | Type | Required | Notes |
|---|---|---|---|
| `email` | string (email) | yes |  |

<a id="overview"></a>
### Overview

| Name | Type | Required | Notes |
|---|---|---|---|
| `total_links` | integer | yes |  |
| `active_links` | integer | yes |  |
| `total_clicks` | integer | yes |  |
| `clicks_last_7_days` | integer | yes |  |
| `clicks_by_day` | [DayCount](#daycount)[] | yes |  |
| `top_links` | [TopLink](#toplink)[] | yes |  |

<a id="profileupdate"></a>
### ProfileUpdate

| Name | Type | Required | Notes |
|---|---|---|---|
| `username` | string or null | no |  |

<a id="resetpassword"></a>
### ResetPassword

| Name | Type | Required | Notes |
|---|---|---|---|
| `token` | string | yes |  |
| `new_password` | string | yes | min length 8; max length 72 |

<a id="sitestats"></a>
### SiteStats

| Name | Type | Required | Notes |
|---|---|---|---|
| `days` | integer | yes |  |
| `total_users` | integer | yes |  |
| `total_links` | integer | yes |  |
| `total_clicks` | integer | yes |  |
| `new_users_by_day` | [DayCount](#daycount)[] | yes |  |
| `new_links_by_day` | [DayCount](#daycount)[] | yes |  |
| `clicks_by_day` | [DayCount](#daycount)[] | yes |  |
| `top_links` | [TopLink](#toplink)[] | yes |  |

<a id="toplink"></a>
### TopLink

| Name | Type | Required | Notes |
|---|---|---|---|
| `short_code` | string | yes |  |
| `long_url` | string | yes |  |
| `visits` | integer | yes |  |

<a id="urlinput"></a>
### URLInput

| Name | Type | Required | Notes |
|---|---|---|---|
| `url` | string (uri) | yes | The page to redirect to (http or https) |
| `alias` | string or null | no | Custom short code. Leave out for a random 6-character one |
| `expires_at` | string (date-time) or null | no | Stop redirecting after this time (UTC, must be in the future) |
| `max_visits` | integer or null | no | Stop redirecting after this many clicks |

<a id="urlpage"></a>
### URLPage

| Name | Type | Required | Notes |
|---|---|---|---|
| `items` | [URLResponse](#urlresponse)[] | yes |  |
| `total` | integer | yes |  |
| `limit` | integer | yes |  |
| `offset` | integer | yes |  |

<a id="urlresponse"></a>
### URLResponse

| Name | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | yes |  |
| `long_url` | string | yes |  |
| `short_code` | string | yes |  |
| `visits` | integer | yes |  |
| `created_at` | string (date-time) | yes |  |
| `is_active` | boolean | yes |  |
| `admin_disabled` | boolean | yes |  |
| `expires_at` | string (date-time) or null | yes |  |
| `max_visits` | integer or null | yes |  |
| `owner_id` | integer or null | yes |  |

<a id="urlstats"></a>
### URLStats

| Name | Type | Required | Notes |
|---|---|---|---|
| `days` | integer | yes |  |
| `total_clicks` | integer | yes |  |
| `unique_visitors` | integer | yes |  |
| `clicks_by_day` | [DayCount](#daycount)[] | yes |  |
| `top_referrers` | [CountItem](#countitem)[] | yes |  |
| `devices` | [CountItem](#countitem)[] | yes |  |
| `browsers` | [CountItem](#countitem)[] | yes |  |

<a id="urlupdate"></a>
### URLUpdate

| Name | Type | Required | Notes |
|---|---|---|---|
| `url` | string (uri) or null | no | New target URL |
| `expires_at` | string (date-time) or null | no | New expiry (UTC), or null to remove it |
| `max_visits` | integer or null | no | New click limit, or null to remove it |
| `is_active` | boolean or null | no | false disables the link (404), true re-enables it |

<a id="usercreate"></a>
### UserCreate

| Name | Type | Required | Notes |
|---|---|---|---|
| `email` | string (email) | yes |  |
| `password` | string | yes | min length 8; max length 72 |
| `username` | string | yes |  |

<a id="userlogin"></a>
### UserLogin

| Name | Type | Required | Notes |
|---|---|---|---|
| `email` | string (email) | yes |  |
| `password` | string | yes |  |

<a id="userresponse"></a>
### UserResponse

| Name | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | yes |  |
| `email` | string | yes |  |
| `username` | string | yes |  |
| `role` | string | yes |  |
| `has_password` | boolean | yes |  |
| `email_verified` | boolean | yes |  |

<a id="verifyemail"></a>
### VerifyEmail

| Name | Type | Required | Notes |
|---|---|---|---|
| `token` | string | yes |  |
