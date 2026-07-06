-- MediConnect — Test Data Seed (v2)
-- Run this in the Supabase SQL Editor AFTER running schema.sql.
-- Safe to re-run: every insert is guarded, existing rows are kept.
--
-- Creates 20 doctors + 8 patients as real Auth users (so you can log in),
-- full doctor profiles with photos, patient avatars, appointments
-- (upcoming, completed, cancelled), blocked slots, and reminder logs.
--
-- Every account uses the same password:  Test1234

-- ─────────────────────────────────────────────────────────────────────
-- 1. Auth users (doctors d0…001→020, patients a0…001→008)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  u.id::uuid,
  'authenticated',
  'authenticated',
  u.email,
  crypt('Test1234', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', u.name, 'role', u.user_role, 'avatar_url', u.avatar),
  now(), now(), '', '', '', ''
FROM (VALUES
  -- Doctors
  ('d0000000-0000-4000-a000-000000000001', 'amine.benali@test.com',     'Dr. Amine Ben Ali',     'doctor',  'https://randomuser.me/api/portraits/men/32.jpg'),
  ('d0000000-0000-4000-a000-000000000002', 'sarra.mansouri@test.com',   'Dr. Sarra Mansouri',    'doctor',  'https://randomuser.me/api/portraits/women/44.jpg'),
  ('d0000000-0000-4000-a000-000000000003', 'karim.haddad@test.com',     'Dr. Karim Haddad',      'doctor',  'https://randomuser.me/api/portraits/men/45.jpg'),
  ('d0000000-0000-4000-a000-000000000004', 'leila.trabelsi@test.com',   'Dr. Leila Trabelsi',    'doctor',  'https://randomuser.me/api/portraits/women/68.jpg'),
  ('d0000000-0000-4000-a000-000000000005', 'mehdi.gharbi@test.com',     'Dr. Mehdi Gharbi',      'doctor',  'https://randomuser.me/api/portraits/men/22.jpg'),
  ('d0000000-0000-4000-a000-000000000006', 'ines.chaabane@test.com',    'Dr. Ines Chaabane',     'doctor',  'https://randomuser.me/api/portraits/women/12.jpg'),
  ('d0000000-0000-4000-a000-000000000007', 'youssef.jelassi@test.com',  'Dr. Youssef Jelassi',   'doctor',  'https://randomuser.me/api/portraits/men/76.jpg'),
  ('d0000000-0000-4000-a000-000000000008', 'nour.baccouche@test.com',   'Dr. Nour Baccouche',    'doctor',  'https://randomuser.me/api/portraits/women/26.jpg'),
  ('d0000000-0000-4000-a000-000000000009', 'rania.meddeb@test.com',     'Dr. Rania Meddeb',      'doctor',  'https://randomuser.me/api/portraits/women/65.jpg'),
  ('d0000000-0000-4000-a000-000000000010', 'slim.ayari@test.com',       'Dr. Slim Ayari',        'doctor',  'https://randomuser.me/api/portraits/men/51.jpg'),
  ('d0000000-0000-4000-a000-000000000011', 'hela.bouzid@test.com',      'Dr. Hela Bouzid',       'doctor',  'https://randomuser.me/api/portraits/women/33.jpg'),
  ('d0000000-0000-4000-a000-000000000012', 'walid.msakni@test.com',     'Dr. Walid Msakni',      'doctor',  'https://randomuser.me/api/portraits/men/64.jpg'),
  ('d0000000-0000-4000-a000-000000000013', 'asma.ferchichi@test.com',   'Dr. Asma Ferchichi',    'doctor',  'https://randomuser.me/api/portraits/women/50.jpg'),
  ('d0000000-0000-4000-a000-000000000014', 'bilel.kacem@test.com',      'Dr. Bilel Kacem',       'doctor',  'https://randomuser.me/api/portraits/men/14.jpg'),
  ('d0000000-0000-4000-a000-000000000015', 'mariem.zouari@test.com',    'Dr. Mariem Zouari',     'doctor',  'https://randomuser.me/api/portraits/women/72.jpg'),
  ('d0000000-0000-4000-a000-000000000016', 'hatem.rebai@test.com',      'Dr. Hatem Rebai',       'doctor',  'https://randomuser.me/api/portraits/men/85.jpg'),
  ('d0000000-0000-4000-a000-000000000017', 'emna.gharsallah@test.com',  'Dr. Emna Gharsallah',   'doctor',  'https://randomuser.me/api/portraits/women/89.jpg'),
  ('d0000000-0000-4000-a000-000000000018', 'tarek.bouslama@test.com',   'Dr. Tarek Bouslama',    'doctor',  'https://randomuser.me/api/portraits/men/29.jpg'),
  ('d0000000-0000-4000-a000-000000000019', 'syrine.belhadj@test.com',   'Dr. Syrine Belhadj',    'doctor',  'https://randomuser.me/api/portraits/women/17.jpg'),
  ('d0000000-0000-4000-a000-000000000020', 'fares.hammami@test.com',    'Dr. Fares Hammami',     'doctor',  'https://randomuser.me/api/portraits/men/40.jpg'),
  -- Patients
  ('a0000000-0000-4000-a000-000000000001', 'mohamed.sassi@test.com',    'Mohamed Sassi',         'patient', 'https://randomuser.me/api/portraits/men/11.jpg'),
  ('a0000000-0000-4000-a000-000000000002', 'fatma.khelifi@test.com',    'Fatma Khelifi',         'patient', 'https://randomuser.me/api/portraits/women/47.jpg'),
  ('a0000000-0000-4000-a000-000000000003', 'omar.dridi@test.com',       'Omar Dridi',            'patient', 'https://randomuser.me/api/portraits/men/59.jpg'),
  ('a0000000-0000-4000-a000-000000000004', 'aya.benromdhane@test.com',  'Aya Ben Romdhane',      'patient', 'https://randomuser.me/api/portraits/women/25.jpg'),
  ('a0000000-0000-4000-a000-000000000005', 'seif.karray@test.com',      'Seif Eddine Karray',    'patient', 'https://randomuser.me/api/portraits/men/36.jpg'),
  ('a0000000-0000-4000-a000-000000000006', 'rim.jebali@test.com',       'Rim Jebali',            'patient', 'https://randomuser.me/api/portraits/women/57.jpg'),
  ('a0000000-0000-4000-a000-000000000007', 'anis.chatti@test.com',      'Anis Chatti',           'patient', 'https://randomuser.me/api/portraits/men/68.jpg'),
  ('a0000000-0000-4000-a000-000000000008', 'salma.guesmi@test.com',     'Salma Guesmi',          'patient', 'https://randomuser.me/api/portraits/women/81.jpg')
) AS u(id, email, name, user_role, avatar)
ON CONFLICT (id) DO NOTHING;

-- Backfill avatar_url for users created by an earlier seed run
UPDATE auth.users au
SET raw_user_meta_data = au.raw_user_meta_data || jsonb_build_object('avatar_url', v.avatar)
FROM (VALUES
  ('mohamed.sassi@test.com',  'https://randomuser.me/api/portraits/men/11.jpg'),
  ('fatma.khelifi@test.com',  'https://randomuser.me/api/portraits/women/47.jpg'),
  ('omar.dridi@test.com',     'https://randomuser.me/api/portraits/men/59.jpg')
) AS v(email, avatar)
WHERE au.email = v.email AND au.raw_user_meta_data->>'avatar_url' IS NULL;

-- Identities (required for email/password login)
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
  now(), now(), now()
FROM auth.users u
WHERE u.email LIKE '%@test.com'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
  );

