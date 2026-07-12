import { supabaseAdmin } from '../config/supabase';
import { embedQuery } from './embeddings';

export interface RetrievedChunk {
  id: number;
  article_id: number;
  chunk_index: number;
  lang: 'en' | 'fr';
  content: string;
  similarity: number; // 0..1 cosine similarity (higher = closer)
}

export interface RetrieveOptions {
  lang?: 'en' | 'fr' | null; // restrict retrieval to one language (null = all)
  limit?: number; // top-k, default 5, clamped 1..10
}

/**
 * The "retrieval" half of RAG — no LLM involved. Embeds the question with the
 * same model used at ingest time (query prefix), then asks Postgres for the
 * most semantically similar article chunks via match_article_chunks().
 */
export async function retrieveChunks(
  question: string,
  opts: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const limit = Math.min(Math.max(opts.limit ?? 5, 1), 10);
  const queryEmbedding = await embedQuery(question);

  const { data, error } = await supabaseAdmin.rpc('match_article_chunks', {
    // pgvector param wants the "[...]" text form (see toVector note in embeddings.ts)
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: limit,
    filter_lang: opts.lang ?? null,
  });

  if (error) throw new Error(`Retrieval failed: ${error.message}`);
  return (data ?? []) as RetrievedChunk[];
}
