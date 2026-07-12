import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { supabaseAdmin } from '../config/supabase';
import { retrieveChunks, type RetrievedChunk } from '../services/retrieval';
import { answerQuestion } from '../services/generation';

const router = Router();

// Only cite a source when retrieval was reasonably confident. e5 similarity
// sits in a narrow high band (relevant matches ~0.87+, off-topic ~0.82), so
// this bar keeps citations off a soft-refusal answer without gating the answer
// itself — that's the generation service's grounding prompt's job.
const CITE_MIN_SIMILARITY = 0.84;

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
  const best = new Map<number, RetrievedChunk>();
  for (const c of chunks) {
    const prev = best.get(c.article_id);
    if (!prev || c.similarity > prev.similarity) best.set(c.article_id, c);
  }
  const top = [...best.values()]
    .filter((c) => c.similarity >= CITE_MIN_SIMILARITY)
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
      res.json({ question, count: results.length, results });
    } catch (err) {
      console.error('assistant/search error:', err);
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
  ]),
  async (req, res) => {
    const { question, lang } = req.body as { question: string; lang?: 'en' | 'fr' };

    try {
      const { answer, grounded, chunks } = await answerQuestion(question, { lang: lang ?? null });
      // Only cite sources when the answer is actually grounded in them.
      const sources = grounded ? await distinctSources(chunks) : [];
      res.json({ question, answer, grounded, sources });
    } catch (err) {
      console.error('assistant/ask error:', err);
      res.status(502).json({ error: 'The assistant is temporarily unavailable.' });
    }
  }
);

export default router;
