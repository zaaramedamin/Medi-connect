<div align="center">

# MediConnect

**A full-stack telemedicine and doctor-appointment platform** — book in-person or video visits, keep clinical records, issue verifiable medical documents, and manage everything from role-based dashboards.

React 19 · TypeScript · Express · Supabase (Postgres + RLS) · Tailwind CSS v4

</div>

---

## Overview

MediConnect connects patients with doctors end to end: patients discover doctors on a map, book appointments (in person or by video), and receive reminders; doctors manage their schedule, keep per-patient clinical files, and issue prescriptions and certificates; admins oversee the platform and tune an AI health assistant. It is a monorepo with a React client and an Express API, backed by Supabase for auth, database, and storage.

The codebase treats security as a first-class concern — role checks derive from server-only metadata, medical records are gated by an explicit care relationship, issued documents are immutable, and every privileged action is validated on the server rather than trusted from the client.

---

## Features

**Appointments & scheduling**
- Doctor discovery with search, natural-language (AI) search, and an interactive Leaflet map
- Real-time slot availability; booking with cash or online payment method
- **Video consultations (telemedicine)** — an in-app embedded call room, access-gated to the two participants and time-windowed around the visit
- **Live updates** via Supabase Realtime — calendars refresh instantly, no double-booking
- Email confirmations and 24h / 2h reminders (Resend)

**Clinical records** (PHI)
- Per-patient charts: chronic conditions, current medications, clinical allergies, notes
- Consultation log: symptoms, examination, diagnosis, plan, vitals
- **Issued documents** — report, prescription, certificate, referral — as immutable, print-ready sheets with a QR code
- **Public document verification** — anyone can confirm a document is genuine at `/verify`, with no patient data exposed

**Patient reliability limits**
- No-show / late-cancellation detection → strike → temporary ban → blacklist
- Doctors see a reliability flag; a treating doctor or admin can lift a ban; admins clear blacklists

**AI health assistant (RAG)**
- Retrieval-augmented answers grounded in doctor-written articles, with citations
- Product advisor over the shop catalogue
- Admin **AI Console** to tune every RAG parameter live and view request logs

**Platform**
- Role-based dashboards for **patient**, **doctor**, and **admin**
- Health-products shop, community articles, ratings & reviews
- Bilingual UI (English / French)
- Idle-session timeout, rate limiting, structured request logging, and PHI-safe audit trails

---

## Tech Stack

| Layer | Tools |
|-------|-------|
| **Frontend** | React 19, React Router v7, TypeScript, Vite, Tailwind CSS v4, TanStack Query, Zustand, React Leaflet, Motion |
| **Backend** | Node.js, Express, TypeScript |
| **Auth** | Supabase Auth (JWT; roles in `app_metadata`) |
| **Database** | Supabase (PostgreSQL) with Row-Level Security + `pgvector` |
| **Storage** | Supabase Storage (profile photos) |
| **AI / RAG** | Google Gemini (embeddings + generation), pgvector similarity search |
| **Email** | Resend |
| **Video** | Jitsi (embedded, no account required) |
| **Tests** | Jest (server), Vitest + Testing Library (client) |

---

## Project Structure

```
Medi-Connect-platform/
├── client/            React 19 + Vite + TypeScript frontend
│   └── vercel.json    SPA rewrite for Vercel
├── server/            Express + TypeScript API
├── seed/              Idempotent SQL migrations & seed data (run in order)
├── schema.sql         Core database schema with RLS policies
├── render.yaml        Render Blueprint for the API
└── package.json       npm workspaces root
```

---

## Local Development

### Prerequisites

