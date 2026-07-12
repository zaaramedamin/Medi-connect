import { InferenceClient } from '@huggingface/inference';

let client: InferenceClient | null = null;

/**
 * The shared Hugging Face inference client. Created lazily and reused, so the
 * HF_TOKEN is validated in exactly one place (embeddings + generation both
 * go through here).
 */
export function getHfClient(): InferenceClient {
  const token = process.env.HF_TOKEN;
  if (!token || token.includes('xxxx')) {
    throw new Error(
      'HF_TOKEN is missing. Create a free "Read" token at ' +
        'huggingface.co/settings/tokens and add HF_TOKEN=... to server/.env (see RAG.md Phase 0).'
    );
  }
  if (!client) client = new InferenceClient(token);
  return client;
}

function isRetryable(err: unknown): boolean {
  const e = err as { status?: number; httpResponse?: { status?: number }; message?: string };
  const status = e?.status ?? e?.httpResponse?.status;
  const msg = (e?.message ?? '').toLowerCase();
  return (
    status === 429 || status === 502 || status === 503 || status === 504 ||
    msg.includes('429') || msg.includes('rate limit') || msg.includes('too many') ||
    msg.includes('503') || msg.includes('502') || msg.includes('overloaded') ||
    msg.includes('temporarily') || msg.includes('timeout') || msg.includes('econnreset')
  );
}

/**
 * Retry transient Hugging Face failures (free-tier rate limits, provider
 * hiccups) with a short exponential backoff. Non-retryable errors (bad token,
 * unknown model) throw immediately.
 */
export async function withHfRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt)); // 500ms, then 1s
      attempt++;
    }
  }
}
