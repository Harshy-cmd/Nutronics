# Nutronics — Smart Health Companion

**Personalized Wellness Powered by AI and Medical Expertise.** Nutronics is an offline-first health companion demo aligned with UN SDG 3: Good Health & Well-Being. It brings condition-aware meal guidance, gentle reminders, progress logs, health records, simulated devices, and a doctor review queue into an accessible web experience. Business rules live behind a REST API so a future Flutter client can reuse them.

## Requirements and setup

- Node.js **22.5 or later** (uses the built-in `node:sqlite` driver, avoiding native addon compilation).
- npm.

```sh
npm install
npm run seed
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`; check `http://localhost:4000/api/health`. No paid key or external service is required. Optional live lookups time out and fall back to local data. Copy `.env.example` to `.env` to customize ports and the local JWT secret.

## Demo accounts

All demo passwords are `password123`.

| Role | Email | Demo profile |
|---|---|---|
| Patient | `patient@nutronics.org` | Aarav Sharma, 68, diabetes and hypertension |
| Patient | `meera@nutronics.org` | Meera Nair, 72, CKD and hypertension |
| Patient | `kabir@nutronics.org` | Kabir Verma, 58, heart disease and obesity |
| Doctor | `doctor@nutronics.org` | Dr. Priya Menon, internal medicine and clinical nutrition |
| Admin | `admin@nutronics.org` | Vikram Desai, platform administrator |

## Useful commands

```sh
npm run seed   # deterministic and safe to repeat
npm run lint   # TypeScript checks for both workspaces
npm run build  # production build for API and web client
```

The seed generates 160 food entries, 25 medicine examples, five condition guideline records, 30 days of synthetic patient logs, meal plans, reminders, contacts, records, notifications, and simulated devices. Passwords are hashed before storage. The local SQLite database and uploads are created under `server/`.

## Synthetic and external data

Food nutrient values and medicine notes in this demonstration are generated examples, not validated clinical facts. Condition guidance is general education, with editable rules stored by the API. Live public API lookups are optional and cached; an offline installation remains usable. See [Data sources and safety](docs/DATA_SOURCES.md). Clinical and nutrition pages display: “General guidance, not a substitute for professional medical advice.”

## Storage evolution

The application uses SQLite for a zero-service local demo. The table boundaries in `server/src/db/schema.ts` separate accounts, progress, reminders, meals, chat, records, contacts, and guidelines. For a hosted deployment, move persistence behind repository functions and migrate the schema to PostgreSQL; document JSON fields and unique constraints in migrations. MongoDB would require equivalent ownership checks and consistency rules and is not a drop-in SQL replacement.

## Path to the Flutter mobile app

The Flutter client can call the same token-authenticated JSON endpoints listed in [API.md](docs/API.md): auth; `/patient/dashboard`, `/diet`, `/reminders`, `/progress`, `/assistant`, `/records`, `/devices`, `/profile`, `/contacts`, `/notifications`, `/sos`; doctor dashboard, patient dossier, verification queue and guidelines; and admin stats, users and config. Use multipart upload for records and persist the JWT using secure device storage. The backend keeps assistant rules, guideline matching, and authorization server-side.

Integration seams are marked in source: `TODO(ai)` for a future recommendation engine, `TODO(device)` for Web Bluetooth / `flutter_blue_plus`, `TODO(email)` for transactional email, and `TODO(sms)` for a native SMS gateway. Device sync and SOS delivery are simulations here; they do not read hardware or send messages.

## Important note

This project is a local software demonstration, not a medical device. It does not diagnose, treat, or replace professional care. Seek urgent medical attention for emergency symptoms.
