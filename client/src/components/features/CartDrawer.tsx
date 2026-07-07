import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { ShoppingBag, X, Plus, Minus, Trash2, Check, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore, cartCount, cartTotal } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { placeOrder } from '@/services/api';
import { formatDT } from '@/data/products';
import { lockScroll, unlockScroll } from '@/lib/scroll-lock';

const FREE_SHIPPING_THRESHOLD = 150;
const SHIPPING_FEE = 7;

export function CartDrawer() {
  const { items, isOpen, close, setQuantity, remove, clear } = useCartStore();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<string | null>(null);

  const count = cartCount(items);
  const subtotal = cartTotal(items);
  const shipping = items.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  // Escape to close + lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    lockScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [isOpen, close]);

  const handleClose = () => {
    close();
    // Reset the confirmation once the drawer has slid away
    window.setTimeout(() => setOrder(null), 300);
  };

  const checkoutMutation = useMutation({
    mutationFn: () =>
      placeOrder(
        items.map(({ product, quantity }) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          image: product.image,
        }))
      ),
    onSuccess: created => {
      setOrder(created.reference);
      clear();
    },
    onError: (e: Error) => toast.error(e.message || 'Could not place the order'),
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-60" role="dialog" aria-modal="true" aria-label="Shopping bag">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <ShoppingBag className="h-5 w-5 text-primary" />
                {order ? 'Order confirmed' : `Your bag${count ? ` (${count})` : ''}`}
              </h2>
              <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close bag">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {order ? (
              <OrderConfirmation reference={order} onClose={handleClose} />
            ) : items.length === 0 ? (
              <EmptyBag onClose={handleClose} />
            ) : (
              <>
                {/* Items */}
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {items.map(({ product, quantity }) => (
                    <div key={product.id} className="flex gap-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-20 w-20 shrink-0 rounded-xl border object-cover"
                        loading="lazy"
                      />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold leading-tight">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.category}</p>
                          </div>
                          <button
                            onClick={() => remove(product.id)}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                            aria-label={`Remove ${product.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="inline-flex items-center rounded-lg border">
                            <button
                              onClick={() => setQuantity(product.id, quantity - 1)}
                              className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                            <button
                              onClick={() => setQuantity(product.id, quantity + 1)}
                              className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-bold text-primary">{formatDT(product.price * quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="border-t px-5 py-4">
                  {shipping === 0 ? (
                    <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-accent">
                      <Truck className="h-3.5 w-3.5" /> Free delivery unlocked
                    </p>
                  ) : (
                    <p className="mb-3 text-xs text-muted-foreground">
                      Add {formatDT(FREE_SHIPPING_THRESHOLD - subtotal)} more for free delivery.
                    </p>
                  )}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatDT(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery</span>
                      <span>{shipping === 0 ? 'Free' : formatDT(shipping)}</span>
                    </div>
                    <div className="flex justify-between pt-1 text-base font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatDT(total)}</span>
                    </div>
                  </div>
                  {user ? (
                    <Button
                      className="mt-4 w-full"
                      size="lg"
                      onClick={() => checkoutMutation.mutate()}
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending ? 'Placing order…' : `Checkout · ${formatDT(total)}`}
                    </Button>
                  ) : (
                    <Button className="mt-4 w-full" size="lg" asChild onClick={handleClose}>
                      <Link to="/login">Sign in to checkout</Link>
                    </Button>
                  )}
                  <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" /> Demo checkout — no payment is taken.
                  </p>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function EmptyBag({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <ShoppingBag className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="font-semibold">Your bag is empty</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Browse the health shop to add thermometers, supplements, and everyday parapharmacie essentials.
      </p>
      <Button variant="outline" className="mt-2" onClick={onClose}>
        Continue shopping
      </Button>
    </div>
  );
}

function OrderConfirmation({ reference, onClose }: { reference: string; onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 260 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent"
      >
        <Check className="h-8 w-8" />
      </motion.div>
      <p className="font-display text-lg font-bold">Thank you for your order</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Your order <span className="font-semibold text-foreground">{reference}</span> has been placed.
        You can follow it in your dashboard under “My orders”.
      </p>
      <Button className="mt-2" onClick={onClose}>
        Continue shopping
      </Button>
    </div>
  );
}