-- ─────────────────────────────────────────────────────────────────────
-- 2. Doctor profiles (all columns filled)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO doctors (id, name, description, phone, location, specialty, cost, photos_url, working_hours_start, working_hours_end, avg_consultation_time)
VALUES
  ('d0000000-0000-4000-a000-000000000001', 'Dr. Amine Ben Ali',    'General practitioner with 12 years of experience. Focus on preventive care and chronic disease management.',  '+21620111001', 'Tunis',    'General Medicine', 45, 'https://randomuser.me/api/portraits/men/32.jpg',   '08:00', '17:00', 30),
  ('d0000000-0000-4000-a000-000000000002', 'Dr. Sarra Mansouri',   'Cardiologist specialized in hypertension, arrhythmia, and cardiac imaging. ESC member.',                     '+21620111002', 'Tunis',    'Cardiology',       90, 'https://randomuser.me/api/portraits/women/44.jpg', '09:00', '18:00', 30),
  ('d0000000-0000-4000-a000-000000000003', 'Dr. Karim Haddad',     'Neurologist treating migraines, epilepsy, and movement disorders. University hospital background.',          '+21620111003', 'Sousse',   'Neurology',        85, 'https://randomuser.me/api/portraits/men/45.jpg',   '09:00', '16:00', 45),
  ('d0000000-0000-4000-a000-000000000004', 'Dr. Leila Trabelsi',   'Pediatrician passionate about child development, vaccination, and newborn care.',                             '+21620111004', 'Sfax',     'Pediatrics',       50, 'https://randomuser.me/api/portraits/women/68.jpg', '08:30', '16:30', 20),
  ('d0000000-0000-4000-a000-000000000005', 'Dr. Mehdi Gharbi',     'Orthopedic surgeon focused on sports injuries, joint replacement, and arthroscopy.',                          '+21620111005', 'Tunis',    'Orthopedics',      80, 'https://randomuser.me/api/portraits/men/22.jpg',   '10:00', '18:00', 30),
  ('d0000000-0000-4000-a000-000000000006', 'Dr. Ines Chaabane',    'Ophthalmologist performing cataract surgery, glaucoma care, and pediatric eye exams.',                        '+21620111006', 'Sousse',   'Ophthalmology',    70, 'https://randomuser.me/api/portraits/women/12.jpg', '08:00', '15:00', 20),
  ('d0000000-0000-4000-a000-000000000007', 'Dr. Youssef Jelassi',  'Dentist offering general dentistry, implants, and cosmetic treatments in a modern clinic.',                   '+21620111007', 'Tunis',    'Dentistry',        60, 'https://randomuser.me/api/portraits/men/76.jpg',   '09:00', '19:00', 30),
  ('d0000000-0000-4000-a000-000000000008', 'Dr. Nour Baccouche',   'ENT specialist treating sinus disorders, hearing loss, and sleep apnea for adults and children.',             '+21620111008', 'Sfax',     'ENT',              65, 'https://randomuser.me/api/portraits/women/26.jpg', '08:30', '17:30', 25),
  ('d0000000-0000-4000-a000-000000000009', 'Dr. Rania Meddeb',     'Dermatologist specialized in acne, eczema, skin cancer screening, and aesthetic dermatology.',                '+21620111009', 'Tunis',    'Dermatology',      75, 'https://randomuser.me/api/portraits/women/65.jpg', '10:00', '17:00', 20),
  ('d0000000-0000-4000-a000-000000000010', 'Dr. Slim Ayari',       'Family doctor providing full check-ups, minor procedures, and home visit consultations.',                     '+21620111010', 'Bizerte',  'General Medicine', 40, 'https://randomuser.me/api/portraits/men/51.jpg',   '08:00', '14:00', 30),
  ('d0000000-0000-4000-a000-000000000011', 'Dr. Hela Bouzid',      'Gynecologist-obstetrician providing prenatal care, fertility consultations, and routine screenings.',         '+21620111011', 'Ariana',   'Gynecology',       70, 'https://randomuser.me/api/portraits/women/33.jpg', '09:00', '17:00', 30),
  ('d0000000-0000-4000-a000-000000000012', 'Dr. Walid Msakni',     'Psychiatrist treating anxiety, depression, and sleep disorders. Cognitive behavioral therapy certified.',      '+21620111012', 'Tunis',    'Psychiatry',       90, 'https://randomuser.me/api/portraits/men/64.jpg',   '10:00', '18:00', 45),
  ('d0000000-0000-4000-a000-000000000013', 'Dr. Asma Ferchichi',   'Endocrinologist specialized in diabetes, thyroid disorders, and hormonal imbalance management.',              '+21620111013', 'Monastir', 'Endocrinology',    75, 'https://randomuser.me/api/portraits/women/50.jpg', '08:30', '16:00', 30),
  ('d0000000-0000-4000-a000-000000000014', 'Dr. Bilel Kacem',      'Urologist performing kidney stone treatment, prostate care, and minimally invasive surgery.',                 '+21620111014', 'Sfax',     'Urology',          80, 'https://randomuser.me/api/portraits/men/14.jpg',   '09:00', '17:00', 30),
  ('d0000000-0000-4000-a000-000000000015', 'Dr. Mariem Zouari',    'Gastroenterologist specialized in digestive disorders, endoscopy, and liver disease.',                        '+21620111015', 'Sousse',   'Gastroenterology', 85, 'https://randomuser.me/api/portraits/women/72.jpg', '08:00', '16:00', 30),
  ('d0000000-0000-4000-a000-000000000016', 'Dr. Hatem Rebai',      'Pulmonologist treating asthma, COPD, and respiratory infections. Sleep study specialist.',                    '+21620111016', 'Gabès',    'Pulmonology',      70, 'https://randomuser.me/api/portraits/men/85.jpg',   '09:00', '15:00', 30),
  ('d0000000-0000-4000-a000-000000000017', 'Dr. Emna Gharsallah',  'Rheumatologist managing arthritis, osteoporosis, and autoimmune joint diseases.',                             '+21620111017', 'Nabeul',   'Rheumatology',     75, 'https://randomuser.me/api/portraits/women/89.jpg', '10:00', '18:00', 45),
  ('d0000000-0000-4000-a000-000000000018', 'Dr. Tarek Bouslama',   'Interventional cardiologist with expertise in angioplasty, stents, and heart failure care.',                  '+21620111018', 'Sfax',     'Cardiology',       95, 'https://randomuser.me/api/portraits/men/29.jpg',   '08:00', '16:00', 20),
  ('d0000000-0000-4000-a000-000000000019', 'Dr. Syrine Belhadj',   'Dermatologist offering laser treatments, mole mapping, and pediatric dermatology.',                           '+21620111019', 'La Marsa', 'Dermatology',      80, 'https://randomuser.me/api/portraits/women/17.jpg', '11:00', '19:00', 20),
  ('d0000000-0000-4000-a000-000000000020', 'Dr. Fares Hammami',    'Pediatrician focused on infant nutrition, growth monitoring, and childhood immunization.',                    '+21620111020', 'Kairouan', 'Pediatrics',       45, 'https://randomuser.me/api/portraits/men/40.jpg',   '08:00', '14:00', 20)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Appointments — upcoming, completed (past), and cancelled
