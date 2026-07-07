import { useRef } from 'react';
import { ShoppingBag, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { useCartStore } from '@/stores/cartStore';
import { formatDT, type Product } from '@/data/products';
import { cn } from '@/lib/utils';

const HOVER_PREVIEW_MS = 1000;

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  /** Compact card for the home marquee (no full details / add button below). */
  compact?: boolean;
}

/**
 * Grid product card. Hovering for ~1s (fine pointers only) opens the quick-view;
 * a bar under the image fills over that second to signal it. Touch users tap the eye button.
 */
export function ProductCard({ product, onQuickView, compact = false }: ProductCardProps) {
  const add = useCartStore(s => s.add);
  const timer = useRef<number | null>(null);

  const startHover = () => {
    if (window.matchMedia?.('(hover: none)').matches) return;
    clearHover();
    timer.current = window.setTimeout(() => onQuickView(product), HOVER_PREVIEW_MS);
  };
  const clearHover = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return (
    <figure
      onMouseEnter={startHover}
      onMouseLeave={clearHover}
      className={cn(
        'group/card relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5',
        compact ? 'w-54 shrink-0' : 'h-full'
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
        />
        {product.tag && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-primary shadow-sm backdrop-blur">
            {product.tag}
          </span>
        )}

        {/* Quick-view button (immediate; also the touch fallback) */}
        <button
          onClick={() => onQuickView(product)}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity duration-200 hover:bg-background group-hover/card:opacity-100"
          aria-label={`Quick view ${product.name}`}
        >
          <Eye className="h-4 w-4" />
        </button>

        {/* Hover-hold progress: fills over 1s, matching the preview timer */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-primary transition-transform duration-1000 ease-linear group-hover/card:scale-x-100"
        />
      </div>

      <figcaption className={cn('flex flex-1 flex-col', compact ? 'p-3.5' : 'p-4')}>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">{product.category}</span>
        <h3 className="mt-0.5 truncate text-sm font-semibold">{product.name}</h3>
        {compact ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{product.short}</p>
        ) : (
          <div className="mt-1">
            <StarRating value={product.rating} count={product.reviews} size={13} />
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-primary">{formatDT(product.price)}</span>
            {product.compareAt && (
              <span className="text-xs text-muted-foreground line-through">{formatDT(product.compareAt)}</span>
            )}
          </div>
          {compact ? (
            <button
              onClick={() => add(product)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary hover:text-primary-foreground"
              aria-label={`Add ${product.name} to bag`}
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => add(product)}>
              <ShoppingBag className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
