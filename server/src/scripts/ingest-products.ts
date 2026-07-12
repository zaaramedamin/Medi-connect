import 'dotenv/config';
import { ingestProduct } from '../services/embeddings';
import { PRODUCTS, productText } from '../data/products';

// One-off backfill: embed every shop product into product_embeddings. Safe to
// re-run (upsert). Run from server/ with:  npm run ingest:products
async function main() {
  console.log(`Embedding ${PRODUCTS.length} products...\n`);
  for (const p of PRODUCTS) {
    await ingestProduct({ id: p.id, name: p.name, content: productText(p) });
    console.log(`  ${p.name} (${p.category})`);
  }
  console.log(`\nDone — ${PRODUCTS.length} products embedded.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nProduct ingestion failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
