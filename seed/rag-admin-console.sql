-- RAG admin console: runtime-tunable parameters + per-request logging.
-- Idempotent, server-only (service_role writes). Run manually in the Supabase
-- SQL editor, following this repo's migration convention (see RAG.md).

-- ── Runtime config overrides ─────────────────────────────────────────
-- Only *overridden* params are stored here; the defaults live in code
-- (server/src/services/ragConfig.ts). A missing key means "use the default".
CREATE TABLE IF NOT EXISTS rag_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID
);

ALTER TABLE rag_config ENABLE ROW LEVEL SECURITY;
-- No policies → only the service_role key (the server) can read/write. The
-- admin console reaches this exclusively through the authenticated API.

-- ── Per-request logs (the "terminal" feed) ───────────────────────────
CREATE TABLE IF NOT EXISTS rag_request_logs (
  id               BIGSERIAL PRIMARY KEY,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id          UUID,                 -- null = anonymous (assistant is public)
  user_email       TEXT,
  endpoint         TEXT NOT NULL,        -- 'ask' | 'search' | 'product-advice'
  mode             TEXT,                 -- 'articles' | 'general' | null
  question         TEXT,
  lang             TEXT,
  embedding_model  TEXT,
  chat_model       TEXT,
  params           JSONB,                -- snapshot of the tunables used
  retrieved_count  INT,
  top_similarity   REAL,
  grounded         BOOLEAN,
  refused          BOOLEAN,
  latency_ms       INT,
  error            TEXT
);

CREATE INDEX IF NOT EXISTS idx_rag_request_logs_created_at
  ON rag_request_logs (created_at DESC);

ALTER TABLE rag_request_logs ENABLE ROW LEVEL SECURITY;
-- No policies → server-only, same as rag_config.