- Node.js **20+** (see `.nvmrc`)
- A free [Supabase](https://supabase.com) project
- Optional: [Resend](https://resend.com) key for emails, free [Gemini API](https://aistudio.google.com/apikey) key for the AI assistant

### 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com); from **Settings → API** copy your **Project URL**, **anon key**, and **service_role key**.
2. In the **SQL Editor**, run `schema.sql`, then the files in `seed/` (they are idempotent and safe to re-run). Recommended order:

   ```
   schema.sql
   seed/profiles.sql          seed/reviews.sql            seed/orders.sql
   seed/community.sql         seed/seed.sql               seed/map-coordinates.sql
   seed/admin-subscription.sql
   seed/harden-roles.sql          # moves roles to app_metadata (security)
   seed/doctor-profile.sql        seed/medical-records.sql
   seed/telemedicine.sql          seed/realtime.sql           seed/patient-limits.sql
   seed/rag-articles.sql      seed/rag-doctors.sql        seed/rag-products.sql
   seed/rag-hybrid.sql        seed/rag-admin-console.sql   seed/articles-bilingual.sql
   ```
3. Under **Storage**, create a **public** bucket named `doctor-photos`.

### 2. Environment variables

Copy the examples and fill in your values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

### 3. Install & run

```bash
npm install
npm run dev
```

- Client → http://localhost:5173
- API → http://localhost:3001

The Vite dev server proxies `/api` to the API, so no CORS setup is needed locally.

### Tests

```bash
npm test --workspace=server
npm test --workspace=client
```

---

## Deployment

The client deploys to **Vercel** (static SPA) and the API to **Render** (Node web service). Deploy the API first so you have its URL for the client's `VITE_API_URL`.

### API → Render

1. Push this repo to GitHub and, in Render, create a **Blueprint** from `render.yaml` (or a **Web Service** with build `npm install && npm run build --workspace=server` and start `npm run start --workspace=server`).
2. Set the environment variables marked `sync: false` (see the reference below). Set `CLIENT_ORIGIN` to your Vercel URL once you have it.
3. Note the service URL, e.g. `https://mediconnect-api.onrender.com`.

> **Free-tier note:** Render sleeps idle services, which pauses the in-process reminder/no-show job. Point an external scheduler (cron-job.org, UptimeRobot, GitHub Actions) at `POST /api/jobs/reminders` every ~15 minutes with header `x-job-token: <JOB_TOKEN>` to keep it running.

### Client → Vercel

1. In Vercel, **Import** the GitHub repo and set **Root Directory** to `client`. Vercel auto-detects Vite (build `npm run build`, output `dist`); `client/vercel.json` supplies the SPA rewrite.
2. Add the client environment variables, setting `VITE_API_URL` to the Render API URL from above.
3. Deploy, then set `CLIENT_ORIGIN` on the Render service to the Vercel URL and redeploy the API.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role key (server-only; never exposed to the browser) |
| `SUPABASE_BUCKET` | ✅ | Storage bucket for photos (`doctor-photos`) |
| `CLIENT_ORIGIN` | ✅ (prod) | Allowed browser origin for CORS (the Vercel URL). Localhost is always allowed in dev. |
| `PORT` | – | API port (default `3001`) |
| `RESEND_API_KEY` | – | Enables confirmation & reminder emails; omit to disable |
| `SENDER_EMAIL` | – | From-address for emails (e.g. `onboarding@resend.dev`) |
| `GEMINI_API_KEY` | – | Google AI Studio key for the RAG assistant (embeddings + answers) |
| `GEMINI_CHAT_MODEL` | – | Override the generation model (default `gemini-3.1-flash-lite`) |
| `JOB_TOKEN` | – | Secret for the external-cron reminder hook |
| `JITSI_DOMAIN` | – | Video server (default `meet.jit.si`) |
| `CALL_SECRET` | – | HMAC secret for deriving video-room names |
| `LOG_LEVEL` | – | `debug` \| `info` \| `warn` \| `error` (default `info`) |
| `SENTRY_DSN` | – | Reserved for error tracking |

### Client (`client/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key (safe in the browser) |
| `VITE_API_URL` | ✅ (prod) | Deployed API origin. Leave empty in dev to use the Vite proxy. |

---

## Security Highlights

- **Roles from `app_metadata`** — authorization derives from a field only the server can write, not user-editable metadata.
- **Ownership checks everywhere** — clinical records require an appointment relationship; every mutation re-verifies ownership server-side rather than trusting the role alone.
- **Immutable documents** — issued documents freeze a snapshot of everything printed on them; they are revoked, never edited.
- **PHI-safe logging** — request logs redact clinical fields and secrets; medical access is audited.
- **RLS by default** — sensitive tables enable Row-Level Security; the API uses the service-role key and enforces access in route handlers.

---

## Author

**Zaara Med Amin**
