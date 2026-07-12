import { getHfClient, withHfRetry } from './hfClient';
import { supabaseAdmin } from '../config/supabase';

// The embedding model (see RAG.md Phase 0). Its output dimension (384) is
// locked to the article_chunks.embedding VECTOR(384) column — changing the
// model means changing that column AND re-embedding the whole corpus.
const EMBEDDING_MODEL = 'intfloat/multilingual-e5-small';
export const EMBEDDING_DIM = 384;

// Upper bound of words a single chunk grows to before we start a new one.
// Small enough to stay topically focused, big enough to keep a paragraph's
// surrounding context intact.
const MAX_CHUNK_WORDS = 400;

// E5 models require a task prefix on the input: "passage: " for stored
// documents and "query: " for the user's question. Skipping it measurably
// hurts retrieval quality — do not remove the prefixes.
async function embed(input: string): Promise<number[]> {
  const hf = getHfClient();
  const output = await withHfRetry(() =>
    hf.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: input,
      provider: 'hf-inference',
    })
  );
  // A single string input yields one flat vector (number[]).
  if (!Array.isArray(output) || typeof output[0] !== 'number') {
    throw new Error('Unexpected embedding shape returned by Hugging Face.');
  }
  return output as number[];
}

/** Embed a document chunk for storage (ingestion side). */
export const embedPassage = (text: string): Promise<number[]> => embed(`passage: ${text}`);

/** Embed a user question for retrieval (query side). */
export const embedQuery = (text: string): Promise<number[]> => embed(`query: ${text}`);

/**
 * Split article text into chunks. Simple paragraph-based strategy: keep
 * paragraphs together and start a new chunk once adding the next one would
 * push the current chunk past MAX_CHUNK_WORDS. Most of these articles are
 * short and become a single chunk — that's fine and keeps retrieval focused.
 */
export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';
  let currentWords = 0;

  for (const para of paragraphs) {
    const words = para.split(/\s+/).length;
    if (currentWords > 0 && currentWords + words > MAX_CHUNK_WORDS) {
      chunks.push(current);
      current = '';
      currentWords = 0;
    }
    current = current ? `${current}\n\n${para}` : para;
    currentWords += words;
  }
  if (current) chunks.push(current);
  return chunks;
}

export interface IngestableArticle {
  id: number;
  title: string;
  body: string;
  title_fr: string | null;
  body_fr: string | null;
}

// Prepend the title to the body so the article's subject is baked into the
// first chunk's embedding — titles carry strong topical signal.
const buildDoc = (title: string, body: string): string => `${title}\n\n${body}`;

// pgvector's text input format is "[0.1,0.2,...]", which is exactly what
// JSON.stringify produces for a number array. Passing the vector as this
// string (rather than a raw JS array) is the reliable way to insert through
// PostgREST — a raw array can get serialized as a Postgres array literal that
// pgvector rejects.
const toVector = (v: number[]): string => JSON.stringify(v);

/**
 * (Re)build all chunk embeddings for one article, in every language it has.
 * Deletes the article's existing chunks first so an edit that changes the
 * chunk count can't leave stale rows behind. Returns the chunk count written.
 */
export async function ingestArticle(article: IngestableArticle): Promise<number> {
  const langs: Array<{ lang: 'en' | 'fr'; title: string; body: string }> = [
    { lang: 'en', title: article.title, body: article.body },
  ];
  if (article.title_fr && article.body_fr) {
    langs.push({ lang: 'fr', title: article.title_fr, body: article.body_fr });
  }

  const rows: Array<{
    article_id: number;
    chunk_index: number;
    lang: 'en' | 'fr';
    content: string;
    embedding: string;
  }> = [];

  for (const { lang, title, body } of langs) {
    const chunks = chunkText(buildDoc(title, body));
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedPassage(chunks[i]);
      rows.push({ article_id: article.id, chunk_index: i, lang, content: chunks[i], embedding: toVector(embedding) });
    }
  }

  // Replace this article's chunks wholesale (handles chunk-count changes).
  const del = await supabaseAdmin.from('article_chunks').delete().eq('article_id', article.id);
  if (del.error) throw new Error(`Clearing old chunks for article ${article.id} failed: ${del.error.message}`);

  const { error } = await supabaseAdmin.from('article_chunks').insert(rows);
  if (error) throw new Error(`Storing chunks for article ${article.id} failed: ${error.message}`);

  return rows.length;
}

export interface IngestableDoctor {
  id: string;
  name: string;
  specialty: string | null;
  location: string | null;
  description: string | null;
}

// Embed a doctor's profile (specialty + city + bio) as one vector, so patients
// can find them by describing a need in plain language ("skin problems near
// Tunis") rather than matching exact keywords.
export async function ingestDoctor(doctor: IngestableDoctor): Promise<void> {
  const profile = [doctor.specialty, doctor.location, doctor.description]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join('. ');
  const embedding = await embedPassage(profile || doctor.name);
  const { error } = await supabaseAdmin
    .from('doctors')
    .update({ embedding: toVector(embedding) })
    .eq('id', doctor.id);
  if (error) throw new Error(`Storing embedding for doctor ${doctor.id} failed: ${error.message}`);
}

/** Re-embed a single article by id — called after it's created or edited. */
export async function reindexArticle(articleId: number): Promise<void> {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('id, title, body, title_fr, body_fr')
    .eq('id', articleId)
    .maybeSingle();
  if (data) await ingestArticle(data as unknown as IngestableArticle);
}

/** Re-embed a single doctor by id — called after their profile is created or edited. */
export async function reindexDoctor(doctorId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('doctors')
    .select('id, name, specialty, location, description')
    .eq('id', doctorId)
    .maybeSingle();
  if (data) await ingestDoctor(data as unknown as IngestableDoctor);
}

export interface IngestableProduct {
  id: string;
  name: string;
  content: string;
}

// Embed one shop product (name + description + highlights) for the advisor.
export async function ingestProduct(product: IngestableProduct): Promise<void> {
  const embedding = await embedPassage(product.content);
  const { error } = await supabaseAdmin.from('product_embeddings').upsert({
    id: product.id,
    name: product.name,
    content: product.content,
    embedding: toVector(embedding),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Storing embedding for product ${product.id} failed: ${error.message}`);
}
