'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const MAX_RETAIL_QTY_PER_PRODUCT_SIZE = 5;
const CART_KEY = 'sastabazar_cart';

function normalizeRetailCart() {
  if (typeof window === 'undefined') return false;

  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;

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

    return changed;
  } catch {
    // Ignore malformed local cart data; cart/checkout already handle invalid storage.
    return false;
  }
}

export default function RetailQuantityGuard() {
  const [showLimitNotice, setShowLimitNotice] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    normalizeRetailCart();

    const showNotice = () => {
      setShowLimitNotice(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowLimitNotice(false), 5000);
    };

    const handleCartUpdated = () => {
      if (normalizeRetailCart()) showNotice();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === CART_KEY && normalizeRetailCart()) showNotice();
    };

    window.addEventListener('cartUpdated', handleCartUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdated);
      window.removeEventListener('storage', handleStorage);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!showLimitNotice) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-[#ead8b8] bg-white px-4 py-3 text-xs shadow-xl lg:bottom-6">
      <p className="font-black text-[#741f23]">Retail limit: max 5 pcs per Product + Size.</p>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
        Your cart was adjusted to 5 pcs for this size. Need a larger quantity?{' '}
        <Link href="/contact" className="font-black text-[#741f23] underline underline-offset-2">
          Bulk Order / Contact Us
        </Link>
      </p>
    </div>
  );
}
