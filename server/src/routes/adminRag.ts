import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import {
  PARAMS,
  listParams,
  setParam,
  resetParam,
  getParamDef,
} from '../services/ragConfig';
import { getRecentLogs, clearLogs, getStats } from '../services/ragLog';

/**
 * Admin-only RAG console API. Mounted under /api/admin/rag, so it inherits the
 * requireAuth + requireRole('admin') guard from the admin router — no other
 * role can reach any of this.
 *
 * The console exposes both a structured REST surface (for the form panel and
 * the live log viewer) and a POST /console command executor (for the terminal).
 */
const router = Router();

// ── Structured surface (form panel + log viewer) ─────────────────────

// GET /config — every parameter's definition, current value, and override state.
router.get('/config', async (_req, res) => {
  const params = await listParams();
  res.json({ params });
});

// PATCH /config — set one parameter.
router.patch(
  '/config',
  validate([body('key').isString().notEmpty(), body('value').exists()]),
  async (req, res) => {
    try {
      const value = await setParam(req.body.key, req.body.value, req.user?.id ?? null);
      res.json({ key: req.body.key, value });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid value' });
    }
  }
);

// POST /config/reset — reset one param ({ key }) or all (no body).
router.post('/config/reset', async (req, res) => {
  try {
    const key = req.body?.key as string | undefined;
    if (key && !getParamDef(key)) return res.status(400).json({ error: `Unknown parameter: ${key}` });
    await resetParam(key);
    res.json({ reset: key ?? 'all' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Reset failed' });
  }
});

// GET /logs — recent request logs (newest first).
router.get('/logs', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const logs = await getRecentLogs({
      limit,
      endpoint: (req.query.endpoint as string) || undefined,
      userId: (req.query.userId as string) || undefined,
    });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load logs' });
  }
});

// DELETE /logs — wipe the request log.
router.delete('/logs', async (_req, res) => {
  try {
    const removed = await clearLogs();
    res.json({ removed });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to clear logs' });
  }
});

// GET /stats — aggregate usage stats.
router.get('/stats', async (_req, res) => {
  try {
    res.json(await getStats());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load stats' });
  }
});

// ── Terminal command executor ────────────────────────────────────────

const HELP = [
  'MediConnect RAG console — commands:',
  '  help                 show this help',
  '  config               list every parameter, its value, and default',
  '  get <key>            show one parameter in detail',
  '  set <key> <value>    change a parameter (validated)',
  '  reset <key>          reset one parameter to its default',
  '  reset all            reset every parameter to defaults',
  '  logs [n]             show the last n requests (default 20, max 200)',
  '  stats                usage totals, grounding/refusal rate, top users',
  '  clear logs           delete all request logs',
  '',
  'Tunable keys: ' + PARAMS.map((p) => p.key).join(', '),
].join('\n');

function fmtParamLine(p: { key: string; value: string | number; default: string | number; isOverridden: boolean; requiresReingest?: boolean }): string {
  const mark = p.isOverridden ? '*' : ' ';
  const reingest = p.requiresReingest ? '  ⚠ re-ingest to apply' : '';
  const def = p.isOverridden ? `  (default ${p.default})` : '';
  return `${mark} ${p.key.padEnd(24)} ${String(p.value).padEnd(34)}${def}${reingest}`;
}

