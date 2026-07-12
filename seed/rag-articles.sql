-- MediConnect — RAG: article chunk embeddings for the health assistant
-- Run this in the Supabase SQL Editor AFTER community.sql and
-- articles-bilingual.sql (it references the articles table + its FR columns).
-- Safe to re-run (idempotent).
--
-- This is Phase 1 of the RAG build (see RAG.md): the storage layer for the
-- doctor-article health assistant. It adds:
--   1. the pgvector extension (semantic vector search inside Postgres)
--   2. an article_chunks table: one row per chunk of an article, per language,
--      holding the chunk text + its 384-dim embedding
--   3. an HNSW index for fast approximate nearest-neighbour search
--   4. a match_article_chunks() function called from the server via Supabase RPC
--
-- The embedding dimension is 384 because the embedding model is
-- intfloat/multilingual-e5-small (see RAG.md Phase 0). If you ever switch
-- embedding models the whole corpus must be re-embedded AND this dimension
-- must change to match — the two are locked together.

-- ─────────────────────────────────────────────────────────────────────
-- 1. pgvector (Supabase ships it; enable into the extensions schema)
-- ─────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Chunk store. One article becomes several chunks, and each language
--    (en / fr) is embedded and stored separately so a French question can
--    retrieve French text and cite it cleanly.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_chunks (
  id          BIGSERIAL PRIMARY KEY,
  article_id  BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,                    -- position within the article
  lang        TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'fr')),
  content     TEXT NOT NULL,                   -- the plain chunk text
  embedding   VECTOR(384),                     -- multilingual-e5-small output
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- Re-running ingestion for an article upserts its chunks instead of duplicating.
  UNIQUE (article_id, lang, chunk_index)
);

-- Approximate nearest-neighbour index for the cosine-distance search.
-- HNSW is a good default on Supabase; builds instantly on an empty table.
CREATE INDEX IF NOT EXISTS idx_article_chunks_embedding
  ON article_chunks USING hnsw (embedding vector_cosine_ops);

-- Helps ON DELETE CASCADE and per-article re-ingestion lookups.
CREATE INDEX IF NOT EXISTS idx_article_chunks_article
  ON article_chunks (article_id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Row Level Security
--    Chunks are derived from already-public articles, so: public read.
--    No INSERT/UPDATE/DELETE policy → only the service_role key (the Express
--    server, which bypasses RLS) can write them. Ingestion runs server-side.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE article_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read article chunks" ON article_chunks;
CREATE POLICY "Public can read article chunks"
  ON article_chunks FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────
-- 4. Similarity search function (called via supabase.rpc('match_article_chunks'))
--    <=> is pgvector's cosine-distance operator: smaller = more similar, so we
--    return (1 - distance) as a 0..1 similarity score the app can threshold on.
--    filter_lang NULL searches every language (e5 matches cross-lingually);
--    pass 'fr' or 'en' to restrict retrieval to one language.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_article_chunks(
  query_embedding VECTOR(384),
  match_count     INT DEFAULT 5,
  filter_lang     TEXT DEFAULT NULL
)
RETURNS TABLE (
  id          BIGINT,
  article_id  BIGINT,
  chunk_index INT,
  lang        TEXT,
  content     TEXT,
  similarity  FLOAT
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    ac.id,
    ac.article_id,
    ac.chunk_index,
    ac.lang,
    ac.content,
    1 - (ac.embedding <=> query_embedding) AS similarity
  FROM article_chunks ac
  WHERE filter_lang IS NULL OR ac.lang = filter_lang
  ORDER BY ac.embedding <=> query_embedding
  LIMIT match_count;
$$;
