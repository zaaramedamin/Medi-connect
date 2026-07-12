-- MediConnect — RAG: shop product embeddings for the product advisor
-- (RAG idea D). Run in the Supabase SQL Editor after schema/seed.
-- Safe to re-run (idempotent).
--
-- The 14 shop products are static (client/src/data/products.ts). Their
-- embeddings are written server-side by `npm run ingest:products`; the advisor
-- embeds the shopper's need and ranks products by cosine similarity via
-- match_products(). Nothing client-side reads this table (recommendations go
-- through the server), so it stays service-role only.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS product_embeddings (
  id         TEXT PRIMARY KEY,            -- product slug (e.g. 'digital-thermometer')
  name       TEXT NOT NULL,
  content    TEXT NOT NULL,               -- the embedded product text
  embedding  VECTOR(384),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_embeddings_embedding
  ON product_embeddings USING hnsw (embedding vector_cosine_ops);

-- Server-only: RLS on, no policies → only the service_role key can read/write.
ALTER TABLE product_embeddings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION match_products(
  query_embedding VECTOR(384),
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  id         TEXT,
  name       TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT p.id, p.name, 1 - (p.embedding <=> query_embedding) AS similarity
  FROM product_embeddings p
  WHERE p.embedding IS NOT NULL
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;
