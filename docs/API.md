# Nutronics REST API (v1)

Base URL: `http://localhost:4000/api`. JSON requests use `Content-Type: application/json`; record uploads use `multipart/form-data`. Protected endpoints take `Authorization: Bearer <token>`. Errors use `{ "error": "message", "details": [] }`.

## Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/login` | Public | Sign in with email/password; returns token and user |
| POST | `/auth/register` | Public | Create patient account |
| GET | `/auth/me` | Signed in | Current account |

## Patient endpoints

All `/patient/*` routes require a patient token. Patient-specific data is scoped to the signed-in account.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/patient/dashboard` | Dashboard, reminders, today's verified meals |
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
| POST | `/patient/sos` | Record an SOS event and return saved contacts |

## Doctor endpoints

All `/doctor/*` routes require a doctor token.

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
| GET/PUT | `/admin/config` | Read or update feature settings |
| POST | `/admin/lookup` | Live-data lookup with local fallback |
| GET | `/shared/foods?q=` | Curated foods |
| GET | `/shared/medicines` | Curated medicines |
| GET | `/shared/guidelines` | Current saved guidelines |
| GET | `/health` | Service health check |

Every clinical and nutrition response includes the disclaimer: “General guidance, not a substitute for professional medical advice.” The API is designed to keep business rules server-side for future Flutter clients. SOS and device integrations are simulations in this build.
