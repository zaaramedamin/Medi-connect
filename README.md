# MediConnect

A full-stack doctor-patient appointment booking platform built with React, TypeScript, and Supabase.

---

## Tech Stack

| Layer | Tools |
|-------|-------|
| Frontend | React 19, React Router v7, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand |
| Backend | Node.js, Express, TypeScript |
| Auth | Supabase Auth (JWT) |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Storage | Supabase Storage (doctor profile photos) |
| Email | Resend |

---

## Features

- Patient and doctor roles with separate dashboards
- Interactive appointment calendar with real-time slot availability
- Doctor profile management (specialty, working hours, blocked slots)
- Secure authentication via Supabase Auth
- Appointment confirmation emails via Resend
- Rate-limited API with input validation

---

## Project Structure

```
Medi-Connect-platform/
├── client/        React 19 + Vite + TypeScript frontend
├── server/        Express + TypeScript API
├── schema.sql     Supabase database schema with RLS policies
└── package.json   npm workspaces root
```

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and note your **Project URL**, **anon key**, and **service_role key**
3. Run `schema.sql` in the Supabase **SQL Editor**
4. Go to **Storage → New bucket**, name it `doctor-photos`, and set access to **Public**

### 2. Environment Variables

Create `server/.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET=doctor-photos
CLIENT_ORIGIN=http://localhost:5173
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
SENDER_EMAIL=noreply@yourdomain.com
PORT=3001
```

Create `client/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Install & Run

```bash
npm install
npm run dev
```

- Client → http://localhost:5173
- Server → http://localhost:3001

---

## Tests

```bash
npm test --workspace=server
npm test --workspace=client
```

---

## Authors

- Zaara Med Amin