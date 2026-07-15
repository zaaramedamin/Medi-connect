-- MediConnect — video (telemedicine) appointments.
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Adds a consultation mode to appointments. 'video' appointments get an
-- in-app embedded call; 'in_person' is the default and unchanged. The video
-- room itself is NOT stored — the server derives it on demand from the
-- appointment id + a secret and only hands it to the two participants
-- (see server/src/routes/appointments.ts).

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'in_person'
    CHECK (mode IN ('in_person', 'video'));
