import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Send, X, Loader2, Stethoscope, ArrowUpRight } from 'lucide-react';
import { askAssistant, type AssistantSource } from '@/services/api';
import { useI18n } from '@/i18n';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: AssistantSource[];
}

// Starter prompts (English source strings; translated at render via t()).
const EXAMPLES = [
  'How can I sleep better?',
  'What should I do for a fever?',
  'How do I lower my blood pressure?',
];

// Render **bold** spans inside a line of model text.
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// Lightweight formatter so the model's answers read as real paragraphs and
// bullet lists rather than raw "- " dashes — the main thing that looked
// unpolished before. No markdown dependency needed for this small subset.
function AnswerBody({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-4 marker:text-primary/60">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const bullet = line.match(/^[-•*]\s+(.*)/);
    if (bullet) {
      bullets.push(bullet[1]);
    } else {
      flush();
      blocks.push(<p key={`p-${blocks.length}`}>{renderInline(line)}</p>);
    }
  }
  flush();

  return <div className="space-y-2">{blocks}</div>;
}

function BotAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Stethoscope className="h-3.5 w-3.5" />
    </div>
  );
}

/**
 * Floating AI health assistant. Pinned to the viewport (stays in place while
 * the page scrolls). Posts a question to the RAG endpoint and shows the
 * grounded answer with citations back to the source articles (RAG.md Phase 5).
 */
export function HealthAssistant() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ask = useMutation({
    mutationFn: (q: string) => askAssistant(q, lang),
    onSuccess: (data) =>
      setMessages((m) => [...m, { role: 'assistant', text: data.answer, sources: data.sources }]),
    onError: () =>
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: t('Sorry, the assistant is unavailable right now. Please try again in a moment.'),
        },
      ]),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, ask.isPending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = (q: string) => {
    const question = q.trim();
    if (question.length < 3 || ask.isPending) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    ask.mutate(question);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const hasMessages = messages.length > 0;

  // Portal to <body> so the fixed widget can't be trapped by a transformed
  // ancestor (e.g. the page's animate-fade-in), which would otherwise make
  // position:fixed resolve against that ancestor and scroll with the page.
  return createPortal(
    <>
      {/* Launcher — fixed to the viewport */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setOpen(true)}
            aria-label={t('Open the health assistant')}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-br from-primary to-primary/85 py-3 pl-4 pr-5 text-primary-foreground shadow-lg shadow-primary/30 transition-shadow hover:shadow-xl hover:shadow-primary/40"
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-semibold">{t('Health Assistant')}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel — fixed to the viewport */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            role="dialog"
            aria-label={t('Health Assistant')}
            className="fixed bottom-6 right-6 z-50 flex h-[560px] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-br from-primary to-primary/85 px-4 py-3.5 text-primary-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold leading-tight">
                  {t('Health Assistant')}
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    {t('AI')}
                  </span>
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-primary-foreground/80">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {t('Answers from articles written by our doctors')}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t('Close')}
                className="rounded-full p-1.5 transition-colors hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conversation */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-muted/30 px-4 py-4">
              {/* Opening message + suggestions */}
              {!hasMessages && (
                <div className="space-y-3">
                  <div className="flex gap-2.5">
                    <BotAvatar />
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
                      {t('Ask a health question and I will answer using articles written by our doctors.')}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-9">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => send(ex)}
                        className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {t(ex)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm">
                      {m.text}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex gap-2.5"
                  >
                    <BotAvatar />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="max-w-[90%] rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
                        <AnswerBody text={m.text} />
                      </div>
                      {m.sources && m.sources.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('Sources')}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {m.sources.map((s) => (
                              <Link
                                key={s.article_id}
                                to={`/community/${s.article_id}`}
                                className="group inline-flex max-w-full items-center gap-1 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground"
                              >
                                <span className="truncate">{s.title}</span>
                                <ArrowUpRight className="h-3 w-3 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              )}

              {ask.isPending && (
                <div className="flex gap-2.5">
                  <BotAvatar />
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border bg-card px-3.5 py-3.5 shadow-sm">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <form onSubmit={onSubmit} className="border-t bg-card px-3 py-3">
              <div className="flex items-center gap-2 rounded-full border bg-background py-1 pl-4 pr-1 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('Ask a health question…')}
                  aria-label={t('Ask a health question…')}
                  maxLength={500}
                  className="h-8 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={ask.isPending || input.trim().length < 3}
                  aria-label={t('Send')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                >
                  {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 px-2 text-center text-[10px] leading-tight text-muted-foreground">
                {t('General information, not a medical diagnosis. Book a doctor for anything serious.')}
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
