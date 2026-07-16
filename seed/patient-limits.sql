-- MediConnect — patient reliability limits (no-show / late-cancel penalties).
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- A "false reservation" is a booking the patient wastes: a no-show (still
-- confirmed 24h after the slot) or a late cancellation (< 2h before the slot).
-- The state machine (server/src/services/patientLimits.ts):
--   miss 1  -> flagged so doctors can see it
--   miss 2  -> temporary 2-day platform-wide booking ban (strikes reset)
--   2nd ban -> permanent blacklist
-- A treating doctor or an admin can lift a ban; only an admin clears a blacklist.

-- ── Penalty state, one row per patient ───────────────────────────────
-- Server-only (RLS on, no policies) — a patient must never be able to edit
-- their own ban. Matches the medical-records tables' pattern.
CREATE TABLE IF NOT EXISTS patient_penalties (
  patient_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  missed_count  INT NOT NULL DEFAULT 0,        -- strikes since the last ban reset (0 or 1; 2 triggers a ban)
  total_missed  INT NOT NULL DEFAULT 0,        -- lifetime misses — drives the doctor-visible flag
  ban_count     INT NOT NULL DEFAULT 0,        -- how many temp bans have been imposed (2 => blacklist)
  banned_until  TIMESTAMPTZ,                   -- non-null and in the future = currently banned
  blacklisted   BOOLEAN NOT NULL DEFAULT FALSE,
  last_reason   TEXT,                          -- 'no_show' | 'late_cancel'
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE patient_penalties ENABLE ROW LEVEL SECURITY;

-- ── A missed appointment gets its own terminal status ────────────────
-- 'no_show' lets the detection job flip a stale 'confirmed' row exactly once
-- (idempotent: it only ever selects status = 'confirmed'), and lets doctors
-- mark a miss explicitly. The default constraint name for the CHECK on
-- appointments.status is appointments_status_check.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show'));

-- Detection job scans confirmed appointments whose slot is > 24h past.
CREATE INDEX IF NOT EXISTS idx_appointments_status_time
  ON appointments (status, time_slot);
