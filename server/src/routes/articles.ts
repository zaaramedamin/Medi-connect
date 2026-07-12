import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { embedQuery, reindexArticle } from '../services/embeddings';

const router = Router();

const CATEGORIES = ['report', 'advice', 'discussion'];

// Posts may be written by doctors or admins.
function requireDoctorOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role === 'doctor' || req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

interface AuthorInfo {
  name: string;
  specialty: string | null;
  photos_url: string | null;
}

const FALLBACK_AUTHOR: AuthorInfo = { name: 'Doctor', specialty: null, photos_url: null };

/** Resolve doctor author profiles for a set of article author ids. */
async function getAuthors(ids: string[]): Promise<Record<string, AuthorInfo>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return {};
  const { data } = await supabaseAdmin
    .from('doctors')
    .select('id, name, specialty, photos_url')
    .in('id', unique);
  const map: Record<string, AuthorInfo> = {};
  for (const d of data ?? []) {
    map[d.id] = { name: d.name, specialty: d.specialty, photos_url: d.photos_url };
  }

  // Authors not in the doctors table (e.g. an admin) — read their auth profile.
  const missing = unique.filter(id => !map[id]);
  await Promise.all(
    missing.map(async id => {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      const meta = u.user?.user_metadata ?? {};
      map[id] = {
        name: (meta.name as string) ?? 'MediConnect Team',
        specialty: meta.role === 'admin' ? 'MediConnect' : null,
        photos_url: null,
      };
    })
  );

  return map;
}

/** Display name + role for a commenter, read from their auth profile. */
async function getCommenter(id: string): Promise<{ name: string; role: string }> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(id);
  const meta = data.user?.user_metadata ?? {};
  return { name: (meta.name as string) ?? 'User', role: (meta.role as string) ?? 'patient' };
}

// Select lists with and without the French columns, so the API keeps working
// when the articles-bilingual.sql migration hasn't been run yet (42703 = undefined column).
const LIST_FIELDS = 'id, author_id, title, title_fr, category, excerpt, excerpt_fr, cover_image, created_at';
const LIST_FIELDS_LEGACY = 'id, author_id, title, category, excerpt, cover_image, created_at';
const DETAIL_FIELDS = 'id, author_id, title, title_fr, category, excerpt, excerpt_fr, body, body_fr, cover_image, created_at';
const DETAIL_FIELDS_LEGACY = 'id, author_id, title, category, excerpt, body, cover_image, created_at';

const isMissingColumn = (error: { code?: string } | null) => error?.code === '42703';

interface ArticleListRow {
  id: number;
  author_id: string;
  title: string;
  title_fr?: string | null;
  category: string;
  excerpt: string | null;
  excerpt_fr?: string | null;
  cover_image: string | null;
  created_at: string;
}

interface ArticleDetailRow extends ArticleListRow {
  body: string;
  body_fr?: string | null;
}

// GET /api/articles — list (public). Optional ?category=report|advice|discussion
router.get('/', async (req, res) => {
  const category = String(req.query.category ?? '');
  const fetchList = async (fields: string) => {
    let query = supabaseAdmin
      .from('articles')
      .select(fields)
      .order('created_at', { ascending: false });
    if (CATEGORIES.includes(category)) query = query.eq('category', category);
    const { data, error } = await query;
    return { data: data as unknown as ArticleListRow[] | null, error };
  };

  let { data, error } = await fetchList(LIST_FIELDS);
  if (isMissingColumn(error)) ({ data, error } = await fetchList(LIST_FIELDS_LEGACY));
  if (error) return res.status(500).json({ error: 'Failed to fetch articles' });

  const list = data ?? [];
  const authors = await getAuthors(list.map(a => a.author_id));

  // Comment counts for the listed articles
  const counts: Record<number, number> = {};
  const ids = list.map(a => a.id);
  if (ids.length) {
    const { data: cs } = await supabaseAdmin.from('article_comments').select('article_id').in('article_id', ids);
    for (const c of cs ?? []) counts[c.article_id] = (counts[c.article_id] ?? 0) + 1;
  }

  res.json(
    list.map(a => ({
      ...a,
      author: authors[a.author_id] ?? FALLBACK_AUTHOR,
      comment_count: counts[a.id] ?? 0,
    }))
  );
});

