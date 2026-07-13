-- MediConnect — Rich doctor profiles
-- Run this in the Supabase SQL Editor AFTER schema.sql, seed.sql and
-- map-coordinates.sql. Safe to re-run.
--
-- Adds the fields the public profile page shows beyond name/specialty/bio:
-- years of experience, public contact details, spoken languages, a street
-- address for the map pin, and the clinics a doctor holds a post at.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Extra profile columns
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS years_experience INT
    CHECK (years_experience IS NULL OR years_experience BETWEEN 0 AND 70),
  -- Public/professional contact. Distinct from the auth.users login email,
  -- which is a credential and must never be exposed.
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  -- Street address shown under the map pin (lat/lng come from map-coordinates.sql).
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS languages TEXT[];

-- ─────────────────────────────────────────────────────────────────────
-- 2. Clinic posts — the positions a doctor holds (or held) at a clinic
--    or hospital. No rows for a doctor = independent practice.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_clinics (
  id           BIGSERIAL PRIMARY KEY,
  doctor_id    UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_name  TEXT NOT NULL,
  role         TEXT,                       -- e.g. "Head of Cardiology"
  city         TEXT,
  start_year   INT CHECK (start_year IS NULL OR start_year BETWEEN 1950 AND 2100),
  end_year     INT CHECK (end_year   IS NULL OR end_year   BETWEEN 1950 AND 2100),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  -- NULL end_year = still there. Past posts must not end before they start.
  CONSTRAINT doctor_clinics_years_ordered
    CHECK (end_year IS NULL OR start_year IS NULL OR end_year >= start_year)
);

