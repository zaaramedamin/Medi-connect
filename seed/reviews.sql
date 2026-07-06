-- MediConnect — Reviews & Ratings
-- Run this in the Supabase SQL Editor AFTER schema.sql and seed.sql.
-- Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Reviews table
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One review per patient per doctor
  UNIQUE (doctor_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_doctor_id ON reviews (doctor_id);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Row Level Security
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read reviews" ON reviews;
DROP POLICY IF EXISTS "Patient can add own review" ON reviews;
DROP POLICY IF EXISTS "Patient can update own review" ON reviews;
DROP POLICY IF EXISTS "Patient can delete own review" ON reviews;

CREATE POLICY "Public can read reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Patient can add own review" ON reviews FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patient can update own review" ON reviews FOR UPDATE USING (auth.uid() = patient_id);
CREATE POLICY "Patient can delete own review" ON reviews FOR DELETE USING (auth.uid() = patient_id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Aggregate view: average rating + review count per doctor
--    security_invoker = on → the caller's RLS applies (public read).
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW doctor_rating_summary
WITH (security_invoker = on) AS
SELECT
  doctor_id,
  ROUND(AVG(rating)::numeric, 1) AS avg_rating,
  COUNT(*)::int AS review_count
FROM reviews
GROUP BY doctor_id;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Sample reviews (spread across doctors so ratings show immediately)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO reviews (doctor_id, patient_id, rating, comment)
VALUES
  ('d0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001', 5, 'Very thorough and patient. Explained everything clearly.'),
  ('d0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000002', 4, 'Short wait, professional care. Recommend.'),
  ('d0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000003', 5, 'Great family doctor, really listens.'),
  ('d0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000002', 5, 'Excellent cardiologist. Felt in safe hands.'),
  ('d0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000001', 4, 'Knowledgeable and reassuring.'),
  ('d0000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000004', 5, 'Amazing with kids, my son loved her.'),
  ('d0000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000003', 5, 'Kind, gentle and very competent.'),
  ('d0000000-0000-4000-a000-000000000009', 'a0000000-0000-4000-a000-000000000005', 4, 'Cleared up my skin issue quickly.'),
  ('d0000000-0000-4000-a000-000000000009', 'a0000000-0000-4000-a000-000000000006', 5, 'Best dermatologist I have seen.'),
  ('d0000000-0000-4000-a000-000000000007', 'a0000000-0000-4000-a000-000000000002', 4, 'Painless visit, modern clinic.'),
  ('d0000000-0000-4000-a000-000000000005', 'a0000000-0000-4000-a000-000000000005', 5, 'Fixed my knee, back to running.'),
  ('d0000000-0000-4000-a000-000000000011', 'a0000000-0000-4000-a000-000000000007', 5, 'Caring and very professional.'),
  ('d0000000-0000-4000-a000-000000000018', 'a0000000-0000-4000-a000-000000000008', 4, 'Detailed explanation of my results.'),
  ('d0000000-0000-4000-a000-000000000012', 'a0000000-0000-4000-a000-000000000004', 5, 'Really helped me, felt heard.'),
  ('d0000000-0000-4000-a000-000000000006', 'a0000000-0000-4000-a000-000000000001', 4, 'Efficient eye exam, friendly staff.')
ON CONFLICT (doctor_id, patient_id) DO NOTHING;
