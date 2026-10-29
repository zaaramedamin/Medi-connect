// Google Gemini client (free tier): chat completions through the
// OpenAI-compatible endpoint, embeddings through the native embedContent API.
// One GEMINI_API_KEY (aistudio.google.com/apikey) powers the whole assistant.

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

export const DEFAULT_CHAT_MODEL = 'gemini-3.1-flash-lite';
export const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatParams {
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  temperature: number;
}

interface ChatCompletion {
  choices?: { message?: { content?: string | null } }[];
}

class GeminiHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY is missing. Create a free key at aistudio.google.com/apikey and add GEMINI_API_KEY=... to server/.env.'
    );
  }
  return key;
}

async function post<T>(url: string, body: unknown, authHeader: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new GeminiHttpError(res.status, `Gemini request failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as T;
}

/** One chat completion (grounded answers, general mode, product advisor). */
export function chatCompletion(params: ChatParams): Promise<ChatCompletion> {
  // The OpenAI-compatible endpoint wants a Bearer token...
  return post<ChatCompletion>(`${API_ROOT}/openai/chat/completions`, params, {
    Authorization: `Bearer ${apiKey()}`,
  });
}

export type EmbedTask = 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT';

/**
 * Embed text into `dimensions` floats. Gemini embeddings are only unit-length at
 * the full 3072 dimensions, so the truncated vector is re-normalized — pgvector
 * cosine search expects it.
 */
export async function embedContent(
  model: string,
  text: string,
  task: EmbedTask,
  dimensions: number
): Promise<number[]> {
  const data = await post<{ embedding?: { values?: number[] } }>(
    `${API_ROOT}/models/${model}:embedContent`,
    {
      model: `models/${model}`,
      content: { parts: [{ text }] },
      taskType: task,
      outputDimensionality: dimensions,
    },
    // ...while the native API rejects Bearer and reads the key from this header.
    { 'x-goog-api-key': apiKey() }
  );
  const values = data.embedding?.values;
  if (!values || values.length !== dimensions) {
    throw new Error(`Unexpected embedding size ${values?.length ?? 0} (expected ${dimensions}).`);
  }
  const norm = Math.sqrt(values.reduce((s, v) => s + v * v, 0)) || 1;
  return values.map((v) => v / norm);
}

function isRetryable(err: unknown): boolean {
  const status = (err as GeminiHttpError)?.status;
  if (status) return status === 429 || status >= 500;
  const msg = ((err as Error)?.message ?? '').toLowerCase();
  return msg.includes('timeout') || msg.includes('aborted') || msg.includes('fetch failed');
}

/**
 * Retry transient failures (free-tier rate limits, provider hiccups) with an
 * exponential backoff. Non-retryable errors (bad key, unknown model) throw
 * immediately.
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt)); // 500ms, 1s, 2s, ...
      attempt++;
    }
  }
}
