import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/data/products';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  add: (product: Product, quantity?: number) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    set => ({
      items: [],
      isOpen: false,

      add: (product, quantity = 1) =>
        set(s => {
          const existing = s.items.find(i => i.product.id === product.id);
          const items = existing
            ? s.items.map(i =>
                i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
              )
            : [...s.items, { product, quantity }];
          return { items, isOpen: true };
        }),

      remove: id => set(s => ({ items: s.items.filter(i => i.product.id !== id) })),

      setQuantity: (id, quantity) =>
        set(s => ({
          items:
            quantity <= 0
              ? s.items.filter(i => i.product.id !== id)
              : s.items.map(i => (i.product.id === id ? { ...i, quantity } : i)),
        })),

      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    {
      name: 'medi-connect-cart',
      partialize: s => ({ items: s.items }),
    }
  )
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);
export const cartTotal = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity * i.product.price, 0);
