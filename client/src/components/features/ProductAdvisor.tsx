import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { getProductAdvice } from '@/services/api';
import { PRODUCTS, type Product } from '@/data/products';
import { ProductCard } from './ProductCard';
import { useT } from '@/i18n';

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

// Starter prompts (English source strings; translated at render via t()).
const EXAMPLES = [
  'Something for a toddler with a fever',
  'Help with dry, dull skin',
  'Protect my family from germs',
];

/**
 * AI product advisor for the shop: the shopper describes a need in plain
 * language and the RAG endpoint recommends matching products with reasons.
 */
export function ProductAdvisor({ onQuickView }: { onQuickView: (p: Product) => void }) {
  const t = useT();
  const [input, setInput] = useState('');

  const advise = useMutation({ mutationFn: (q: string) => getProductAdvice(q) });

  const recommended: Product[] = (advise.data?.productIds ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is Product => Boolean(p));

  const ask = (q: string) => {
    const question = q.trim();
    if (question.length < 3 || advise.isPending) return;
    advise.mutate(question);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Header + composer */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">{t('Product advisor')}</h2>
            <p className="text-xs text-muted-foreground">
              {t('Describe what you need and we will suggest products.')}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border bg-background py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('Describe what you need…')}
              aria-label={t('Describe what you need…')}
              maxLength={300}
              className="h-8 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={advise.isPending || input.trim().length < 3}
              aria-label={t('Ask')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            >
              {advise.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>

        {/* Example prompts (until the first result) */}
        {!advise.data && !advise.isPending && (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setInput(t(ex));
                  ask(t(ex));
                }}
                className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {t(ex)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result */}
      {(advise.data || advise.isError) && (
        <div className="border-t p-5">
          {advise.isError ? (
            <p className="text-sm text-muted-foreground">
              {t('The advisor is unavailable right now. Please try again.')}
            </p>
          ) : (
            <>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {advise.data!.answer}
              </p>
              {recommended.length > 0 && (
                <div className="mt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('Recommended for you')}
                  </p>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {recommended.map((product) => (
                      <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