--    (times aligned to each doctor's slot grid)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO appointments (doctor_id, user_id, time_slot, status, payment_method, payment_status)
VALUES
  -- Upcoming (confirmed)
  ('d0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001', (CURRENT_DATE + 1) + TIME '09:00', 'confirmed', 'cash',   'pending'),
  ('d0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000002', (CURRENT_DATE + 1) + TIME '10:30', 'confirmed', 'online', 'paid'),
  ('d0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000001', (CURRENT_DATE + 2) + TIME '11:00', 'confirmed', 'cash',   'pending'),
  ('d0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000003', (CURRENT_DATE + 3) + TIME '09:30', 'confirmed', 'cash',   'pending'),
  ('d0000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000004', (CURRENT_DATE + 4) + TIME '09:45', 'confirmed', 'online', 'paid'),
  ('d0000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000003', (CURRENT_DATE + 3) + TIME '09:10', 'confirmed', 'cash',   'pending'),
  ('d0000000-0000-4000-a000-000000000005', 'a0000000-0000-4000-a000-000000000005', (CURRENT_DATE + 1) + TIME '16:00', 'confirmed', 'cash',   'pending'),
  ('d0000000-0000-4000-a000-000000000007', 'a0000000-0000-4000-a000-000000000002', (CURRENT_DATE + 2) + TIME '14:00', 'confirmed', 'online', 'paid'),
  ('d0000000-0000-4000-a000-000000000009', 'a0000000-0000-4000-a000-000000000006', (CURRENT_DATE + 2) + TIME '10:40', 'confirmed', 'online', 'paid'),
  ('d0000000-0000-4000-a000-000000000011', 'a0000000-0000-4000-a000-000000000007', (CURRENT_DATE + 5) + TIME '11:00', 'confirmed', 'cash',   'pending'),
  ('d0000000-0000-4000-a000-000000000018', 'a0000000-0000-4000-a000-000000000008', (CURRENT_DATE + 1) + TIME '08:40', 'confirmed', 'online', 'paid'),
  ('d0000000-0000-4000-a000-000000000012', 'a0000000-0000-4000-a000-000000000004', (CURRENT_DATE + 6) + TIME '10:45', 'confirmed', 'cash',   'pending'),
  -- Past (completed)
  ('d0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001', (CURRENT_DATE - 7)  + TIME '09:30', 'completed', 'cash',   'paid'),
  ('d0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000002', (CURRENT_DATE - 14) + TIME '11:30', 'completed', 'online', 'paid'),
  ('d0000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000004', (CURRENT_DATE - 3)  + TIME '10:10', 'completed', 'cash',   'paid'),
  ('d0000000-0000-4000-a000-000000000009', 'a0000000-0000-4000-a000-000000000005', (CURRENT_DATE - 10) + TIME '12:20', 'completed', 'online', 'paid'),
  -- Cancelled
  ('d0000000-0000-4000-a000-000000000007', 'a0000000-0000-4000-a000-000000000005', (CURRENT_DATE + 1) + TIME '15:00', 'cancelled', 'cash',   'pending'),
  ('d0000000-0000-4000-a000-000000000010', 'a0000000-0000-4000-a000-000000000006', (CURRENT_DATE - 2) + TIME '09:00', 'cancelled', 'cash',   'pending')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Blocked slots
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO blocked_slots (doctor_id, start_time, end_time)
SELECT v.doctor_id::uuid, v.start_time, v.end_time
FROM (VALUES
  ('d0000000-0000-4000-a000-000000000001', (CURRENT_DATE + 1) + TIME '12:00', (CURRENT_DATE + 1) + TIME '14:00'),
  ('d0000000-0000-4000-a000-000000000002', (CURRENT_DATE + 2) + TIME '14:00', (CURRENT_DATE + 2) + TIME '16:00'),
  ('d0000000-0000-4000-a000-000000000007', (CURRENT_DATE + 1) + TIME '12:00', (CURRENT_DATE + 1) + TIME '13:00'),
  ('d0000000-0000-4000-a000-000000000018', (CURRENT_DATE + 3) + TIME '08:00', (CURRENT_DATE + 3) + TIME '10:00')
) AS v(doctor_id, start_time, end_time)
WHERE NOT EXISTS (
  SELECT 1 FROM blocked_slots b
  WHERE b.doctor_id = v.doctor_id::uuid AND b.start_time = v.start_time
);

-- ─────────────────────────────────────────────────────────────────────
-- 5. Reminder logs (for completed appointments)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO reminder_logs (appointment_id, reminder_type, sent_at)
SELECT a.id, '24hour', a.time_slot - INTERVAL '24 hours'
FROM appointments a
WHERE a.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM reminder_logs r
    WHERE r.appointment_id = a.id AND r.reminder_type = '24hour'
  );
