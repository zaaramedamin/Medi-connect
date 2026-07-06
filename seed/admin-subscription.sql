-- MediConnect — Admin role + Doctor subscriptions (prototype, no real payment)
-- Run this in the Supabase SQL Editor AFTER schema.sql and seed.sql.
-- Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Subscription columns on doctors
--    A doctor is only listed to patients while their subscription is active.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'expired')),
  ADD COLUMN IF NOT EXISTS subscription_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_doctors_subscription ON doctors (subscription_status);

-- Activate all existing seeded doctors for one year so they stay visible
UPDATE doctors
SET subscription_status = 'active',
    subscription_expires = NOW() + INTERVAL '1 year'
WHERE subscription_status = 'inactive' AND subscription_expires IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Admin account  (email: admin@mediconnect.tn  password: Admin1234)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'ad000000-0000-4000-a000-000000000001',
  'authenticated',
  'authenticated',
  'admin@mediconnect.tn',
  crypt('Admin1234', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', 'Platform Admin', 'role', 'admin'),
  NOW(), NOW(), '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  NOW(), NOW(), NOW()
FROM auth.users u
WHERE u.email = 'admin@mediconnect.tn'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
  );
