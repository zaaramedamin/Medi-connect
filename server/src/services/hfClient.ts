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
