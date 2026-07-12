import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, PenSquare, MessagesSquare, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BlurFade } from '@/components/ui/blur-fade';
import { AnimatedText } from '@/components/ui/animated-text';
import { HeroBackdrop } from '@/components/ui/hero-backdrop';
import { ArticleCard } from '@/components/features/ArticleCard';
import { ARTICLE_FILTERS } from '@/data/articleMeta';
import { getArticles, searchArticlesSemantic } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useI18n } from '@/i18n';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

export default function Community() {
  const { role } = useAuthStore();
  const { t, lang } = useI18n();
  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 400);
  const isSearching = debounced.trim().length >= 3;

  // Browse by category, or — once there's a query — rank articles by meaning
  // via the semantic search endpoint. keepPreviousData avoids a skeleton flash
  // as the query updates while typing.
  const browse = useQuery({
    queryKey: ['articles', category],
    queryFn: () => getArticles(category),
    enabled: !isSearching,
  });
  const search = useQuery({
    queryKey: ['articles-search', debounced, lang],
    queryFn: () => searchArticlesSemantic(debounced, lang),
    enabled: isSearching,
    placeholderData: keepPreviousData,
  });

  const isLoading = isSearching ? search.isLoading : browse.isLoading;
  const results = (isSearching ? search.data : browse.data) ?? [];
  // Category tabs still narrow the list, in both browse and search modes.
  const filtered = results.filter(a => category === 'all' || a.category === category);

  return (
    <div className="animate-fade-in">
      {/* Header — real medical photo as an on-brand duotone with a slow drift */}
      <section className="relative overflow-hidden border-b">
        <HeroBackdrop image="/backgrounds/insights.jpg" />
        <div className="container relative flex flex-col gap-6 py-16 text-white md:flex-row md:items-end md:justify-between md:py-20">
          <BlurFade>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <MessagesSquare className="h-3.5 w-3.5" /> {t('Community')}
            </span>
            <h1 className="text-3xl font-extrabold md:text-4xl">
              <AnimatedText text={t('Doctor insights & advice')} />
            </h1>
            <p className="mt-2 max-w-xl text-white/85">
              {t('Public health reports and practical advice from our doctors — and a space for them to share and discuss.')}
            </p>
          </BlurFade>
          {(role === 'doctor' || role === 'admin') && (
            <BlurFade delay={0.1}>
              <Button className="bg-white text-primary hover:bg-white/90" asChild>
                <Link to="/community/new"><PenSquare className="mr-1.5 h-4 w-4" /> {t('Write an article')}</Link>
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
                {t(f.label)}
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-10"
              placeholder={t('Search by topic or question…')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label={t('Search by topic or question…')}
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
            <p className="text-lg font-medium text-foreground">
              {isSearching ? t('No articles match your search.') : t('No articles yet')}
            </p>
            <p className="mt-1 text-sm">
              {isSearching
                ? t('Try different words, or ask the Health Assistant.')
                : role === 'doctor'
                  ? t('Be the first to share an insight with your patients.')
                  : t('Check back soon for advice from our doctors.')}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
