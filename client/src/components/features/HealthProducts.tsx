import { ShoppingBag, Thermometer, HeartPulse, Activity, Pill, Droplet, Cross } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlurFade } from '@/components/ui/blur-fade';
import { cn } from '@/lib/utils';

const PRODUCTS = [
  { icon: Thermometer, name: 'Digital Thermometer', desc: 'Fast, accurate readings in 10 seconds.', price: 25, tag: 'Best seller' },
  { icon: HeartPulse, name: 'Blood Pressure Monitor', desc: 'Clinically validated home BP cuff.', price: 120, tag: null },
  { icon: Activity, name: 'Pulse Oximeter', desc: 'Track SpO₂ and heart rate at home.', price: 60, tag: null },
  { icon: Cross, name: 'First Aid Kit', desc: '80-piece kit for home and travel.', price: 45, tag: 'New' },
  { icon: Pill, name: 'Vitamin D3 Supplements', desc: '90 capsules · 2000 IU each.', price: 30, tag: null },
  { icon: Droplet, name: 'Hand Sanitizer Pack', desc: 'Pack of 5 · 70% alcohol gel.', price: 15, tag: null },
] as const;

export function HealthProducts() {
  return (
    <section className="container py-16">
      <BlurFade>
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-semibold mb-3">
            <ShoppingBag className="h-3.5 w-3.5" /> Health shop
          </span>
          <h2 className="text-2xl md:text-3xl font-bold mb-1">Medical products, delivered</h2>
          <p className="text-muted-foreground text-sm">Trusted health &amp; wellness essentials, brought to your door.</p>
        </div>
      </BlurFade>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {PRODUCTS.map(({ icon: Icon, name, desc, price, tag }, i) => (
          <BlurFade key={name} delay={0.05 * i} className="h-full">
            <div className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
              <div className={cn('relative flex aspect-[4/3] items-center justify-center bg-linear-to-br', i % 2 ? 'from-accent/15 to-primary/10' : 'from-primary/15 to-accent/10')}>
                <Icon className="h-14 w-14 text-primary transition-transform group-hover:scale-110" />
                {tag && <Badge variant="secondary" className="absolute left-3 top-3">{tag}</Badge>}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-semibold text-sm leading-tight">{name}</h3>
                <p className="mt-1 flex-1 text-xs text-muted-foreground">{desc}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-bold text-primary">{price} DT</span>
                  <Button size="sm" variant="outline">Add to cart</Button>
                </div>
              </div>
            </div>
          </BlurFade>
        ))}
      </div>
    </section>
  );
}
