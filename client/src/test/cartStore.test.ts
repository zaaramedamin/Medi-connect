import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore, cartCount, cartTotal } from '@/stores/cartStore';
import { PRODUCTS } from '@/data/products';

const [productA, productB] = PRODUCTS;

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false });
  });

  it('adds a product and opens the drawer', () => {
    useCartStore.getState().add(productA);
    const { items, isOpen } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
    expect(isOpen).toBe(true);
  });

  it('increments quantity when the same product is added again', () => {
    useCartStore.getState().add(productA);
    useCartStore.getState().add(productA, 2);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it('removes an item when quantity is set to zero', () => {
    useCartStore.getState().add(productA);
    useCartStore.getState().setQuantity(productA.id, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('computes count and total across products', () => {
    useCartStore.getState().add(productA, 2);
    useCartStore.getState().add(productB, 1);
    const { items } = useCartStore.getState();
    expect(cartCount(items)).toBe(3);
    expect(cartTotal(items)).toBe(productA.price * 2 + productB.price);
  });

  it('clears the bag', () => {
    useCartStore.getState().add(productA);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
