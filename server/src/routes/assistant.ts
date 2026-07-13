import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { attachUserOptional } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { retrieveChunks, type RetrievedChunk } from '../services/retrieval';
import { answerQuestion } from '../services/generation';
import { adviseProducts } from '../services/productAdvisor';
import { getConfig } from '../services/ragConfig';
import { logRagRequest } from '../services/ragLog';

const router = Router();

// Capture the caller's identity when they're logged in (the assistant is
// public, so this never rejects) — used for the admin console's request log.
router.use(attachUserOptional);

// Only cite a source when retrieval was reasonably confident. e5 similarity
// sits in a narrow high band (relevant matches ~0.87+, off-topic ~0.82), so
// this bar keeps citations off a soft-refusal answer without gating the answer
// itself — that's the grounding prompt's job. Runtime-editable (cite_min_similarity).

// The best cosine similarity across a set of chunks (0 when empty).
const topSimilarity = (chunks: RetrievedChunk[]): number =>
  chunks.reduce((max, c) => Math.max(max, c.similarity), 0);

interface ArticleMeta {
  id: number;
  title: string;
  title_fr: string | null;
  cover_image: string | null;
  category: string;
}

// Fetch article metadata for a set of ids, keyed by id.
async function fetchArticleMeta(ids: number[]): Promise<Record<number, ArticleMeta>> {
  const unique = [...new Set(ids)];
  const byId: Record<number, ArticleMeta> = {};
  if (!unique.length) return byId;
  const { data } = await supabaseAdmin
    .from('articles')
    .select('id, title, title_fr, cover_image, category')
    .in('id', unique);
  for (const a of (data ?? []) as ArticleMeta[]) byId[a.id] = a;
  return byId;
}

// Pick the language-appropriate title for a chunk's source article.
const titleFor = (meta: ArticleMeta | undefined, lang: 'en' | 'fr'): string =>
  meta ? (lang === 'fr' && meta.title_fr ? meta.title_fr : meta.title) : 'Article';

// Collapse retrieved chunks to distinct source articles (best similarity per
// article), enriched for display. Used as citations under a generated answer.
async function distinctSources(chunks: RetrievedChunk[], max = 3) {
  const citeMin = Number((await getConfig()).cite_min_similarity);
  const best = new Map<number, RetrievedChunk>();
  for (const c of chunks) {
    const prev = best.get(c.article_id);
    if (!prev || c.similarity > prev.similarity) best.set(c.article_id, c);
  }
  const top = [...best.values()]
    .filter((c) => c.similarity >= citeMin)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, max);
  const meta = await fetchArticleMeta(top.map((c) => c.article_id));
  return top.map((c) => ({
    article_id: c.article_id,
    title: titleFor(meta[c.article_id], c.lang),
    category: meta[c.article_id]?.category ?? null,
    cover_image: meta[c.article_id]?.cover_image ?? null,
    lang: c.lang,
    similarity: Number(c.similarity.toFixed(4)),
  }));
}

