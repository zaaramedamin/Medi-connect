import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, PenSquare, MessagesSquare, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BlurFade } from '@/components/ui/blur-fade';
import { ArticleCard } from '@/components/features/ArticleCard';
import { ARTICLE_FILTERS } from '@/data/articleMeta';
import { getArticles } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

export default function Community() {
  const { role } = useAuthStore();
  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 250);

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles', category],
    queryFn: () => getArticles(category),
  });

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase().trim();
    if (!q) return articles ?? [];
    return (articles ?? []).filter(
      a => a.title.toLowerCase().includes(q) || (a.excerpt ?? '').toLowerCase().includes(q)
    );
  }, [articles, debounced]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <section className="relative overflow-hidden border-b">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-accent/10" />
          <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        </div>
        <div className="container relative flex flex-col gap-6 py-12 md:flex-row md:items-end md:justify-between md:py-16">
          <BlurFade>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <MessagesSquare className="h-3.5 w-3.5" /> Community
            </span>
            <h1 className="text-3xl font-extrabold md:text-4xl">Doctor insights &amp; advice</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Public health reports and practical advice from our doctors — and a space for them to share and discuss.
            </p>
          </BlurFade>
          {(role === 'doctor' || role === 'admin') && (
            <BlurFade delay={0.1}>
              <Button asChild>
                <Link to="/community/new"><PenSquare className="mr-1.5 h-4 w-4" /> Write an article</Link>
              </Button>
            </BlurFade>
          )}
        </div>
      </section>

      {/* Controls */}
      <section className="container py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {ARTICLE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setCategory(f.value)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  category === f.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-10"
              placeholder="Search articles…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search articles"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((article, i) => (
              <BlurFade key={article.id} delay={Math.min(i, 6) * 0.05} className="h-full">
                <ArticleCard article={article} />
              </BlurFade>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            <MessagesSquare className="mx-auto mb-4 h-12 w-12 opacity-30" />
            <p className="text-lg font-medium text-foreground">No articles yet</p>
            <p className="mt-1 text-sm">
              {role === 'doctor' ? 'Be the first to share an insight with your patients.' : 'Check back soon for advice from our doctors.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
