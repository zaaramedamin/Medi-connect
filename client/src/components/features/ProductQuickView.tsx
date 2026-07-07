import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X, Check, ShoppingBag, Minus, Plus, Truck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { useCartStore } from '@/stores/cartStore';
import { formatDT, type Product } from '@/data/products';
import { lockScroll, unlockScroll } from '@/lib/scroll-lock';

/** Animated product preview that opens after hovering a product for ~2s (or on click). */
export function ProductQuickView({ product, onClose }: { product: Product | null; onClose: () => void }) {
  // Portal to the body so the page's transform/blur wrapper can't break the
  // modal's fixed, centred positioning.
  return createPortal(
    <AnimatePresence>
      {product && <QuickViewInner key={product.id} product={product} onClose={onClose} />}
    </AnimatePresence>,
    document.body
  );
}

function QuickViewInner({ product, onClose }: { product: Product; onClose: () => void }) {
  const add = useCartStore(s => s.add);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    lockScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [onClose]);

  const addToBag = () => {
    add(product, qty);
    onClose(); // hand off to the cart drawer, which opens on add
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="relative z-10 grid w-full max-w-3xl overflow-hidden rounded-3xl border bg-card shadow-2xl md:grid-cols-2"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      >
        {/* Image */}
        <div className="relative aspect-4/3 overflow-hidden bg-muted md:aspect-auto">
          <motion.img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
            initial={{ scale: 1.12 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
          {product.tag && (
            <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-primary shadow-sm backdrop-blur">
              {product.tag}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex max-h-[85vh] flex-col overflow-y-auto p-6 md:p-7">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent">{product.category}</span>
          <h2 className="mt-1 font-display text-xl font-bold leading-tight md:text-2xl">{product.name}</h2>
          <div className="mt-2">
            <StarRating value={product.rating} count={product.reviews} size={16} />
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{formatDT(product.price)}</span>
            {product.compareAt && (
              <span className="text-sm text-muted-foreground line-through">{formatDT(product.compareAt)}</span>
            )}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          <ul className="mt-4 grid gap-2">
            {product.highlights.map((h, i) => (
              <motion.li
                key={h}
                className="flex items-center gap-2 text-sm"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.06 }}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
                  <Check className="h-3 w-3" />
                </span>
                {h}
              </motion.li>
            ))}
          </ul>

          <div className="mt-5 flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl border">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-semibold tabular-nums">{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button className="flex-1" size="lg" onClick={addToBag}>
              <ShoppingBag className="mr-1.5 h-4 w-4" /> Add to bag
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-accent" />Free delivery over 150 DT</span>
            <span className="flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5 text-accent" />14-day returns</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </div>
  );
}