// GET /api/articles/search?q=&lang= — semantic search over articles (public).
// Ranks by vector similarity via match_article_chunks, then returns the same
// enriched shape as the list endpoint. Registered before "/:id" so the literal
// "search" isn't captured as an article id.
router.get('/search', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const lang = req.query.lang === 'fr' || req.query.lang === 'en' ? req.query.lang : null;
  if (q.length < 3) return res.json([]);

  // 1. Embed the query and pull the most similar chunks.
  let ranked: { article_id: number; similarity: number }[] = [];
  try {
    const queryEmbedding = await embedQuery(q);
    const { data, error } = await supabaseAdmin.rpc('match_article_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: 15,
      filter_lang: lang,
    });
    if (error) throw new Error(error.message);
    ranked = (data ?? []) as { article_id: number; similarity: number }[];
  } catch (err) {
    console.error('articles/search error:', err);
    return res.status(502).json({ error: 'Search is temporarily unavailable' });
  }

  // 2. Distinct article ids above a relevance floor, best-match first, capped —
  //    so search returns a focused set rather than the whole catalog reordered.
  const MIN_SIMILARITY = 0.8;
  const MAX_RESULTS = 8;
  const order: number[] = [];
  const seen = new Set<number>();
  for (const r of ranked) {
    if (r.similarity < MIN_SIMILARITY || seen.has(r.article_id)) continue;
    seen.add(r.article_id);
    order.push(r.article_id);
    if (order.length >= MAX_RESULTS) break;
  }
  if (!order.length) return res.json([]);

  // 3. Fetch + enrich those articles, then restore the similarity order.
  const fetchList = async (fields: string) => {
    const { data, error } = await supabaseAdmin.from('articles').select(fields).in('id', order);
    return { data: data as unknown as ArticleListRow[] | null, error };
  };
  let { data, error } = await fetchList(LIST_FIELDS);
  if (isMissingColumn(error)) ({ data, error } = await fetchList(LIST_FIELDS_LEGACY));
  if (error) return res.status(500).json({ error: 'Failed to fetch articles' });

  const list = data ?? [];
  const authors = await getAuthors(list.map(a => a.author_id));

  const counts: Record<number, number> = {};
  if (list.length) {
    const { data: cs } = await supabaseAdmin
      .from('article_comments')
      .select('article_id')
      .in('article_id', list.map(a => a.id));
    for (const c of cs ?? []) counts[c.article_id] = (counts[c.article_id] ?? 0) + 1;
  }

  const byId = new Map(list.map(a => [a.id, a]));
  const ordered = order.map(id => byId.get(id)).filter((a): a is ArticleListRow => Boolean(a));

  res.json(
    ordered.map(a => ({
      ...a,
      author: authors[a.author_id] ?? FALLBACK_AUTHOR,
      comment_count: counts[a.id] ?? 0,
    }))
  );
});

// GET /api/articles/:id — single article with author + discussion (public)
router.get('/:id', async (req, res) => {
  const fetchDetail = async (fields: string) => {
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select(fields)
      .eq('id', req.params.id)
      .maybeSingle();
    return { data: data as unknown as ArticleDetailRow | null, error };
  };

  let { data: article, error } = await fetchDetail(DETAIL_FIELDS);
  if (isMissingColumn(error)) ({ data: article, error } = await fetchDetail(DETAIL_FIELDS_LEGACY));
  if (error) return res.status(500).json({ error: 'Failed to fetch article' });
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const authors = await getAuthors([article.author_id]);

  const { data: comments } = await supabaseAdmin
    .from('article_comments')
    .select('id, author_id, body, created_at')
    .eq('article_id', article.id)
    .order('created_at', { ascending: true });

  const enriched = await Promise.all(
    (comments ?? []).map(async c => {
      const who = await getCommenter(c.author_id);
      return { id: c.id, body: c.body, created_at: c.created_at, author_name: who.name, author_role: who.role };
    })
  );

  res.json({
    ...article,
    author: authors[article.author_id] ?? FALLBACK_AUTHOR,
    comments: enriched,
  });
});

// POST /api/articles — publish (doctor only)
router.post(
  '/',
  requireAuth,
  requireDoctorOrAdmin,
  validate([
    body('title').notEmpty().trim().isLength({ max: 160 }),
    body('body').notEmpty().trim().isLength({ max: 8000 }),
    body('category').isIn(CATEGORIES),
    body('excerpt').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
    body('cover_image').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  ]),
  async (req, res) => {
    const { title, body: content, category, excerpt, cover_image } = req.body;
    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert({
        author_id: req.user!.id,
        title,
        body: content,
        category,
        excerpt: excerpt || null,
        cover_image: cover_image || null,
      })
      .select('id')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to publish article' });

    // Index the new article for the assistant + semantic search (fire-and-forget).
    void reindexArticle(data.id).catch(err => console.error('Article reindex failed:', err));

    res.status(201).json(data);
  }
);

// DELETE /api/articles/:id — author or admin
router.delete('/:id', requireAuth, async (req, res) => {
  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('author_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!article) return res.status(404).json({ error: 'Article not found' });
  if (article.author_id !== req.user!.id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { error } = await supabaseAdmin.from('articles').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'Failed to delete article' });
  res.status(204).end();
});

// POST /api/articles/:id/comments — add to the discussion (any signed-in user)
router.post(
  '/:id/comments',
  requireAuth,
  validate([body('body').notEmpty().trim().isLength({ min: 1, max: 1500 })]),
  async (req, res) => {
    const { data: article } = await supabaseAdmin
      .from('articles')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!article) return res.status(404).json({ error: 'Article not found' });

    const { data, error } = await supabaseAdmin
      .from('article_comments')
      .insert({ article_id: req.params.id, author_id: req.user!.id, body: req.body.body })
      .select('id, body, created_at')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to add comment' });

    const who = await getCommenter(req.user!.id);
    res.status(201).json({ ...data, author_name: who.name, author_role: who.role });
  }
);

export default router;