CREATE INDEX IF NOT EXISTS idx_doctor_clinics_doctor_id ON doctor_clinics (doctor_id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Row Level Security — anyone can read a doctor's posts, only the
--    doctor can change their own.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE doctor_clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read clinic posts" ON doctor_clinics;
DROP POLICY IF EXISTS "Doctor can manage own clinic posts" ON doctor_clinics;

CREATE POLICY "Public can read clinic posts" ON doctor_clinics
  FOR SELECT USING (true);
CREATE POLICY "Doctor can manage own clinic posts" ON doctor_clinics
  FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

-- ─────────────────────────────────────────────────────────────────────
-- 4. Replace a doctor's whole set of clinic posts in one transaction.
--    The dashboard edits the list as a unit, and a plain DELETE-then-INSERT
--    from the API could wipe the posts if the insert then failed.
--    SECURITY INVOKER (the default) → the RLS policies above still apply,
--    so a doctor calling this directly can only rewrite their own rows.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION replace_doctor_clinics(p_doctor_id UUID, p_clinics JSONB)
RETURNS SETOF doctor_clinics
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM doctor_clinics WHERE doctor_id = p_doctor_id;

  RETURN QUERY
  INSERT INTO doctor_clinics (doctor_id, clinic_name, role, city, start_year, end_year)
  SELECT
    p_doctor_id,
    TRIM(c->>'clinic_name'),
    NULLIF(TRIM(COALESCE(c->>'role', '')), ''),
    NULLIF(TRIM(COALESCE(c->>'city', '')), ''),
    NULLIF(c->>'start_year', '')::INT,
    NULLIF(c->>'end_year', '')::INT
  FROM jsonb_array_elements(COALESCE(p_clinics, '[]'::jsonb)) AS c
  -- A blank clinic name is an empty row in the editor, not a post.
  WHERE COALESCE(TRIM(c->>'clinic_name'), '') <> ''
  RETURNING *;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Fill the seeded doctors
-- ─────────────────────────────────────────────────────────────────────
UPDATE doctors AS d SET
  years_experience = v.years,
  email            = v.email,
  website          = v.website,
  address          = v.address,
  languages        = v.langs
FROM (VALUES
  ('d0000000-0000-4000-a000-000000000001', 12, 'contact@benali-med.tn',     'https://benali-med.tn',      '14 Avenue Habib Bourguiba, Tunis',        ARRAY['Arabic','French','English']),
  ('d0000000-0000-4000-a000-000000000002', 18, 'cabinet@mansouri-cardio.tn', 'https://mansouri-cardio.tn', '3 Rue de Marseille, Tunis',               ARRAY['Arabic','French','English']),
  ('d0000000-0000-4000-a000-000000000003', 15, 'contact@haddad-neuro.tn',    NULL,                         '22 Avenue Léopold Sédar Senghor, Sousse', ARRAY['Arabic','French']),
  ('d0000000-0000-4000-a000-000000000004', 9,  'dr.trabelsi@pediatrie.tn',   'https://trabelsi-pediatrie.tn', '8 Rue Alexandre Dumas, Sfax',          ARRAY['Arabic','French','English']),
  ('d0000000-0000-4000-a000-000000000005', 20, 'contact@gharbi-ortho.tn',    'https://gharbi-ortho.tn',    '45 Avenue de la Liberté, Tunis',          ARRAY['Arabic','French','English','Italian']),
  ('d0000000-0000-4000-a000-000000000006', 11, 'cabinet@chaabane-vision.tn', NULL,                         '5 Boulevard 14 Janvier, Sousse',          ARRAY['Arabic','French']),
  ('d0000000-0000-4000-a000-000000000007', 8,  'rdv@jelassi-dental.tn',      'https://jelassi-dental.tn',  '61 Avenue Mohamed V, Tunis',              ARRAY['Arabic','French','English']),
  ('d0000000-0000-4000-a000-000000000008', 14, 'contact@baccouche-orl.tn',   NULL,                         '19 Rue Habib Maazoun, Sfax',              ARRAY['Arabic','French']),
  ('d0000000-0000-4000-a000-000000000009', 10, 'cabinet@meddeb-derma.tn',    'https://meddeb-derma.tn',    '27 Rue de Rome, Tunis',                   ARRAY['Arabic','French','English']),
  ('d0000000-0000-4000-a000-000000000010', 22, 'dr.ayari@famille.tn',        NULL,                         '2 Avenue Taieb Mhiri, Bizerte',           ARRAY['Arabic','French']),
  ('d0000000-0000-4000-a000-000000000011', 13, 'contact@bouzid-gyneco.tn',   'https://bouzid-gyneco.tn',   '30 Rue Ibn Khaldoun, Ariana',             ARRAY['Arabic','French','English']),
  ('d0000000-0000-4000-a000-000000000012', 16, 'cabinet@msakni-psy.tn',      NULL,                         '11 Rue du Lac Léman, Tunis',              ARRAY['Arabic','French','English']),
  ('d0000000-0000-4000-a000-000000000013', 12, 'contact@ferchichi-endo.tn',  NULL,                         '7 Avenue de l''Environnement, Monastir',  ARRAY['Arabic','French']),
  ('d0000000-0000-4000-a000-000000000014', 17, 'cabinet@kacem-uro.tn',       'https://kacem-uro.tn',       '40 Route de Tunis, Sfax',                 ARRAY['Arabic','French','English']),
  ('d0000000-0000-4000-a000-000000000015', 19, 'contact@zouari-gastro.tn',   NULL,                         '16 Rue Constantine, Sousse',              ARRAY['Arabic','French','English']),
  ('d0000000-0000-4000-a000-000000000016', 10, 'cabinet@rebai-pneumo.tn',    NULL,                         '9 Avenue Farhat Hached, Gabès',           ARRAY['Arabic','French']),
  ('d0000000-0000-4000-a000-000000000017', 14, 'contact@gharsallah-rhumato.tn', NULL,                      '25 Avenue Habib Thameur, Nabeul',         ARRAY['Arabic','French','English']),
  ('d0000000-0000-4000-a000-000000000018', 21, 'cabinet@bouslama-cardio.tn', 'https://bouslama-cardio.tn', '52 Avenue Majida Boulila, Sfax',          ARRAY['Arabic','French','English','German']),
  ('d0000000-0000-4000-a000-000000000019', 7,  'rdv@belhadj-derma.tn',       'https://belhadj-derma.tn',   '4 Rue du Golfe, La Marsa',                ARRAY['Arabic','French','English']),
  ('d0000000-0000-4000-a000-000000000020', 6,  'dr.hammami@pediatrie.tn',    NULL,                         '13 Avenue de la République, Kairouan',    ARRAY['Arabic','French'])
) AS v(id, years, email, website, address, langs)
WHERE d.id = v.id::uuid;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Clinic posts. Deliberately partial — doctors 6, 10, 13, 16, 19, 20
--    hold none, so the "independent practice" state is visible too.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO doctor_clinics (doctor_id, clinic_name, role, city, start_year, end_year)
SELECT v.doctor_id::uuid, v.clinic_name, v.role, v.city, v.start_year, v.end_year
FROM (VALUES
  ('d0000000-0000-4000-a000-000000000001', 'Clinique El Amen',            'Attending General Practitioner',   'Tunis',    2016, NULL),
  ('d0000000-0000-4000-a000-000000000001', 'Hôpital Charles Nicolle',     'Resident, Internal Medicine',      'Tunis',    2013, 2016),
  ('d0000000-0000-4000-a000-000000000002', 'Clinique Les Jasmins',        'Head of Cardiology',               'Tunis',    2018, NULL),
  ('d0000000-0000-4000-a000-000000000002', 'Hôpital La Rabta',            'Cardiology Fellow',                'Tunis',    2010, 2018),
  ('d0000000-0000-4000-a000-000000000003', 'Hôpital Sahloul',             'Consultant Neurologist',           'Sousse',   2015, NULL),
  ('d0000000-0000-4000-a000-000000000004', 'Clinique Ennasr',             'Attending Pediatrician',           'Sfax',     2019, NULL),
  ('d0000000-0000-4000-a000-000000000005', 'Clinique Hannibal',           'Orthopedic Surgeon',               'Tunis',    2014, NULL),
  ('d0000000-0000-4000-a000-000000000005', 'Clinique Taoufik',            'Associate Surgeon',                'Tunis',    2008, 2014),
  ('d0000000-0000-4000-a000-000000000007', 'Centre Dentaire Al Manar',    'Practice Partner',                 'Tunis',    2019, NULL),
  ('d0000000-0000-4000-a000-000000000008', 'CHU Habib Bourguiba',         'ENT Consultant',                   'Sfax',     2013, NULL),
  ('d0000000-0000-4000-a000-000000000009', 'Clinique Alyssa',             'Consultant Dermatologist',         'Tunis',    2020, NULL),
  ('d0000000-0000-4000-a000-000000000011', 'Clinique Ennasr',             'Obstetrics & Gynecology',          'Ariana',   2017, NULL),
  ('d0000000-0000-4000-a000-000000000012', 'Clinique Les Berges du Lac',  'Consultant Psychiatrist',          'Tunis',    2016, NULL),
  ('d0000000-0000-4000-a000-000000000014', 'Polyclinique Ibn Nafis',      'Head of Urology',                  'Sfax',     2015, NULL),
  ('d0000000-0000-4000-a000-000000000015', 'Clinique Les Oliviers',       'Consultant Gastroenterologist',    'Sousse',   2012, NULL),
  ('d0000000-0000-4000-a000-000000000017', 'Clinique Cap Bon',            'Rheumatology Consultant',          'Nabeul',   2018, NULL),
  ('d0000000-0000-4000-a000-000000000018', 'Clinique Ibn Rochd',          'Interventional Cardiologist',      'Sfax',     2011, NULL),
  ('d0000000-0000-4000-a000-000000000018', 'Hôpital Farhat Hached',       'Cardiology Registrar',             'Sousse',   2006, 2011)
) AS v(doctor_id, clinic_name, role, city, start_year, end_year)
WHERE NOT EXISTS (
  SELECT 1 FROM doctor_clinics c
  WHERE c.doctor_id = v.doctor_id::uuid
    AND c.clinic_name = v.clinic_name
    AND c.role IS NOT DISTINCT FROM v.role
);
