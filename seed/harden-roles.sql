-- MediConnect — move authorization roles out of user-writable metadata.
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- WHY THIS EXISTS
-- The API used to read a user's role from user_metadata (raw_user_meta_data).
-- That field is writable by the user themselves — supabase.auth.updateUser({data})
-- sets it — so any signed-in patient could run
--     supabase.auth.updateUser({ data: { role: 'admin' } })
-- and walk straight into every /api/admin route. The server now reads the role
-- from app_metadata (raw_app_meta_data), which only the service-role key can
-- write. This migration populates that field for existing users; without it,
-- everyone would fall back to the least-privilege default (patient) and every
-- doctor and admin would be locked out.
--
-- Roles are derived from ground truth, NOT copied from the old user_metadata
-- value (which, being user-writable, cannot be trusted).

-- 1. Doctors — everyone who has a row in the doctors table.
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'doctor')
FROM doctors d
WHERE d.id = u.id;

-- 2. Platform admin — the seeded account. Add any other real admin emails here
--    explicitly; do not widen this by trusting the old metadata.
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE email = 'admin@mediconnect.tn';

-- 3. Everyone else keeps no app_metadata role and is treated as a patient.
--    Strip the now-untrusted role from user_metadata everywhere (name and
--    avatar_url are preserved) so the only role in the system lives in the
--    field the user cannot write.
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE raw_user_meta_data ? 'role';
