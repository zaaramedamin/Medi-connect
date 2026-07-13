import { supabaseAdmin } from '../config/supabase';

/**
 * Central registry of every tunable RAG parameter. Defaults live here in code;
 * the `rag_config` table only stores admin *overrides* (see
 * seed/rag-admin-console.sql). Services read the effective value via
 * getConfig(); the admin console edits it via setParam()/resetParam().
 */

export type ParamType = 'string' | 'number' | 'enum';

export interface ParamDef {
  key: string;
  label: string;
  group: 'models' | 'chunking' | 'retrieval' | 'generation' | 'advisor';
  type: ParamType;
  default: string | number;
  min?: number; // number params
  max?: number;
  step?: number;
  options?: string[]; // enum params (free text still allowed for models)
  freeText?: boolean; // enum that also accepts an arbitrary string (model names)
  requiresReingest?: boolean; // changing it only affects future ingestion
  description: string;
}

// The embedding column is VECTOR(384); this stays locked to the model's dim.
export const EMBEDDING_DIM = 384;

export const PARAMS: ParamDef[] = [
  // ── Models ──────────────────────────────────────────────────────────
  {
    key: 'embedding_model',
    label: 'Embedding model',
    group: 'models',
    type: 'enum',
    freeText: true,
    options: [
      'intfloat/multilingual-e5-small',
      'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
    ],
    default: 'intfloat/multilingual-e5-small',
    requiresReingest: true,
    description:
      'Turns text into vectors. Changing it ONLY affects future ingests and needs a full re-embed (npm run ingest). A model with a different dimension than ' +
      EMBEDDING_DIM +
      ' will break retrieval until the VECTOR column is migrated.',
  },
  {
    key: 'chat_model',
    label: 'Generation model',
    group: 'models',
    type: 'enum',
    freeText: true,
    options: ['Qwen/Qwen2.5-7B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3'],
    default: process.env.HF_CHAT_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
    description: 'The LLM that writes the final answer. Safe to change live.',
  },

  // ── Chunking (ingestion) ────────────────────────────────────────────
  {
    key: 'chunk_max_words',
    label: 'Chunk size (max words)',
    group: 'chunking',
    type: 'number',
    default: 400,
    min: 50,
    max: 1200,
    step: 10,
    requiresReingest: true,
    description:
      'Upper bound on words per chunk at ingest time. Only affects articles embedded AFTER the change — re-run npm run ingest to apply it to existing content.',
  },

  // ── Retrieval ───────────────────────────────────────────────────────
  {
    key: 'retrieval_limit',
    label: 'Retrieval top-k',
    group: 'retrieval',
    type: 'number',
    default: 5,
    min: 1,
    max: 10,
    step: 1,
    description: 'How many chunks the vector/hybrid search returns per question.',
  },
  {
    key: 'min_top_similarity',
    label: 'Answer floor (min top similarity)',
    group: 'retrieval',
    type: 'number',
    default: 0.78,
    min: 0,
    max: 1,
    step: 0.01,
    description:
      'Below this best-cosine score the assistant refuses without spending an LLM call. Higher = stricter grounding.',
  },
  {
    key: 'cite_min_similarity',
    label: 'Citation floor',
    group: 'retrieval',
    type: 'number',
    default: 0.84,
    min: 0,
    max: 1,
    step: 0.01,
    description: 'Minimum similarity for a source to be shown as a citation under an answer.',
  },

  // ── Generation ──────────────────────────────────────────────────────
  {
    key: 'context_chunks',
    label: 'Context chunks (fed to LLM)',
    group: 'generation',
    type: 'number',
    default: 5,
    min: 1,
    max: 10,
    step: 1,
    description: 'How many retrieved chunks are placed in the prompt as grounding context.',
  },
  {
    key: 'answer_max_tokens',
    label: 'Answer max tokens',
    group: 'generation',
    type: 'number',
    default: 500,
    min: 50,
    max: 2000,
    step: 50,
    description: 'Upper bound on the length of a generated answer.',
  },
  {
    key: 'grounded_temperature',
    label: 'Grounded temperature',
    group: 'generation',
    type: 'number',
    default: 0.3,
    min: 0,
    max: 1,
    step: 0.05,
    description: 'Sampling temperature for grounded (articles-mode) answers. Low = factual.',
  },
  {
    key: 'general_temperature',
    label: 'General-mode temperature',
    group: 'generation',
    type: 'number',
    default: 0.4,
    min: 0,
    max: 1,
    step: 0.05,
    description: 'Sampling temperature for general-knowledge answers (no retrieval).',
  },

  // ── Product advisor ─────────────────────────────────────────────────
  {
    key: 'advisor_top_k',
    label: 'Advisor top-k',
    group: 'advisor',
    type: 'number',
    default: 5,
    min: 1,
    max: 10,
    step: 1,
    description: 'How many shop products the advisor retrieves before recommending.',
  },
  {
    key: 'advisor_min_similarity',
    label: 'Advisor similarity floor',
    group: 'advisor',
    type: 'number',
    default: 0.75,
    min: 0,
    max: 1,
    step: 0.01,
    description: 'Below this a product is treated as "nothing in the shop fits".',
  },
  {
    key: 'advisor_max_tokens',
    label: 'Advisor max tokens',
    group: 'advisor',
    type: 'number',
    default: 400,
    min: 50,
    max: 1500,
    step: 50,
    description: 'Upper bound on the length of a product recommendation.',
  },
  {
    key: 'advisor_temperature',
    label: 'Advisor temperature',
    group: 'advisor',
    type: 'number',
    default: 0.4,
    min: 0,
    max: 1,
    step: 0.05,
    description: 'Sampling temperature for the product advisor.',
  },
];

