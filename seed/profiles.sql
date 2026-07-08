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
