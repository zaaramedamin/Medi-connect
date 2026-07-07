import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { BlurFade } from '@/components/ui/blur-fade';
import { Marquee } from '@/components/ui/marquee';
import { ProductCard } from '@/components/features/ProductCard';
import { ProductQuickView } from '@/components/features/ProductQuickView';
import { PRODUCTS, type Product } from '@/data/products';

// A curated selection for the home strip; the full catalog lives on /shop.
const FEATURED = PRODUCTS.slice(0, 9);

export function HealthProducts() {
  const [quickView, setQuickView] = useState<Product | null>(null);

  return (
    <section className="overflow-hidden py-16">
      <div className="container">
        <BlurFade>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                <ShoppingBag className="h-3.5 w-3.5" /> Health shop
              </span>
              <h2 className="mb-1 text-2xl font-bold md:text-3xl">Parapharmacie, delivered</h2>
              <p className="text-sm text-muted-foreground">
                Devices, supplements, skincare &amp; everyday essentials — hover a product to preview it.
              </p>
            </div>
            <Link
              to="/shop"
              className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex"
            >
              Visit the shop <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </BlurFade>
      </div>

      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-background to-transparent md:w-32" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-background to-transparent md:w-32" />
        <Marquee pauseOnHover className="[--duration:48s]">
          {FEATURED.map(product => (
            <ProductCard key={product.id} product={product} onQuickView={setQuickView} compact />
          ))}
        </Marquee>
      </div>

      <ProductQuickView product={quickView} onClose={() => setQuickView(null)} />
    </section>
  );
}
