<div align="center">

# 🌿 Nutronics — Smart Health Companion
**A health tracking and nutrition guidance demo with role based access**

[![UN SDG 3](https://img.shields.io/badge/UN%20SDG-3%20Good%20Health-4C9F38?style=flat-square&logo=united-nations&logoColor=white)](https://sdgs.un.org/goals/goal3)
[![Node.js](https://img.shields.io/badge/Node.js-22.5%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Postgres](https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/docs/guides/database)

[Features](#features) • [Architecture](#architecture) • [Quick Start](#setup) • [API Reference](docs/API.md) • [Demo Accounts](#demo-accounts)

</div>

---

## 📌 Overview

**Nutronics** is a demonstration health tracking web app. Its locally generated nutrition data is synthetic. The rule-based helper and simulated SOS/device features are not clinical services. Do not enter real patient information or rely on the app for treatment or emergency response.

The app includes patient, doctor, and administrator portals, logs, reminders, a deterministic nutrition helper, record storage, and a clinician review queue. A rule match is not a medical validation. Doctors can view patient data only after an administrator assigns the patient.

---

<a id="features"></a>
## ✨ Key Features

- 🥗 **Rule-Based Nutrition Helper**: Demonstrates deterministic checks against synthetic food records; it does not validate clinical safety.
- 🩺 **Doctor Review Queue**: Pending assistant responses can be reviewed by doctors assigned to that patient.
- 🔐 **Dual-Token Authentication**: 15-minute access tokens (`v: 2` claim) paired with rotated 7-day `httpOnly` refresh cookies, single-flight client mutex, 10-second grace window, and automatic session revocation on token reuse.
- 📈 **Biometric & Adherence Trends**: Visualizes blood pressure, glucose, hydration, and care-plan adherence via responsive Recharts graphs.
- ⏰ **Care Reminders & Logging**: Daily medication and water schedules with one-tap status toggles and historical tracking.
- 🚨 **SOS Demo Event**: Records an event and notifies assigned doctors in-app. It does not contact emergency services or send SMS/calls.
- 👥 **Multi-Role Portals**: Dedicated, role-scoped interfaces for **Patients**, **Doctors**, and **Administrators**.

---

## 🛠️ Tech Stack

| Layer | Stack |
|---|---|
| **Frontend** | React 18, TypeScript, Vite 6, Tailwind CSS, React Router 6, Recharts, Lucide React |
| **Backend** | Node.js (>=22.5), Express 4, TypeScript, Zod, bcryptjs, google-auth-library, Nodemailer |
| **Database and records** | Supabase Postgres and private Supabase Storage |
| **Nutrition records** | Synthetic local demo data; optional external lookups are best effort |
| **Security & Auth** | Dual-token rotation, `httpOnly` cookies, SHA-256 token hashing, IP rate limiting, CORS |

---

<a id="architecture"></a>
## 🏛️ System Architecture

```mermaid
graph LR
    subgraph Client ["Client (React 18 + Vite)"]
        UI[Patient / Doctor / Admin UI]
        Mutex[Single-Flight Refresh Mutex]
    end

    subgraph Server ["Server (Express + TypeScript)"]
        Guard[Auth Guards & Rate Limiter]
        Rules[Clinical Nutrition Engine]
        Controller[REST Controllers]
    end

    subgraph Storage ["Data Layer"]
        DB[(Supabase Postgres)]
        Storage[(Private Supabase Storage)]
        Cache[(External API Cache)]
    end

    UI -->|Bearer JWT + httpOnly Cookie| Guard
    Guard --> Controller
    Controller --> Rules
    Rules --> DB
    Controller --> Storage
    Controller -.->|Cached Lookups| Cache
```

---

<a id="setup"></a>
## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: `>= 22.5.0`.
- **npm**: `>= 10.0.0`.

### Quick Start
```sh
# 1. Clone repository and install dependencies across workspaces
git clone https://github.com/Harshy-cmd/Nutronics.git
cd Nutronics
npm install

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Configure Supabase Postgres and private Storage in the server environment
npm run db:setup

# 4. Start concurrent development servers (API: 4000, Client: 5173)
npm run dev
```

Visit **`http://localhost:5173`** to access the web application. The REST API health endpoint runs at **`http://localhost:4000/api/health`**.

For the deployed architecture, database migration, environment variables, recovery notes, and security limitations, see [Supabase migration](docs/supabase-migration.md), [operations guide](docs/OPERATIONS.md), [API reference](docs/API.md), and [data source notes](docs/DATA_SOURCES.md). Demo accounts are available only in local development; production staff access must be provisioned. Do not use real health data in this demo.

### Production deployment

The Vercel client is a static frontend; it does not host the Express API. Render hosts the API, while Supabase provides Postgres and private object storage. Render's filesystem is not the persistent data store.

1. Deploy the API service from `render.yaml` in Render. Set `SUPABASE_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_ORIGIN`, and the Firebase auth settings as server environment variables. Keep service credentials private. The API starts at `/api/health`.
2. Copy the API's Render URL, such as `https://nutronics-api.onrender.com`.
3. In Vercel, open **Project Settings → Environment Variables** and add `VITE_API_URL` with the value `https://nutronics-api.onrender.com/api` for **Production**.
4. Redeploy the Vercel client so the build includes the new URL.

Render free services may spin down and take time to wake. Supabase is the durable data layer, but this demo has no automated backup/restore guarantee. Do not use it for real health records.

---

## 📊 Dataset Ingestion & Management

The repository includes optional import scripts. The active bundled datasets are synthetic demonstration data; importing external records does not make app-generated recommendations clinically validated.

| Script | Command | Network Requirement |
|---|---|---|
| **Full Setup** | `npm run db:setup` | Seeds schema and local demonstration data |
| **IFCT Import** | `npm run db:import:ifct` | Imports IFCT data into the configured database |
| **USDA Import** | `npm run db:import:usda` | Online (gap-fills Western foods via `USDA_API_KEY`) |
| **openFDA Import** | `npm run db:import:openfda` | Online (fetches labels, warnings & RxNorm via `OPENFDA_API_KEY`) |
| **All Datasets** | `npm run db:import:all` | Sequentially executes IFCT, USDA, and openFDA importers |

---

<a id="demo-accounts"></a>
## 🔑 Demo Accounts

Demo accounts are for local development only and are disabled in production. Do not enable public demo credentials on a deployed instance.

| Role | Email | Clinical Focus |
|---|---|---|
| **Patient** | `patient@nutronics.org` | Aarav Sharma (68) — Type 2 Diabetes & Hypertension |
| **Patient** | `meera@nutronics.org` | Meera Nair (72) — Chronic Kidney Disease (Stage 3) |
| **Patient** | `kabir@nutronics.org` | Kabir Verma (58) — Cardiovascular Health & Obesity |
| **Doctor** | `doctor@nutronics.org` | Dr. Priya Menon — Internal Medicine & Clinical Nutrition |
| **Admin** | `admin@nutronics.org` | Vikram Desai — Systems Administrator |

---

## 📁 Project Structure

```
Nutronics/
├── client/                     # Frontend SPA workspace (React + Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI (Stat, Card, Badge, QuickLinks)
│   │   ├── pages/              # Portal views (Patient, Doctor, Admin, Auth)
│   │   ├── api.ts              # Fetch client with single-flight refresh mutex
│   │   └── App.tsx             # Route declarations & role guards
├── server/                     # Backend REST API workspace (Node.js + Express)
│   ├── scripts/                # Data pipelines (IFCT, USDA, openFDA) & test suites
│   ├── src/
│   │   ├── db/                 # Postgres schema definitions & local demo seeding
│   │   ├── middleware/         # JWT validation, role authorization & rate limiting
│   │   ├── routes/             # Modular REST routers (auth, patient, doctor, admin)
│   │   ├── services/           # Nutrition engine, starter data & threshold checks
│   │   └── index.ts            # Server entrypoint and Express middleware chain
├── docs/                       # Technical specifications
│   ├── API.md                  # REST API reference, proxy settings & auth claims
│   └── DATA_SOURCES.md         # Clinical sources, guidelines & safety notes
└── package.json                # Root workspace configuration
```

---

## 🔮 Roadmap

- [ ] **Cross-Platform Mobile App**: Flutter client consuming the existing REST API.
- [x] **Cloud Database Migration**: Supabase Postgres and private object storage.
- [ ] **Direct Wearable Telemetry**: Web Bluetooth and Health Connect synchronization for real-time vitals.
- [ ] **Critical Clinical Webhooks**: Automated push/SMS notifications to physicians for abnormal biometrics.

---

## 👨‍💻 Author & Connect

**Harsh Yadav**
- **GitHub**: [@Harshy-cmd](https://github.com/Harshy-cmd)
- **Repository**: [github.com/Harshy-cmd/Nutronics](https://github.com/Harshy-cmd/Nutronics)

---

## ⚠️ Medical Disclaimer

*Nutronics is an engineering demonstration and academic project aligned with UN SDG 3. It is **not a certified medical device** and does not provide clinical diagnosis, medical treatment, or prescription advice. Always consult a qualified physician or healthcare provider for medical advice.*
