'use client';

import { useEffect } from 'react';

const MAX_RETAIL_QTY_PER_PRODUCT_SIZE = 5;
const CART_KEY = 'sastabazar_cart';

function normalizeRetailCart() {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    let changed = false;
    const normalized = parsed.map((item: any) => {
      const quantity = Number(item?.quantity || 1);
      const safeQuantity = Math.min(
        MAX_RETAIL_QTY_PER_PRODUCT_SIZE,
        Math.max(1, Number.isFinite(quantity) ? Math.floor(quantity) : 1)
      );

      if (safeQuantity !== quantity) changed = true;
      return { ...item, quantity: safeQuantity };
    });

    if (changed) {
      localStorage.setItem(CART_KEY, JSON.stringify(normalized));
    }
  } catch {
    // Ignore malformed local cart data; cart/checkout already handle invalid storage.
  }
}

export default function RetailQuantityGuard() {
  useEffect(() => {
    normalizeRetailCart();

    const handleCartUpdated = () => normalizeRetailCart();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CART_KEY) normalizeRetailCart();
    };

    window.addEventListener('cartUpdated', handleCartUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return null;
}
