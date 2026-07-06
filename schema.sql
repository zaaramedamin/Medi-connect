-- MediConnect Database Schema
-- Run this in the Supabase SQL Editor (Settings → SQL Editor)
-- Enable Row Level Security on each table after running.

-- NOTE: auth.users is managed by Supabase Auth.
-- Use auth.uid() in RLS policies to reference the logged-in user.

-- Doctors Table
-- References auth.users via UUID id (doctors register via Supabase Auth with role='doctor')
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    phone VARCHAR(50),
    location VARCHAR(255),
    specialty VARCHAR(255),
    cost DECIMAL(10, 2) CHECK (cost >= 0),
    photos_url TEXT,
    working_hours_start TIME,
    working_hours_end TIME,
    avg_consultation_time INT CHECK (avg_consultation_time BETWEEN 10 AND 240), -- minutes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    time_slot TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'online')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent double-booking
    UNIQUE (doctor_id, time_slot, status)
);

-- Blocked Slots Table (doctor marks unavailable times)
CREATE TABLE IF NOT EXISTS blocked_slots (
    id BIGSERIAL PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- Appointment Reminders Log
CREATE TABLE IF NOT EXISTS reminder_logs (
    id BIGSERIAL PRIMARY KEY,
    appointment_id BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('24hour', '2hour', 'atTime')),
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments (user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_time_slot ON appointments (time_slot);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_doctor_id ON blocked_slots (doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors (specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_location ON doctors (location);

-- =====================================================================
-- Row Level Security (RLS) — run after creating tables
-- =====================================================================

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- Doctors: public read, own write
CREATE POLICY "Public can read doctors" ON doctors FOR SELECT USING (true);
CREATE POLICY "Doctor can update own profile" ON doctors FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Doctor can insert own profile" ON doctors FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Doctor can delete own profile" ON doctors FOR DELETE USING (auth.uid() = id);

-- Appointments: owner or doctor can read; patients insert; owner can cancel
CREATE POLICY "Patient sees own appointments" ON appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Doctor sees own appointments" ON appointments FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "Authenticated patient can book" ON appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can cancel appointment" ON appointments FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = doctor_id);

-- Blocked slots: doctor manages own
CREATE POLICY "Doctor manages own blocked slots" ON blocked_slots FOR ALL USING (auth.uid() = doctor_id);
CREATE POLICY "Public can read blocked slots" ON blocked_slots FOR SELECT USING (true);
