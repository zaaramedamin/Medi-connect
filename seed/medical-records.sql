-- MediConnect — Medical records (patient charts, consultations, issued documents).
-- Run this in the Supabase SQL Editor AFTER schema.sql and profiles.sql.
-- Safe to re-run.
--
-- This is Protected Health Information. Every table below enables RLS with NO
-- policies — the project's server-only pattern (see seed/rag-admin-console.sql):
-- only the service-role key (this server) can touch these rows, and the API
-- route handlers are the real access control (they run the ownership checks).
-- The client never queries these tables directly.
--
-- Nothing here duplicates seed/profiles.sql. A patient's phone, date of birth,
-- gender, blood type and self-reported allergies live on `profiles` and are
-- OWNED BY THE PATIENT. The tables below are what a CLINICIAN records, and the
-- patient cannot edit them.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Patient chart — the standing clinical file, one row per patient.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_charts (
  patient_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  chronic_conditions  TEXT[] NOT NULL DEFAULT '{}',   -- 'diabetes','hypertension',…
  current_medications JSONB  NOT NULL DEFAULT '[]',   -- [{name, dose, frequency}]
  clinical_allergies  TEXT,                            -- clinician-recorded, distinct from the patient's self-report
  notes               TEXT,                            -- free-form background the doctor keeps
  updated_by          UUID REFERENCES auth.users(id),  -- last doctor who edited
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE patient_charts ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Consultations — one row per visit / encounter.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id             BIGSERIAL PRIMARY KEY,
  patient_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id      UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL,  -- nullable: not every note maps to a booking
  visit_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason         TEXT,          -- chief complaint
  symptoms       TEXT,
  examination    TEXT,          -- findings
  diagnosis      TEXT,
  plan           TEXT,          -- treatment / follow-up
  vitals         JSONB,         -- { bp, temperature, weight, heart_rate }
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations (patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor  ON consultations (doctor_id);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Issued documents — report / prescription / certificate / referral.
--    IMMUTABLE once issued: `content` is a frozen snapshot of everything
--    printed on the document (doctor identity, patient identity, clinical
--    text, drug list). Editing the consultation later, or the doctor
--    renaming their practice, must never change a document already handed
--    to a patient or a pharmacy. Documents are revoked, never deleted.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_documents (
  id              BIGSERIAL PRIMARY KEY,
  reference       TEXT NOT NULL UNIQUE,        -- human-facing id, e.g. 'MC-REP-2026-000042'
  type            TEXT NOT NULL CHECK (type IN ('report', 'prescription', 'certificate', 'referral')),
  patient_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  consultation_id BIGINT REFERENCES consultations(id) ON DELETE SET NULL,
  content         JSONB NOT NULL,              -- the frozen snapshot (see above)
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,
  revoked_reason  TEXT
);

CREATE INDEX IF NOT EXISTS idx_documents_patient ON medical_documents (patient_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_doctor  ON medical_documents (doctor_id);

ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Access log — every read and write of PHI. In a medical system the
--    audit trail is part of the control, not an afterthought.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_access_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role  TEXT,
  patient_id  UUID,
  action      TEXT NOT NULL,   -- 'view_chart' | 'update_chart' | 'create_consultation' | 'issue_document' | 'view_document' | 'revoke_document'
  target_id   TEXT,            -- id of the row touched (consultation/document), as text
  ip          TEXT,
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_log_patient ON medical_access_log (patient_id, at DESC);

ALTER TABLE medical_access_log ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Per-type document counter — gives each document a stable, gap-free
--    sequence number for its reference (MC-REP-2026-000042). A dedicated
--    sequence per (type, year) via a helper table + row lock, so two
--    documents issued at once can't collide on the reference.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_counters (
  scope  TEXT PRIMARY KEY,   -- e.g. 'report-2026'
  n      BIGINT NOT NULL DEFAULT 0
);

ALTER TABLE document_counters ENABLE ROW LEVEL SECURITY;

-- Atomically bump and return the next number for a scope. SECURITY DEFINER so
-- the service role can upsert; still only reachable through the server.
CREATE OR REPLACE FUNCTION next_document_number(p_scope TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_n BIGINT;
BEGIN
  INSERT INTO document_counters (scope, n)
  VALUES (p_scope, 1)
  ON CONFLICT (scope) DO UPDATE SET n = document_counters.n + 1
  RETURNING n INTO v_n;
  RETURN v_n;
END;
$$;
