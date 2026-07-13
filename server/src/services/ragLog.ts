import { supabaseAdmin } from '../config/supabase';

/**
 * Per-request logging for the RAG endpoints — the feed the admin console's
 * terminal renders. Writes are fire-and-forget: a logging failure must never
 * break the actual assistant response.
 */

export interface RagLogEntry {
  user_id?: string | null;
  user_email?: string | null;
  endpoint: 'ask' | 'search' | 'product-advice';
  mode?: string | null;
  question?: string | null;
  lang?: string | null;
  embedding_model?: string | null;
  chat_model?: string | null;
  params?: Record<string, unknown> | null;
  retrieved_count?: number | null;
  top_similarity?: number | null;
  grounded?: boolean | null;
  refused?: boolean | null;
  latency_ms?: number | null;
  error?: string | null;
}

/** Insert a request log row. Never throws — logs a warning and moves on. */
export function logRagRequest(entry: RagLogEntry): void {
  void supabaseAdmin
    .from('rag_request_logs')
    .insert({
      ...entry,
      // Keep stored questions bounded — this is an operational log, not an archive.
      question: entry.question ? entry.question.slice(0, 500) : null,
    })
    .then(({ error }) => {
      if (error) console.warn('rag log insert failed:', error.message);
    });
}

export interface RagLogRow extends RagLogEntry {
  id: number;
  created_at: string;
}

/** Recent request logs, newest first. */
export async function getRecentLogs(opts: {
  limit?: number;
  endpoint?: string;
  userId?: string;
} = {}): Promise<RagLogRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  let q = supabaseAdmin
    .from('rag_request_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.endpoint) q = q.eq('endpoint', opts.endpoint);
  if (opts.userId) q = q.eq('user_id', opts.userId);
  const { data, error } = await q;
  if (error) throw new Error(`Failed to load logs: ${error.message}`);
  return (data ?? []) as RagLogRow[];
}

/** Delete all request logs. Returns the number removed. */
export async function clearLogs(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('rag_request_logs')
    .delete({ count: 'exact' })
    .neq('id', -1);
  if (error) throw new Error(`Failed to clear logs: ${error.message}`);
  return count ?? 0;
}

export interface RagStats {
  total: number;
  last24h: number;
  byEndpoint: Record<string, number>;
  grounded: number;
  refused: number;
  avgLatencyMs: number | null;
  topUsers: { user_email: string | null; count: number }[];
}

/** Aggregate stats over the most recent window of logs. */
export async function getStats(): Promise<RagStats> {
  // Pull a bounded recent window and aggregate in JS — plenty for a demo scale.
  const { data, error } = await supabaseAdmin
    .from('rag_request_logs')
    .select('endpoint, grounded, refused, latency_ms, user_email, created_at')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(`Failed to load stats: ${error.message}`);
  const rows = (data ?? []) as {
    endpoint: string;
    grounded: boolean | null;
    refused: boolean | null;
    latency_ms: number | null;
    user_email: string | null;
    created_at: string;
  }[];

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const byEndpoint: Record<string, number> = {};
  const byUser = new Map<string | null, number>();
  let grounded = 0;
  let refused = 0;
  let latencySum = 0;
  let latencyN = 0;
  let last24h = 0;

  for (const r of rows) {
    byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] ?? 0) + 1;
    if (r.grounded) grounded++;
    if (r.refused) refused++;
    if (typeof r.latency_ms === 'number') {
      latencySum += r.latency_ms;
      latencyN++;
    }
    if (new Date(r.created_at).getTime() > dayAgo) last24h++;
    byUser.set(r.user_email, (byUser.get(r.user_email) ?? 0) + 1);
  }

  const topUsers = [...byUser.entries()]
    .map(([user_email, count]) => ({ user_email, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total: rows.length,
    last24h,
    byEndpoint,
    grounded,
    refused,
    avgLatencyMs: latencyN ? Math.round(latencySum / latencyN) : null,
    topUsers,
  };
}
