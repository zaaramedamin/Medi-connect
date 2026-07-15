/**
 * Minimal structured logger — JSON lines to stdout/stderr, no dependency.
 *
 * Why JSON: log aggregators (Grafana Loki, Datadog, CloudWatch, Better Stack)
 * parse structured lines; `console.log(err)` is unqueryable. Every line carries
 * a level, an ISO timestamp, and whatever context you pass.
 *
 * If SENTRY_DSN is set later, `captureError` is the single place to forward to
 * Sentry — the app already routes all errors through it.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = LEVELS[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? LEVELS.info;

// Never let these reach the logs, at any nesting depth. This is a PHI-bearing
// app: request bodies for /api/records carry diagnoses and drug lists, and auth
// headers carry bearer tokens.
const REDACT = new Set([
  'password', 'token', 'access_token', 'refresh_token', 'authorization',
  'symptoms', 'diagnosis', 'examination', 'plan', 'notes', 'clinical_allergies',
  'body', 'content', 'medications', 'current_medications',
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.map(v => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACT.has(k.toLowerCase()) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  if (LEVELS[level] < MIN) return;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg,
    ...(ctx ? (redact(ctx) as Record<string, unknown>) : {}),
  });
  if (level === 'error') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit('error', msg, ctx),
};

/**
 * One funnel for unexpected errors. Logs with context now; the marked spot is
 * where a Sentry/Datadog SDK call goes when a DSN is configured.
 */
export function captureError(err: unknown, ctx?: Record<string, unknown>) {
  const e = err instanceof Error ? err : new Error(String(err));
  logger.error(e.message, { ...ctx, name: e.name, stack: e.stack });
  // if (process.env.SENTRY_DSN) Sentry.captureException(e, { extra: ctx });
}
