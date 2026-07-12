import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Send, X, Loader2, Stethoscope } from 'lucide-react';
import { askAssistant, type AssistantSource } from '@/services/api';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

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

/**
 * Floating AI health assistant. Sends a question to the RAG endpoint and shows
 * the grounded answer with citations back to the source articles. Lives on the
 * community page for now (see RAG.md Phase 5).
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

  // Keep the newest message in view.
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

  return (
    <>
      {/* Launcher */}
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
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary py-3 pl-4 pr-5 text-primary-foreground shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/30"
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-semibold">{t('Health Assistant')}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
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
            className="fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[calc(100dvh-3rem)] w-[calc(100vw-3rem)] max-w-md flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{t('Health Assistant')}</p>
                <p className="truncate text-xs text-primary-foreground/80">
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

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center px-2 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {t('Ask a health question and I will answer using articles written by our doctors.')}
                  </p>
                  <p className="mt-3 text-xs font-medium text-muted-foreground">{t('Try asking')}</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => send(ex)}
                        className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {t(ex)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    {m.text}
                  </div>

                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 max-w-[85%]">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">{t('Sources')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.sources.map((s) => (
                          <Link
                            key={s.article_id}
                            to={`/community/${s.article_id}`}
                            className="inline-flex max-w-full items-center rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                          >
                            <span className="truncate">{s.title}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {ask.isPending && (
                <div className="flex items-start">
                  <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-3.5 py-3.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
                  </div>
                </div>
              )}
            </div>

            {/* Input + persistent disclaimer */}
            <form onSubmit={onSubmit} className="border-t p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('Ask a health question…')}
                  aria-label={t('Ask a health question…')}
                  maxLength={500}
                  className="h-10 flex-1 rounded-xl border bg-background px-3.5 text-sm outline-none transition-colors focus:border-primary/50"
                />
                <button
                  type="submit"
                  disabled={ask.isPending || input.trim().length < 3}
                  aria-label={t('Send')}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                >
                  {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 px-1 text-[11px] leading-tight text-muted-foreground">
                {t('General information, not a medical diagnosis. Book a doctor for anything serious.')}
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
