import { useMemo, useState } from 'react';
import { Search, ShoppingBag, Truck, ShieldCheck, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { BlurFade } from '@/components/ui/blur-fade';
import { AnimatedText } from '@/components/ui/animated-text';
import { HeroBackdrop } from '@/components/ui/hero-backdrop';
import { ProductCard } from '@/components/features/ProductCard';
import { ProductQuickView } from '@/components/features/ProductQuickView';
import { ProductAdvisor } from '@/components/features/ProductAdvisor';
import { PRODUCTS, PRODUCT_CATEGORIES, type Product } from '@/data/products';
import { useT } from '@/i18n';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

type SortMode = 'featured' | 'price-asc' | 'price-desc' | 'rating';

const CATEGORY_FILTERS = ['All', ...PRODUCT_CATEGORIES] as const;

const SELECT_CLASS =
  'h-10 rounded-xl border bg-card px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer';

export default function Shop() {
  const t = useT();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]>('All');
  const [sort, setSort] = useState<SortMode>('featured');
  const [quickView, setQuickView] = useState<Product | null>(null);
  const debounced = useDebounce(query, 250);

  const products = useMemo(() => {
    const q = debounced.toLowerCase().trim();
    const list = PRODUCTS.filter(p => {
      const matchesCat = category === 'All' || p.category === category;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.short.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
    const sorted = [...list];
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [debounced, category, sort]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <section className="relative overflow-hidden border-b">
        <HeroBackdrop image="/backgrounds/shop.jpg" />
        <div className="container relative py-16 text-white md:py-20">
          <BlurFade>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <ShoppingBag className="h-3.5 w-3.5" /> {t('Health shop')}
            </span>
            <h1 className="text-3xl font-extrabold md:text-4xl">
              <AnimatedText text={t('Parapharmacie & wellness')} />
            </h1>
            <p className="mt-2 max-w-xl text-white/85">
              {t('Home health devices, supplements, skincare, and everyday essentials — delivered to your door.')}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
              <span className="flex items-center gap-1.5"><Truck className="h-4 w-4" />{t('Free delivery over 150 DT')}</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" />{t('Authentic products')}</span>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* AI product advisor */}
      <section className="container pt-8">
        <ProductAdvisor onQuickView={setQuickView} />
      </section>

      {/* Controls */}
      <section className="container py-8">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 rounded-xl pl-11"
                placeholder={t('Search products…')}
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Search products"
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
            <select value={sort} onChange={e => setSort(e.target.value as SortMode)} className={SELECT_CLASS} aria-label="Sort products">
              <option value="featured">{t('Sort: Featured')}</option>
              <option value="rating">{t('Top rated')}</option>
              <option value="price-asc">{t('Price: low to high')}</option>
              <option value="price-desc">{t('Price: high to low')}</option>
            </select>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  category === c
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {t(c)}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          {products.length} product{products.length !== 1 ? 's' : ''}
          {category !== 'All' ? ` in ${category}` : ''}
          {debounced ? ` for “${debounced}”` : ''}
        </p>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {products.map((product, i) => (
              <BlurFade key={product.id} delay={Math.min(i, 8) * 0.04} className="h-full">
                <ProductCard product={product} onQuickView={setQuickView} />
              </BlurFade>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 opacity-30" />
            <p className="text-lg font-medium text-foreground">{t('No products found')}</p>
            <p className="mt-1 text-sm">{t('Try a different search or category.')}</p>
          </div>
        )}
      </section>

      <ProductQuickView product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}
