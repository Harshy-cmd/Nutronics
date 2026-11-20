# Nutronics REST API (v1)

Base URL: `http://localhost:4000/api`. JSON requests use `Content-Type: application/json`; record uploads use `multipart/form-data`. Protected endpoints take `Authorization: Bearer <token>`. Errors use `{ "error": "message" }`.

### Proxy and Environment Configuration

- **Reverse Proxy & Trust Proxy**: The Express app enables `app.set('trust proxy', 1)` so that IP-based rate limiting (`express-rate-limit`) correctly identifies client IPs behind reverse proxies (Nginx, Caddy, Cloudflare, AWS ALB) via the standard `X-Forwarded-For` header.
- **Environment Variables**:
  - `JWT_SECRET`: Secret used to sign and verify JSON Web Tokens. In production (`NODE_ENV=production`), the server refuses to start if this is unset or left as the default placeholder.
  - `GOOGLE_CLIENT_ID`: OAuth 2.0 Client ID for Google Identity Services. Verified server-side with `google-auth-library`; must match the frontend's `VITE_GOOGLE_CLIENT_ID`.
  - `FIREBASE_PROJECT_ID`: Firebase project ID used to verify Firebase Auth ID tokens against Google's published signing keys. No Firebase Admin private key is required.
  - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_GOOGLE_CLIENT_ID`: Firebase web configuration. These identify the Firebase project and are public client values, not server secrets.
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: Legacy SMTP configuration for password-reset and six-digit staff code flows. Render Free blocks SMTP ports; use Firebase email-link sign-in for staff instead.
  - `CLIENT_ORIGIN`: Exact frontend origin (default `http://localhost:5173`) used by CORS with `credentials: true`.
  - `SUPABASE_DATABASE_URL`: Server-only Postgres connection string. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are used for private record storage; never expose the service key in a `VITE_` variable.

## Authentication

All auth tokens have a 15-minute access lifetime and carry version claim `v: 2` (legacy 7-day tokens without this claim are automatically rejected with 401). Refresh tokens are stored hashed (SHA-256) server-side and issued as `httpOnly`, `SameSite=Lax`, `Path=/api/auth`, `Secure` (in production) cookies with automatic rotation and token reuse detection.

| Method | Endpoint | Access | Rate Limit | Purpose |
|---|---|---|---|---|
| POST | `/auth/login` | Public | 15 / 15m | Email/password login; returns 15m access token and sets refresh cookie |
| POST | `/auth/otp/request` | Public | 5 / 15m | Legacy SMTP code request for an existing Doctor or Admin account; Firebase-enabled clients use Firebase email links instead |
| POST | `/auth/otp/verify` | Public | 10 / 15m | Legacy one-time Doctor/Admin code verification |
| POST | `/auth/register` | Public | 10 / hr | Register new PATIENT account; returns access token and sets refresh cookie |
| POST | `/auth/google` | Public | Default | Verify Google or Firebase ID token; create PATIENT accounts or authenticate a pre-provisioned, active Doctor/Admin account through its matching portal |
| POST | `/auth/refresh` | Public (cookie) | Default | Rotate refresh token cookie and receive fresh 15m access token |
| POST | `/auth/logout` | Public (cookie) | Default | Revoke refresh token in database and clear refresh cookie |
| POST | `/auth/forgot-password` | Public | 5 / 15m | Request password reset email (30m token); generic response prevents enumeration |
| POST | `/auth/reset-password` | Public | 10 / 15m | Reset password with single-use token; revokes all active refresh tokens |
| GET | `/auth/me` | Signed in | Default | Retrieve current authenticated user profile (`safeUser`) |

## Patient endpoints

All `/patient/*` routes require a patient token. Patient-specific data is scoped to the signed-in account.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/patient/dashboard` | Dashboard, reminders, today's meal guidance |
| GET | `/patient/export` | Download profile, logs, schedules, chat, contacts, SOS, notifications, and record metadata as JSON |
| GET | `/patient/export.csv` | Download the same data as sectioned CSV (`section,record_json`); uploaded file contents are separate |
| GET | `/patient/activity` | Read recent account activity events |
| POST | `/patient/deletion-request` | Record an account deletion request for administrator follow-up; does not immediately erase data |
| GET | `/patient/diet` | Weekly meals and local food options |
| POST | `/patient/diet/swap` | `{mealId, foodId}`; marks new recommendation pending review |
| GET/POST | `/patient/reminders` | List or create reminder `{label, kind, time}` |
| PATCH/DELETE | `/patient/reminders/:id` | Mark done/snooze or delete |
| GET/POST | `/patient/progress` | Read history or save today's vitals and notes |
| GET | `/patient/assistant/history` | Saved assistant conversation |
| POST | `/patient/assistant/ask` | `{question}`; returns structured guidance and review state |
| GET/POST | `/patient/records` | List or upload a record (`file`, optional `name`, `category`, max 5 MB) |
| GET/DELETE | `/patient/records/:id/download`, `/patient/records/:id` | Download or remove an owned record |
| GET/PATCH | `/patient/profile` | Read or update profile/settings |
| GET/POST/DELETE | `/patient/contacts` | List (from profile), add or remove emergency contacts |
| GET/PATCH/POST | `/patient/devices` | List, pair/unpair, or sync simulated device readings |
| GET/PATCH | `/patient/notifications` | List or mark notifications read |
| POST | `/patient/sos` | Record an SOS event; creates in-app notices for assigned doctors. `dispatched` is always false because no SMS/call/emergency service is contacted. |

## Doctor endpoints

All `/doctor/*` routes require a doctor token and an explicit active doctor–patient assignment. Patient dossiers, dashboard summaries, pending review items, and review actions are limited to assigned patients; an unassigned dossier returns 404.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/doctor/dashboard` | Assigned patient summaries and review count |
| GET | `/doctor/patients/:id` | Patient dossier, trends, records, and SOS history |
| GET | `/doctor/verification-queue` | Pending assistant recommendations |
| PATCH | `/doctor/verification-queue/:id` | `{status: "VERIFIED"|"REJECTED", answer?, doctorNote?}` |
| GET | `/doctor/guidelines` | Editable condition guidance |
| PUT | `/doctor/guidelines/:condition` | Save numeric limits and condition rules |

## Admin and shared endpoints

All `/admin/*` routes require an admin token.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/stats` | Account, SOS, verification, and activity metrics |
| GET | `/admin/users?role=ALL&search=` | Search and filter users |
| PATCH | `/admin/users/:id` | `{active: boolean}` |
| GET | `/admin/assignments` | List active patients, doctors, and assignments |
| PUT | `/admin/assignments/:patientId` | Replace assignments with `{doctorIds: string[]}` |
| GET/PUT | `/admin/config` | Read or update feature settings |
| POST | `/admin/lookup` | Live-data lookup with local fallback |
| GET | `/shared/foods?q=` | Curated foods |
| GET | `/shared/medicines` | Curated medicines |
| GET | `/shared/guidelines` | Current saved guidelines |
| GET | `/health` | Service health check |

Assistant `RULE_MATCHED` means a deterministic local rule matched; it is not a clinician review. Only a doctor queue action sets `VERIFIED`. Every clinical and nutrition response includes the disclaimer: “General guidance, not a substitute for professional medical advice.” SOS and device integrations are simulations in this build.
