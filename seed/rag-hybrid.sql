-- MediConnect — RAG: hybrid retrieval over article chunks.
-- Run in the Supabase SQL Editor after rag-articles.sql. Safe to re-run.
--
-- Pure vector search misses exact terms (drug names, specific words) and its
-- similarity scores sit in a narrow band. Hybrid search runs a full-text
-- keyword search alongside the vector search and fuses the two rankings with
-- Reciprocal Rank Fusion (RRF) — a robust, scale-free way to combine them that
-- doesn't require tuning weights between cosine distance and ts_rank.
--
-- 'simple' text search config = tokenize without stemming/stopword removal,
-- which is the safe choice for a bilingual (EN + FR) corpus.

-- Full-text index for the keyword arm.
CREATE INDEX IF NOT EXISTS idx_article_chunks_fts
  ON article_chunks USING gin (to_tsvector('simple', content));

CREATE OR REPLACE FUNCTION hybrid_match_article_chunks(
  query_text      TEXT,
  query_embedding VECTOR(384),
  match_count     INT DEFAULT 5,
  filter_lang     TEXT DEFAULT NULL,
  rrf_k           INT DEFAULT 50,   -- RRF damping constant
  pool            INT DEFAULT 40    -- candidates pulled from each arm before fusing
)
RETURNS TABLE (
  id          BIGINT,
  article_id  BIGINT,
  chunk_index INT,
  lang        TEXT,
  content     TEXT,
  similarity  FLOAT   -- true cosine similarity of the result (for thresholds)
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH semantic AS (
    SELECT ac.id,
           row_number() OVER (ORDER BY ac.embedding <=> query_embedding) AS rank
    FROM article_chunks ac
    WHERE ac.embedding IS NOT NULL
      AND (filter_lang IS NULL OR ac.lang = filter_lang)
    ORDER BY ac.embedding <=> query_embedding
    LIMIT pool
  ),
  keyword AS (
    SELECT ac.id,
           row_number() OVER (ORDER BY ts_rank(to_tsvector('simple', ac.content), q) DESC) AS rank
    FROM article_chunks ac, websearch_to_tsquery('simple', query_text) q
    WHERE (filter_lang IS NULL OR ac.lang = filter_lang)
      AND to_tsvector('simple', ac.content) @@ q
    ORDER BY ts_rank(to_tsvector('simple', ac.content), q) DESC
    LIMIT pool
  ),
  fused AS (
    SELECT COALESCE(s.id, k.id) AS id,
           COALESCE(1.0 / (rrf_k + s.rank), 0.0) + COALESCE(1.0 / (rrf_k + k.rank), 0.0) AS score
    FROM semantic s
    FULL OUTER JOIN keyword k ON s.id = k.id
  )
  SELECT ac.id, ac.article_id, ac.chunk_index, ac.lang, ac.content,
         (1 - (ac.embedding <=> query_embedding))::float AS similarity
  FROM fused f
  JOIN article_chunks ac ON ac.id = f.id
  ORDER BY f.score DESC
  LIMIT match_count;
$$;
