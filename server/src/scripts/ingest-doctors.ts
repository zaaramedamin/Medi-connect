import 'dotenv/config';
import { supabaseAdmin } from '../config/supabase';
import { ingestDoctor, type IngestableDoctor } from '../services/embeddings';

// One-off backfill: embed every doctor profile into doctors.embedding. Safe to
// re-run (each row's embedding is overwritten). Run from server/ with:
//   npm run ingest:doctors
async function main() {
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .select('id, name, specialty, location, description')
    .order('name');

  if (error) throw new Error(`Could not load doctors: ${error.message}`);

  const doctors = (data ?? []) as IngestableDoctor[];
  if (!doctors.length) {
    console.log('No doctors found — nothing to ingest.');
    return;
  }

  console.log(`Embedding ${doctors.length} doctor profiles...\n`);
  for (const d of doctors) {
    await ingestDoctor(d);
    console.log(`  ${d.name} — ${d.specialty ?? 'general'}, ${d.location ?? '—'}`);
  }
  console.log(`\nDone — ${doctors.length} doctors embedded.`);
}

main().catch((err) => {
  console.error('\nDoctor ingestion failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
