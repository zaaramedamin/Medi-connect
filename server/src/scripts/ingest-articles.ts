import 'dotenv/config';
import { supabaseAdmin } from '../config/supabase';
import { ingestArticle, type IngestableArticle } from '../services/embeddings';

// One-off backfill: embed every article into article_chunks. Safe to re-run —
// each article's chunks are replaced, not duplicated.
// Run from server/ with:  npm run ingest
async function main() {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('id, title, body, title_fr, body_fr')
    .order('id');

  if (error) throw new Error(`Could not load articles: ${error.message}`);

  const articles = (data ?? []) as IngestableArticle[];
  if (!articles.length) {
    console.log('No articles found — nothing to ingest.');
    return;
  }

  console.log(`Embedding ${articles.length} articles into article_chunks...\n`);
  let total = 0;
  for (const article of articles) {
    const n = await ingestArticle(article);
    total += n;
    console.log(`  #${String(article.id).padStart(2, ' ')}  ${n} chunk(s)  ${article.title.slice(0, 60)}`);
  }
  console.log(`\nDone — ${total} chunks embedded across ${articles.length} articles.`);
}

main().catch((err) => {
  console.error('\nIngestion failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