const PARAM_BY_KEY = new Map(PARAMS.map((p) => [p.key, p]));

export type RagConfig = Record<string, string | number>;

// Effective config = defaults with any stored overrides applied on top.
function defaults(): RagConfig {
  const out: RagConfig = {};
  for (const p of PARAMS) out[p.key] = p.default;
  return out;
}

// In-memory cache so per-request reads don't hit the DB every time. Refreshed
// on a short TTL and busted immediately after any write.
let cache: RagConfig | null = null;
let cachedAt = 0;
const TTL_MS = 30_000;

/** The effective config (defaults + overrides), cached. */
export async function getConfig(): Promise<RagConfig> {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  const merged = defaults();
  const { data, error } = await supabaseAdmin.from('rag_config').select('key, value');
  if (!error && data) {
    for (const row of data as { key: string; value: unknown }[]) {
      if (PARAM_BY_KEY.has(row.key)) merged[row.key] = row.value as string | number;
    }
  }
  // If the table doesn't exist yet, error is set — fall back to defaults silently.
  cache = merged;
  cachedAt = Date.now();
  return merged;
}

/** Force the next getConfig() to re-read from the DB. */
export function invalidateConfig(): void {
  cache = null;
  cachedAt = 0;
}

/** Coerce + validate a raw value against a param's schema. Throws on invalid. */
export function coerceValue(def: ParamDef, raw: unknown): string | number {
  if (def.type === 'number') {
    const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
    if (!Number.isFinite(n)) throw new Error(`${def.key} must be a number`);
    if (def.min !== undefined && n < def.min) throw new Error(`${def.key} must be ≥ ${def.min}`);
    if (def.max !== undefined && n > def.max) throw new Error(`${def.key} must be ≤ ${def.max}`);
    return n;
  }
  // string / enum
  const s = String(raw).trim();
  if (!s) throw new Error(`${def.key} cannot be empty`);
  if (def.type === 'enum' && !def.freeText && def.options && !def.options.includes(s)) {
    throw new Error(`${def.key} must be one of: ${def.options.join(', ')}`);
  }
  return s;
}

export function getParamDef(key: string): ParamDef | undefined {
  return PARAM_BY_KEY.get(key);
}

/** Set one parameter (validated), persist the override, bust the cache. */
export async function setParam(
  key: string,
  raw: unknown,
  adminId: string | null
): Promise<string | number> {
  const def = PARAM_BY_KEY.get(key);
  if (!def) throw new Error(`Unknown parameter: ${key}`);
  const value = coerceValue(def, raw);
  const { error } = await supabaseAdmin
    .from('rag_config')
    .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: adminId });
  if (error) throw new Error(`Failed to save ${key}: ${error.message}`);
  invalidateConfig();
  return value;
}

/** Reset one param (or all when key is omitted) back to its code default. */
export async function resetParam(key?: string): Promise<void> {
  const q = supabaseAdmin.from('rag_config').delete();
  const { error } = key ? await q.eq('key', key) : await q.neq('key', '');
  if (error) throw new Error(`Failed to reset: ${error.message}`);
  invalidateConfig();
}

export interface ParamView extends ParamDef {
  value: string | number;
  isOverridden: boolean;
}

/** Registry + current effective values + which are overridden, for the UI. */
export async function listParams(): Promise<ParamView[]> {
  const config = await getConfig();
  const { data } = await supabaseAdmin.from('rag_config').select('key');
  const overridden = new Set((data ?? []).map((r: { key: string }) => r.key));
  return PARAMS.map((p) => ({
    ...p,
    value: config[p.key],
    isOverridden: overridden.has(p.key),
  }));
}
