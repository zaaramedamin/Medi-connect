-- MediConnect — enable live updates for appointments.
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Adds the appointments table to Supabase's realtime publication so the client
-- receives insert/update/delete events over a websocket. Row Level Security
-- still applies to realtime, so a patient only sees changes to their own
-- appointments and a doctor only to theirs (schema.sql already defines those
-- SELECT policies) — no new data is exposed.

-- REPLICA IDENTITY FULL so UPDATE/DELETE events carry the old row too, which
-- lets RLS decide visibility on both the old and new state.
ALTER TABLE appointments REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Add to the publication only if it isn't already a member (re-run safe).
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
  END IF;
END $$;
