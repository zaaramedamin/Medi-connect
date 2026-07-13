-- MediConnect — Patient profiles
-- Extra profile fields for patients (doctors keep their own `doctors` row).
-- Keyed 1:1 to auth.users. Run in the Supabase SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  city TEXT,
  blood_type TEXT,
  allergies TEXT,
  emergency_contact TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security — each user reads and writes only their own profile.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own profile" ON profiles;
DROP POLICY IF EXISTS "Owner inserts own profile" ON profiles;
DROP POLICY IF EXISTS "Owner updates own profile" ON profiles;

CREATE POLICY "Owner reads own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owner inserts own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Owner updates own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────
-- Profiles for the seeded patients.
--
-- Booking requires a phone number and a date of birth (the API rejects a
-- booking without them — see server/src/services/patientProfile.ts), so the
-- demo patients need a row or none of them can book. Register a fresh account
-- to see the "complete your details" flow instead.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO profiles (id, phone, date_of_birth, gender, city, blood_type, allergies, emergency_contact)
VALUES
  ('a0000000-0000-4000-a000-000000000001', '+21620111001', '1991-04-22', 'male',   'Tunis',    'O+',  NULL,                              'Fatma Sassi · +21620111051'),
  ('a0000000-0000-4000-a000-000000000002', '+21620111002', '1988-11-03', 'female', 'Tunis',    'A+',  'Penicillin',                      'Ali Khelifi · +21620111052'),
  ('a0000000-0000-4000-a000-000000000003', '+21620111003', '1995-07-15', 'male',   'Sousse',   'B+',  NULL,                              'Leila Dridi · +21620111053'),
  ('a0000000-0000-4000-a000-000000000004', '+21620111004', '1993-02-28', 'female', 'Sfax',     'AB+', 'Lactose intolerance',             'Sami Ben Romdhane · +21620111054'),
  ('a0000000-0000-4000-a000-000000000005', '+21620111005', '1986-09-09', 'male',   'Tunis',    'O-',  'Asthma — uses a Ventolin inhaler','Nadia Karray · +21620111055'),
  ('a0000000-0000-4000-a000-000000000006', '+21620111006', '1999-12-01', 'female', 'Ariana',   'A-',  NULL,                              'Hedi Jebali · +21620111056'),
  ('a0000000-0000-4000-a000-000000000007', '+21620111007', '1990-06-18', 'male',   'Bizerte',  'B-',  'Pollen',                          'Sonia Chatti · +21620111057'),
  ('a0000000-0000-4000-a000-000000000008', '+21620111008', '1997-03-25', 'female', 'La Marsa', 'O+',  NULL,                              'Mehdi Guesmi · +21620111058')
ON CONFLICT (id) DO NOTHING;
