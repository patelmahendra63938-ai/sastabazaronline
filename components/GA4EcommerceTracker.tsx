'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toGA4Items, trackGA4Event } from '@/lib/analytics';

function readCart(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem('sastabazar_cart') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cartValue(cart: any[]) {
  return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
}

function cartSignature(cart: any[]) {
  return cart
    .map((item) => `${item.product_id || item.id}:${item.size || ''}:${Number(item.quantity || 1)}:${Number(item.price || 0)}`)
    .sort()
    .join('|');
}

function addedItems(previous: any[], current: any[]) {
  const prior = new Map<string, number>();

  for (const item of previous) {
    const key = `${item.product_id || item.id}:${item.size || ''}`;
    prior.set(key, Number(item.quantity || 1));
  }

  return current.flatMap((item) => {
    const key = `${item.product_id || item.id}:${item.size || ''}`;
    const before = prior.get(key) || 0;
    const now = Number(item.quantity || 1);
    const delta = now - before;
    if (delta <= 0) return [];
    return [{ ...item, quantity: delta }];
  });
}

export default function GA4EcommerceTracker() {
  const pathname = usePathname();
  const previousCartRef = useRef<any[]>([]);
  const lastNonEmptyCartRef = useRef<any[]>([]);

  useEffect(() => {
    const initialCart = readCart();
    previousCartRef.current = initialCart;
    if (initialCart.length > 0) lastNonEmptyCartRef.current = initialCart;

    const onCartUpdated = () => {
      const nextCart = readCart();
      const added = addedItems(previousCartRef.current, nextCart);

      if (added.length > 0) {
        trackGA4Event('add_to_cart', {
          currency: 'INR',
          value: cartValue(added),
          items: toGA4Items(added),
        });
      }

      if (nextCart.length > 0) lastNonEmptyCartRef.current = nextCart;
      previousCartRef.current = nextCart;
    };

    window.addEventListener('cartUpdated', onCartUpdated);
    return () => window.removeEventListener('cartUpdated', onCartUpdated);
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith('/product/')) return;

    const productId = decodeURIComponent(pathname.split('/product/')[1]?.split('/')[0] || '');
    if (!productId) return;

    const timer = window.setTimeout(() => {
      const dedupeKey = `ga4:view_item:${productId}`;
      if (sessionStorage.getItem(dedupeKey)) return;

      let item: any = null;
      try {
        const recent = JSON.parse(localStorage.getItem('sastabazar_recent') || '[]');
        if (Array.isArray(recent)) {
          item = recent.find((entry: any) => String(entry.id || entry.product_id) === productId) || null;
        }
      } catch {
        // Ignore malformed optional recently-viewed storage.
      }

      const analyticsItem = item || {
        id: productId,
        product_id: productId,
        title: document.title.replace(/\s*\|\s*SASTABAZARONLINE\s*$/i, '') || 'Product',
        price: 0,
        quantity: 1,
      };

      trackGA4Event('view_item', {
        currency: 'INR',
        value: Number(analyticsItem.price || 0),
        items: toGA4Items([{ ...analyticsItem, quantity: 1 }]),
      });
      sessionStorage.setItem(dedupeKey, '1');
    }, 800);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== '/checkout') return;

    const cart = readCart();
    if (cart.length === 0) return;

    lastNonEmptyCartRef.current = cart;
    const signature = cartSignature(cart);
    const dedupeKey = `ga4:begin_checkout:${signature}`;

    if (!sessionStorage.getItem(dedupeKey)) {
      trackGA4Event('begin_checkout', {
        currency: 'INR',
        value: cartValue(cart),
        items: toGA4Items(cart),
      });
      sessionStorage.setItem(dedupeKey, '1');
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname !== '/checkout') return;

    const detectPurchase = () => {
      const text = document.body.innerText || '';
      if (!text.includes('Order Placed Successfully!')) return;

      const match = text.match(/verified order reference is\s+([^\s.]+)/i);
      const transactionId = match?.[1]?.trim();
      if (!transactionId) return;

      const dedupeKey = `ga4:purchase:${transactionId}`;
      if (sessionStorage.getItem(dedupeKey)) return;

      const cart = lastNonEmptyCartRef.current;
      if (cart.length === 0) return;

      trackGA4Event('purchase', {
        transaction_id: transactionId,
        currency: 'INR',
        value: cartValue(cart),
        items: toGA4Items(cart),
      });
      sessionStorage.setItem(dedupeKey, '1');
    };

    const observer = new MutationObserver(detectPurchase);
    observer.observe(document.body, { childList: true, subtree: true });
    detectPurchase();

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