// POST /api/assistant/search — retrieval only, no LLM. Public. Useful for
// testing retrieval in isolation and for a future semantic-search UI.
router.post(
  '/search',
  validate([
    body('question').notEmpty().trim().isLength({ min: 3, max: 500 }),
    body('lang').optional({ checkFalsy: true }).isIn(['en', 'fr']),
    body('limit').optional().isInt({ min: 1, max: 10 }).toInt(),
  ]),
  async (req, res) => {
    const { question, lang, limit } = req.body as {
      question: string;
      lang?: 'en' | 'fr';
      limit?: number;
    };
    const started = Date.now();
    const cfg = await getConfig();

    try {
      const chunks = await retrieveChunks(question, { lang: lang ?? null, limit });
      const meta = await fetchArticleMeta(chunks.map((c) => c.article_id));
      const results = chunks.map((c) => ({
        article_id: c.article_id,
        title: titleFor(meta[c.article_id], c.lang),
        category: meta[c.article_id]?.category ?? null,
        cover_image: meta[c.article_id]?.cover_image ?? null,
        lang: c.lang,
        similarity: Number(c.similarity.toFixed(4)),
        content: c.content,
      }));
      logRagRequest({
        user_id: req.user?.id ?? null,
        user_email: req.user?.email ?? null,
        endpoint: 'search',
        question,
        lang: lang ?? null,
        embedding_model: String(cfg.embedding_model),
        params: { retrieval_limit: limit ?? cfg.retrieval_limit },
        retrieved_count: results.length,
        top_similarity: topSimilarity(chunks),
        latency_ms: Date.now() - started,
      });
      res.json({ question, count: results.length, results });
    } catch (err) {
      console.error('assistant/search error:', err);
      logRagRequest({
        user_id: req.user?.id ?? null,
        user_email: req.user?.email ?? null,
        endpoint: 'search',
        question,
        lang: lang ?? null,
        latency_ms: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(502).json({ error: 'Search is temporarily unavailable.' });
    }
  }
);

// POST /api/assistant/ask — full RAG: retrieve + generate a grounded answer
// with source citations. Public (answers only from the public articles).
router.post(
  '/ask',
  validate([
    body('question').notEmpty().trim().isLength({ min: 3, max: 500 }),
    body('lang').optional({ checkFalsy: true }).isIn(['en', 'fr']),
    body('mode').optional({ checkFalsy: true }).isIn(['articles', 'general']),
  ]),
  async (req, res) => {
    const { question, lang, mode } = req.body as {
      question: string;
      lang?: 'en' | 'fr';
      mode?: 'articles' | 'general';
    };
    const resolvedMode = mode ?? 'articles';
    const started = Date.now();
    const cfg = await getConfig();

    try {
      const { answer, grounded, chunks } = await answerQuestion(question, {
        lang: lang ?? null,
        mode: resolvedMode,
      });
      // Only cite sources when the answer is actually grounded in them.
      const sources = grounded ? await distinctSources(chunks) : [];
      logRagRequest({
        user_id: req.user?.id ?? null,
        user_email: req.user?.email ?? null,
        endpoint: 'ask',
        mode: resolvedMode,
        question,
        lang: lang ?? null,
        embedding_model: String(cfg.embedding_model),
        chat_model: String(cfg.chat_model),
        params: {
          context_chunks: cfg.context_chunks,
          min_top_similarity: cfg.min_top_similarity,
          answer_max_tokens: cfg.answer_max_tokens,
          temperature: resolvedMode === 'general' ? cfg.general_temperature : cfg.grounded_temperature,
        },
        retrieved_count: chunks.length,
        top_similarity: topSimilarity(chunks),
        grounded,
        // A refusal = articles mode that didn't ground its answer.
        refused: resolvedMode === 'articles' && !grounded,
        latency_ms: Date.now() - started,
      });
      res.json({ question, answer, grounded, sources });
    } catch (err) {
      console.error('assistant/ask error:', err);
      logRagRequest({
        user_id: req.user?.id ?? null,
        user_email: req.user?.email ?? null,
        endpoint: 'ask',
        mode: resolvedMode,
        question,
        lang: lang ?? null,
        chat_model: String(cfg.chat_model),
        latency_ms: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(502).json({ error: 'The assistant is temporarily unavailable.' });
    }
  }
);

// POST /api/assistant/product-advice — recommend shop products for a described
// need (RAG idea D). Public; rate-limited like the rest of the assistant.
router.post(
  '/product-advice',
  validate([body('question').notEmpty().trim().isLength({ min: 3, max: 400 })]),
  async (req, res) => {
    const question = req.body.question as string;
    const started = Date.now();
    const cfg = await getConfig();
    try {
      const { answer, productIds } = await adviseProducts(question);
      logRagRequest({
        user_id: req.user?.id ?? null,
        user_email: req.user?.email ?? null,
        endpoint: 'product-advice',
        question,
        embedding_model: String(cfg.embedding_model),
        chat_model: String(cfg.chat_model),
        params: {
          advisor_top_k: cfg.advisor_top_k,
          advisor_min_similarity: cfg.advisor_min_similarity,
          advisor_temperature: cfg.advisor_temperature,
        },
        retrieved_count: productIds.length,
        grounded: productIds.length > 0,
        latency_ms: Date.now() - started,
      });
      res.json({ answer, productIds });
    } catch (err) {
      console.error('assistant/product-advice error:', err);
      logRagRequest({
        user_id: req.user?.id ?? null,
        user_email: req.user?.email ?? null,
        endpoint: 'product-advice',
        question,
        latency_ms: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(502).json({ error: 'The product advisor is temporarily unavailable.' });
    }
  }
);

export default router;