async function runCommand(line: string, adminId: string | null): Promise<string[]> {
  const trimmed = line.trim();
  if (!trimmed) return [];
  const [cmd, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(' ');

  switch (cmd.toLowerCase()) {
    case 'help':
    case '?':
      return HELP.split('\n');

    case 'config':
    case 'show':
    case 'ls': {
      const params = await listParams();
      const lines = ['(* = overridden from default)'];
      let group = '';
      for (const p of params) {
        if (p.group !== group) {
          group = p.group;
          lines.push(`── ${group} ──`);
        }
        lines.push(fmtParamLine(p));
      }
      return lines;
    }

    case 'get': {
      if (!arg) return ['Usage: get <key>'];
      const def = getParamDef(arg);
      if (!def) return [`Unknown parameter: ${arg}`];
      const params = await listParams();
      const p = params.find((x) => x.key === arg)!;
      const lines = [
        `${def.key}  =  ${p.value}${p.isOverridden ? ' (overridden)' : ' (default)'}`,
        `  ${def.description}`,
        `  group: ${def.group}   type: ${def.type}   default: ${def.default}`,
      ];
      if (def.min !== undefined || def.max !== undefined) lines.push(`  range: ${def.min ?? '−∞'} … ${def.max ?? '∞'}`);
      if (def.options) lines.push(`  options: ${def.options.join(', ')}${def.freeText ? ' (or any string)' : ''}`);
      if (def.requiresReingest) lines.push('  ⚠ changing this only affects future ingests — run `npm run ingest` to apply.');
      return lines;
    }

    case 'set': {
      const [key, ...valParts] = rest;
      const value = valParts.join(' ');
      if (!key || value === '') return ['Usage: set <key> <value>'];
      try {
        const saved = await setParam(key, value, adminId);
        const def = getParamDef(key)!;
        const out = [`✓ ${key} = ${saved}`];
        if (def.requiresReingest) out.push('  ⚠ affects future ingests only — run `npm run ingest` to re-embed the corpus.');
        return out;
      } catch (err) {
        return [`✗ ${err instanceof Error ? err.message : 'Invalid value'}`];
      }
    }

    case 'reset': {
      if (!arg) return ['Usage: reset <key> | reset all'];
      if (arg.toLowerCase() === 'all') {
        await resetParam();
        return ['✓ all parameters reset to defaults'];
      }
      if (!getParamDef(arg)) return [`Unknown parameter: ${arg}`];
      await resetParam(arg);
      return [`✓ ${arg} reset to default`];
    }

    case 'logs': {
      if (arg.toLowerCase() === 'clear') {
        const removed = await clearLogs();
        return [`✓ cleared ${removed} log(s)`];
      }
      const n = Math.min(Math.max(Number(rest[0]) || 20, 1), 200);
      const logs = await getRecentLogs({ limit: n });
      if (!logs.length) return ['(no requests logged yet)'];
      return logs.map((l) => {
        const t = new Date(l.created_at).toLocaleTimeString();
        const who = l.user_email ?? 'anonymous';
        const outcome = l.error ? `ERROR ${l.error}` : l.refused ? 'refused' : l.grounded ? 'grounded' : l.mode ?? 'ok';
        const sim = l.top_similarity != null ? ` sim=${l.top_similarity.toFixed(2)}` : '';
        const ms = l.latency_ms != null ? ` ${l.latency_ms}ms` : '';
        const q = l.question ? ` "${l.question.slice(0, 48)}"` : '';
        return `${t}  ${who.padEnd(22)} ${l.endpoint.padEnd(14)} ${outcome}${sim}${ms}${q}`;
      });
    }

    case 'clear': {
      if (rest[0]?.toLowerCase() === 'logs') {
        const removed = await clearLogs();
        return [`✓ cleared ${removed} log(s)`];
      }
      return ['Did you mean: clear logs'];
    }

    case 'stats': {
      const s = await getStats();
      const byEndpoint = Object.entries(s.byEndpoint).map(([k, v]) => `${k}=${v}`).join('  ') || '—';
      const topUsers = s.topUsers.map((u) => `${u.user_email ?? 'anonymous'}(${u.count})`).join('  ') || '—';
      return [
        `requests: ${s.total}   last 24h: ${s.last24h}`,
        `by endpoint: ${byEndpoint}`,
        `grounded: ${s.grounded}   refused: ${s.refused}   avg latency: ${s.avgLatencyMs ?? '—'}ms`,
        `top users: ${topUsers}`,
      ];
    }

    default:
      return [`Unknown command: ${cmd}. Type "help".`];
  }
}

// POST /console — run one terminal command, return the output lines.
router.post(
  '/console',
  validate([body('command').isString().isLength({ min: 1, max: 500 })]),
  async (req, res) => {
    try {
      const lines = await runCommand(req.body.command, req.user?.id ?? null);
      res.json({ lines });
    } catch (err) {
      res.json({ lines: [`✗ ${err instanceof Error ? err.message : 'Command failed'}`] });
    }
  }
);

export default router;
