import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Terminal, SlidersHorizontal, RotateCcw, AlertTriangle, Trash2, RefreshCw,
  Activity, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getRagConfig, setRagParam, resetRagParam, getRagLogs, clearRagLogs,
  getRagStats, runRagCommand,
} from '@/services/api';
import type { RagParam, RagLogRow } from '@/types';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

const GROUP_LABELS: Record<RagParam['group'], string> = {
  models: 'Models',
  chunking: 'Chunking (ingestion)',
  retrieval: 'Retrieval',
  generation: 'Generation',
  advisor: 'Product advisor',
};

// ── The whole console ────────────────────────────────────────────────
export default function RagConsoleTab() {
  const queryClient = useQueryClient();
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['rag', 'config'] });
    queryClient.invalidateQueries({ queryKey: ['rag', 'logs'] });
    queryClient.invalidateQueries({ queryKey: ['rag', 'stats'] });
  };

  return (
    <div className="space-y-6">
      <StatsStrip />
      <div className="grid gap-6 lg:grid-cols-2">
        <TerminalPanel onMutated={refreshAll} />
        <ParamsPanel />
      </div>
      <LogsPanel />
    </div>
  );
}

// ── Stats strip ──────────────────────────────────────────────────────
function StatsStrip() {
  const { data } = useQuery({ queryKey: ['rag', 'stats'], queryFn: getRagStats });
  const items = [
    { label: 'Requests', value: data?.total ?? '—' },
    { label: 'Last 24h', value: data?.last24h ?? '—' },
    { label: 'Grounded', value: data?.grounded ?? '—' },
    { label: 'Refused', value: data?.refused ?? '—' },
    { label: 'Avg latency', value: data?.avgLatencyMs != null ? `${data.avgLatencyMs}ms` : '—' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{it.label}</p>
            <p className="text-xl font-bold">{it.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Terminal ─────────────────────────────────────────────────────────
interface HistoryEntry {
  command: string;
  lines: string[];
}

/**
 * Commands that throw away state. The terminal is a power tool, but `reset all`
 * and `clear logs` are one keystroke away from a typo, so they get a dialog.
 */
const DESTRUCTIVE: { match: RegExp; title: string; description: string }[] = [
  {
    match: /^reset\s+all$/i,
    title: 'Reset every parameter to its default?',
    description: 'All admin overrides are dropped and the assistant goes back to the values baked into the code.',
  },
  {
    match: /^(clear\s+logs|logs\s+clear)$/i,
    title: 'Delete the entire request log?',
    description: 'Every logged question, user and latency is erased. This is the audit trail — it cannot be recovered.',
  },
];

function TerminalPanel({ onMutated }: { onMutated: () => void }) {
  const askConfirm = useConfirm();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([
    { command: '', lines: ['MediConnect RAG console. Type "help" for commands.'] },
  ]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useMutation({
    mutationFn: runRagCommand,
    onSuccess: (data, command) => {
      setHistory((h) => [...h, { command, lines: data.lines }]);
      // Any command may have changed config or logs — refresh the panels.
      onMutated();
    },
    onError: (err: Error, command) => {
      setHistory((h) => [...h, { command, lines: [`✗ ${err.message}`] }]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [history, run.isPending]);

  const submit = async () => {
    const command = input.trim();
    if (!command) return;

    const danger = DESTRUCTIVE.find((d) => d.match.test(command));
    if (danger) {
      const ok = await askConfirm({
        title: danger.title,
        description: danger.description,
        detail: `rag> ${command}`,
        variant: 'destructive',
        confirmLabel: 'Run it',
      });
      if (!ok) {
        setHistory((h) => [...h, { command, lines: ['cancelled.'] }]);
        setInput('');
        return;
      }
    }

    setCmdHistory((c) => [...c, command]);
    setHistIdx(-1);
    setInput('');
    run.mutate(command);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!cmdHistory.length) return;
      const idx = histIdx === -1 ? cmdHistory.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setInput(cmdHistory[idx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= cmdHistory.length) {
        setHistIdx(-1);
        setInput('');
      } else {
        setHistIdx(idx);
        setInput(cmdHistory[idx]);
      }
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <Terminal className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Terminal</CardTitle>
        <Badge variant="secondary" className="ml-auto gap-1 text-xs">
          <ShieldCheck className="h-3 w-3" /> admin only
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0">
        <div
          ref={scrollRef}
          onClick={() => inputRef.current?.focus()}
          className="h-80 overflow-y-auto bg-zinc-950 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-100"
        >
          {history.map((entry, i) => (
            <div key={i} className="mb-1">
              {entry.command && (
                <div className="text-emerald-400">
                  <span className="text-zinc-500">rag&gt;</span> {entry.command}
                </div>
              )}
              {entry.lines.map((line, j) => (
                <div key={j} className="whitespace-pre-wrap break-words text-zinc-300">
                  {line}
                </div>
              ))}
            </div>
          ))}
          {run.isPending && <div className="text-zinc-500">…</div>}
        </div>
        <div className="flex items-center gap-2 border-t bg-zinc-950 px-4 py-2 font-mono text-xs">
          <span className="text-zinc-500">rag&gt;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
            placeholder="type a command, e.g. set context_chunks 8"
            className="flex-1 bg-transparent text-zinc-100 outline-none placeholder:text-zinc-600"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Parameter form panel ─────────────────────────────────────────────
function ParamsPanel() {
  const { data, isLoading } = useQuery({ queryKey: ['rag', 'config'], queryFn: getRagConfig });
  const params = data?.params ?? [];
  const groups = [...new Set(params.map((p) => p.group))];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Parameters</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[26rem] space-y-5 overflow-y-auto">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {groups.map((g) => (
          <div key={g} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {GROUP_LABELS[g]}
            </p>
            {params.filter((p) => p.group === g).map((p) => (
              <ParamRow key={p.key} param={p} />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface SaveArgs {
  value: string | number;
  /** What it was, so the toast can offer an undo. */
  previous: string | number;
  /** Whether an override row existed — undo has to reset rather than re-set. */
  wasOverridden: boolean;
}

function ParamRow({ param }: { param: RagParam }) {
  const queryClient = useQueryClient();
  const askConfirm = useConfirm();
  const [draft, setDraft] = useState<string>(String(param.value));

  // Keep the local draft in sync when the server value changes (e.g. via terminal).
  useEffect(() => {
    setDraft(String(param.value));
  }, [param.value]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rag', 'config'] });
    queryClient.invalidateQueries({ queryKey: ['rag', 'stats'] });
  };

  // Undo has to know whether the value was an override or the code default:
  // putting the default back as an override is not the same as having none.
  const undo = async (previous: string | number, wasOverridden: boolean) => {
    try {
      if (wasOverridden) await setRagParam(param.key, previous);
      else await resetRagParam(param.key);
      toast.success(`${param.label} reverted to ${previous}`);
      invalidate();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const save = useMutation({
    mutationFn: ({ value }: SaveArgs) => setRagParam(param.key, value),
    onSuccess: (_data, { value, previous, wasOverridden }) => {
      toast.success(`${param.label} updated`, {
        description: `${previous}  →  ${value}`,
        action: { label: 'Undo', onClick: () => void undo(previous, wasOverridden) },
      });
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDraft(String(param.value));
    },
  });

  const reset = useMutation({
    mutationFn: () => resetRagParam(param.key),
    onSuccess: () => {
      const previous = param.value;
      toast.success(`${param.label} reset to default (${param.default})`, {
        action: { label: 'Undo', onClick: () => void undo(previous, true) },
      });
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const commit = async (raw: string) => {
    if (raw === '' || raw === String(param.value)) return;
    const value = param.type === 'number' ? Number(raw) : raw;

    // A different embedding model almost always means a different vector width,
    // and the column is VECTOR(384) — get this wrong and retrieval stops
    // returning anything until the corpus is re-embedded. Never let it through
    // on a stray keystroke.
    if (param.key === 'embedding_model') {
      const ok = await askConfirm({
        title: 'Swap the embedding model?',
        detail: `${param.value}  →  ${value}`,
        description:
          'Existing articles keep their current vectors, so search keeps using the old model until you re-run "npm run ingest". If the new model does not output 384 dimensions, retrieval will return nothing at all until the column is migrated.',
        variant: 'destructive',
        confirmLabel: 'I understand — change it',
      });
      if (!ok) { setDraft(String(param.value)); return; }
    } else if (param.requiresReingest) {
      const ok = await askConfirm({
        title: `Change ${param.label}?`,
        detail: `${param.value}  →  ${value}`,
        description:
          'This only applies to content ingested from now on. Everything already in the index keeps its current chunking until you re-run "npm run ingest".',
        confirmLabel: 'Change it',
      });
      if (!ok) { setDraft(String(param.value)); return; }
    }

    save.mutate({ value, previous: param.value, wasOverridden: param.isOverridden });
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm font-medium">{param.label}</span>
        {param.isOverridden && (
          <Badge variant="secondary" className="text-[10px]">modified</Badge>
        )}
        {param.requiresReingest && (
          <Badge variant="outline" className="gap-1 border-amber-400 text-[10px] text-amber-600">
            <AlertTriangle className="h-2.5 w-2.5" /> re-ingest
          </Badge>
        )}
        {param.isOverridden && (
          <button
            onClick={() => reset.mutate()}
            title="Reset to default"
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Control */}
      {param.type === 'number' ? (
        <div className="flex items-center gap-3">
          {param.min !== undefined && param.max !== undefined && (
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step ?? 1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onMouseUp={() => void commit(draft)}
              onKeyUp={() => void commit(draft)}
              className="flex-1 accent-primary"
            />
          )}
          <input
            type="number"
            min={param.min}
            max={param.max}
            step={param.step ?? 1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit(draft)}
            onKeyDown={(e) => { if (e.key === 'Enter') void commit(draft); }}
            className="w-24 rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
      ) : param.type === 'enum' && !param.freeText ? (
        <select
          value={draft}
          onChange={(e) => { setDraft(e.target.value); void commit(e.target.value); }}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          {param.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <>
          <input
            list={param.options ? `opts-${param.key}` : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit(draft)}
            onKeyDown={(e) => { if (e.key === 'Enter') void commit(draft); }}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          />
          {param.options && (
            <datalist id={`opts-${param.key}`}>
              {param.options.map((o) => <option key={o} value={o} />)}
            </datalist>
          )}
        </>
      )}

      <p className="mt-1.5 text-xs text-muted-foreground">{param.description}</p>
      {!param.isOverridden && (
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">default: {String(param.default)}</p>
      )}
    </div>
  );
}

// ── Live logs ────────────────────────────────────────────────────────
function LogsPanel() {
  const queryClient = useQueryClient();
  const askConfirm = useConfirm();
  const [limit, setLimit] = useState(50);
  const { data, isLoading } = useQuery({
    queryKey: ['rag', 'logs', limit],
    queryFn: () => getRagLogs(limit),
    refetchInterval: 10_000, // live-ish feed
  });
  const logs = data?.logs ?? [];

  const clear = useMutation({
    mutationFn: clearRagLogs,
    onSuccess: (r) => {
      toast.success(`Cleared ${r.removed} log(s)`);
      queryClient.invalidateQueries({ queryKey: ['rag'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // This is the audit trail: who asked the assistant what, and how it answered.
  // There is no undo and no backup, so make it deliberate.
  const confirmClear = async () => {
    const ok = await askConfirm({
      title: 'Delete the entire request log?',
      description:
        'Every logged question, the user who asked it, the models that ran and the latency are erased. This is the only record of how the assistant has been used — it cannot be recovered.',
      variant: 'destructive',
      requireTyped: 'CLEAR',
      confirmLabel: 'Delete all logs',
    });
    if (ok) clear.mutate();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <Activity className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Request log</CardTitle>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            {[25, 50, 100, 200].map((n) => <option key={n} value={n}>last {n}</option>)}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['rag', 'logs'] })}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={confirmClear} disabled={clear.isPending}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No requests logged yet.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Endpoint</th>
                <th className="px-3 py-2 font-medium">Model</th>
                <th className="px-3 py-2 font-medium">Outcome</th>
                <th className="px-3 py-2 font-medium">Sim</th>
                <th className="px-3 py-2 font-medium">Latency</th>
                <th className="px-3 py-2 font-medium">Question</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => <LogRow key={l.id} log={l} />)}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function LogRow({ log }: { log: RagLogRow }) {
  const outcome = log.error
    ? { label: 'error', cls: 'text-red-600' }
    : log.refused
      ? { label: 'refused', cls: 'text-amber-600' }
      : log.grounded
        ? { label: 'grounded', cls: 'text-emerald-600' }
        : { label: log.mode ?? 'ok', cls: 'text-muted-foreground' };

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
        {new Date(log.created_at).toLocaleTimeString()}
      </td>
      <td className="px-3 py-2">{log.user_email ?? <span className="text-muted-foreground">anonymous</span>}</td>
      <td className="px-3 py-2">
        {log.endpoint}{log.mode ? <span className="text-muted-foreground">/{log.mode}</span> : null}
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
        {(log.chat_model ?? log.embedding_model ?? '—').split('/').pop()}
      </td>
      <td className={cn('px-3 py-2 font-medium', outcome.cls)} title={log.error ?? ''}>
        {outcome.label}
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        {log.top_similarity != null ? log.top_similarity.toFixed(2) : '—'}
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        {log.latency_ms != null ? `${log.latency_ms}ms` : '—'}
      </td>
      <td className="max-w-[240px] truncate px-3 py-2 text-muted-foreground" title={log.question ?? ''}>
        {log.question ?? '—'}
      </td>
    </tr>
  );
}
