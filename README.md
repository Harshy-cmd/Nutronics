# Nutronics — Smart Health Companion

**Personalized Wellness Powered by AI and Medical Expertise.** Nutronics is an offline-first health companion demo aligned with UN SDG 3: Good Health & Well-Being. It brings condition-aware meal guidance, gentle reminders, progress logs, health records, simulated devices, and a doctor review queue into an accessible web experience. Business rules live behind a REST API so a future Flutter client can reuse them.

## Requirements and Setup

- Node.js **22.5 or later** (uses the built-in `node:sqlite` driver, avoiding native addon compilation).
- npm.

### Quick Start

```sh
# 1. Install dependencies across client and server
npm install

# 2. Copy environment file and customize settings
cp .env.example .env

# 3. Create the database, seed initial data, and import IFCT 2017 foods
npm run db:setup

# 4. Start both API and frontend dev servers
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`; check `http://localhost:4000/api/health`.

---

## Database & Data Import Scripts

Nutronics stores its data in a local SQLite database (`data/nutronics.sqlite`). The schema, initial records, and dataset imports are fully reproducible using npm scripts:

| Script | Command | Description |
|---|---|---|
| **Database Setup** | `npm run db:setup` | Seeds base database tables, demo users, guidelines, and imports real IFCT 2017 foods and composite recipe dishes. |
| **Base Seed** | `npm run db:seed` | Re-seeds initial users, patient logs, meals, guidelines, and simulated devices. |
| **IFCT Import** | `npm run db:import:ifct` | Imports 542 foods from the Indian Food Composition Tables (IFCT 2017) and calculates macros for 16 Indian composite recipes. (No API key needed) |
| **USDA Gap Import** | `npm run db:import:usda` | Imports missing food items (e.g. rolled oats, Greek yogurt, broccoli, tofu) from USDA FoodData Central. *(Requires `USDA_API_KEY` in `.env`)* |
| **openFDA Import** | `npm run db:import:openfda` | Imports FDA labels, indications, warnings, and RxNorm mappings for 50 chronic condition medications. *(Requires `OPENFDA_API_KEY` in `.env`)* |
| **All Imports** | `npm run db:import:all` | Sequentially runs IFCT, USDA gap-filling, and openFDA imports. |

> [!NOTE]
> `npm run db:import:ifct` runs offline using the bundled `ifct2017` package. For USDA and openFDA imports, add your keys to the root `.env` file as `USDA_API_KEY` and `OPENFDA_API_KEY` (never use `DEMO_KEY`).

---

## Authentication System

Nutronics features a complete authentication system:
- **Email + Password**: Secure bcrypt password hashing, form validation, strength hints, and generic error messages.
- **Token Security**: Short-lived 15-minute access tokens (`v: 2` claim) stored in client memory/storage, paired with 7-day rotated `httpOnly` refresh cookies (`Path=/api/auth`, `SameSite=Lax`, `Secure` in production).
- **Grace Window & Reuse Detection**: A 10-second server grace window allows in-flight concurrent requests to succeed without session loss; token reuse outside the grace window immediately revokes all sessions for that account.
- **Single-Flight Refresh**: Concurrent 401 responses on the client share a single in-flight refresh promise and retry once.
- **Sign in with Google**: One-tap Google Sign-In with verified email matching.
- **Password Reset**: Secure forgot-password flow with 30-minute SHA-256 hashed single-use tokens. Requesting a new reset link immediately invalidates previous unused tokens.

---

## Demo Accounts

When `VITE_SHOW_DEMO=true` in `.env`, demo sign-in buttons are available on the login page. In production (`NODE_ENV=production`), demo account endpoints are disabled.

All demo passwords are `password123`.

| Role | Email | Demo Profile |
|---|---|---|
| Patient | `patient@nutronics.org` | Aarav Sharma, 68, diabetes and hypertension |
| Patient | `meera@nutronics.org` | Meera Nair, 72, CKD and hypertension |
| Patient | `kabir@nutronics.org` | Kabir Verma, 58, heart disease and obesity |
| Doctor | `doctor@nutronics.org` | Dr. Priya Menon, internal medicine and clinical nutrition |
| Admin | `admin@nutronics.org` | Vikram Desai, platform administrator |

---

## Useful Commands

```sh
npm run dev      # run client and server concurrently
npm run build    # production build for API (tsc) and web client (Vite)
npm run lint     # TypeScript type-checks for both workspaces
npm run test     # run endpoint test suites (e.g. npx tsx server/scripts/testHttpEndpoints.ts)
```

---

## Synthetic and External Data

Food nutrient values from IFCT 2017 and composite dishes provide real macronutrient and mineral data. Condition guidance is general education, with editable rules stored by the API. Live public API lookups are optional and cached; an offline installation remains usable. See [Data sources and safety](docs/DATA_SOURCES.md). Clinical and nutrition pages display: “General guidance, not a substitute for professional medical advice.”

---

## Storage Evolution

The application uses SQLite via Node's native `node:sqlite` driver. The table boundaries in `server/src/db/schema.ts` separate accounts, progress, reminders, meals, chat, records, contacts, and guidelines. For a hosted deployment, move persistence behind repository functions and migrate the schema to PostgreSQL.

---

## Important Note

This project is a local software demonstration, not a medical device. It does not diagnose, treat, or replace professional care. Seek urgent medical attention for emergency symptoms.
