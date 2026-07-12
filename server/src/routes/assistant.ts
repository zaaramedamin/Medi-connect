import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { supabaseAdmin } from '../config/supabase';
import { retrieveChunks, type RetrievedChunk } from '../services/retrieval';

const router = Router();

interface ArticleMeta {
  id: number;
  title: string;
  title_fr: string | null;
  cover_image: string | null;
  category: string;
}

// Attach each chunk's source article (language-appropriate title, cover,
// category) so the frontend can render citations linking to /community/:id.
async function withArticleInfo(chunks: RetrievedChunk[]) {
  const ids = [...new Set(chunks.map((c) => c.article_id))];
  const metaById: Record<number, ArticleMeta> = {};
  if (ids.length) {
    const { data } = await supabaseAdmin
      .from('articles')
      .select('id, title, title_fr, cover_image, category')
      .in('id', ids);
    for (const a of (data ?? []) as ArticleMeta[]) metaById[a.id] = a;
  }

  return chunks.map((c) => {
    const a = metaById[c.article_id];
    const title = a ? (c.lang === 'fr' && a.title_fr ? a.title_fr : a.title) : 'Article';
    return {
      article_id: c.article_id,
      title,
      category: a?.category ?? null,
      cover_image: a?.cover_image ?? null,
      lang: c.lang,
      similarity: Number(c.similarity.toFixed(4)),
      content: c.content,
    };
  });
}

// POST /api/assistant/search — retrieval only, no LLM. Public (searches the
// already-public articles). This is the endpoint to test on its own before
// the generation step is layered on top in Phase 4.
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
      const results = await withArticleInfo(chunks);
      res.json({ question, count: results.length, results });
    } catch (err) {
      console.error('assistant/search error:', err);
      res.status(502).json({ error: 'Search is temporarily unavailable.' });
    }
  }
);

export default router;
