-- MediConnect — RAG: doctor profile embeddings for the natural-language
-- doctor finder (RAG idea C). Run in the Supabase SQL Editor after schema/seed.
-- Safe to re-run (idempotent).
--
-- A doctor profile is short, so one embedding per doctor lives directly on the
-- doctors row (no separate chunk table needed). The vector is written server
-- side by `npm run ingest:doctors`; queries embed the user's phrasing and rank
-- doctors by cosine similarity via match_doctors().

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS embedding VECTOR(384);

CREATE INDEX IF NOT EXISTS idx_doctors_embedding
  ON doctors USING hnsw (embedding vector_cosine_ops);

-- Semantic match over listable (active) doctors. Returns ids + similarity; the
-- API re-fetches the display columns and attaches ratings/coordinates.
CREATE OR REPLACE FUNCTION match_doctors(
  query_embedding VECTOR(384),
  match_count     INT DEFAULT 10
)
RETURNS TABLE (
  id         UUID,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT d.id, 1 - (d.embedding <=> query_embedding) AS similarity
  FROM doctors d
  WHERE d.embedding IS NOT NULL
    AND d.subscription_status = 'active'
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
