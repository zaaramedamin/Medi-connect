-- MediConnect — Parapharmacie orders
-- Run this in the Supabase SQL Editor AFTER schema.sql. Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Orders table (demo checkout — no payment processing)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  -- Snapshot of the bag at checkout: [{id, name, price, quantity, image}]
  items JSONB NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  shipping NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Row Level Security — owners read their own orders; writes go
--    through the API (service role), so no insert/update policies.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can read own orders" ON orders;
CREATE POLICY "Owner can read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
