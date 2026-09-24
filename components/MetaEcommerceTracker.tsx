'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function cart(): any[] {
  try {
    const v = JSON.parse(localStorage.getItem('sastabazar_cart') || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

function value(items: any[]) {
  return items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
}

function ids(items: any[]) {
  return items.map(i => String(i.product_id || i.id || '')).filter(Boolean);
}

function contents(items: any[]) {
  return items.map(i => ({ id: String(i.product_id || i.id || ''), quantity: Number(i.quantity || 1), item_price: Number(i.price || 0) }));
}

function send(name: string, params: Record<string, unknown>) {
  const fbq = (window as any).fbq;
  if (typeof fbq !== 'function') return false;
  fbq('track', name, params);
  return true;
}

function signature(items: any[]) {
  return items.map(i => `${i.product_id || i.id}:${i.size || ''}:${Number(i.quantity || 1)}:${Number(i.price || 0)}`).sort().join('|');
}

function added(before: any[], after: any[]) {
  const old = new Map<string, number>();
  before.forEach(i => old.set(`${i.product_id || i.id}:${i.size || ''}`, Number(i.quantity || 1)));
  return after.flatMap(i => {
    const key = `${i.product_id || i.id}:${i.size || ''}`;
    const delta = Number(i.quantity || 1) - (old.get(key) || 0);
    return delta > 0 ? [{ ...i, quantity: delta }] : [];
  });
}

export default function MetaEcommerceTracker() {
  const pathname = usePathname();
  const previous = useRef<any[]>([]);
  const lastCart = useRef<any[]>([]);

  useEffect(() => {
    previous.current = cart();
    if (previous.current.length) lastCart.current = previous.current;
    const onUpdate = () => {
      const next = cart();
      const items = added(previous.current, next);
      if (items.length) send('AddToCart', { content_ids: ids(items), contents: contents(items), content_type: 'product', currency: 'INR', value: value(items) });
      if (next.length) lastCart.current = next;
      previous.current = next;
    };
    window.addEventListener('cartUpdated', onUpdate);
    return () => window.removeEventListener('cartUpdated', onUpdate);
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith('/product/')) return;
    const productId = decodeURIComponent(pathname.split('/product/')[1]?.split('/')[0] || '');
    if (!productId) return;
    const timer = window.setTimeout(() => {
      const key = `meta:view:${productId}`;
      if (sessionStorage.getItem(key)) return;
      let item: any = null;
      try {
        const recent = JSON.parse(localStorage.getItem('sastabazar_recent') || '[]');
        if (Array.isArray(recent)) item = recent.find((x: any) => String(x.id || x.product_id) === productId) || null;
      } catch {}
      const p = item || { id: productId, product_id: productId, title: document.title, price: 0 };
      if (send('ViewContent', { content_ids: [String(p.product_id || p.id)], content_name: p.title || document.title, content_type: 'product', currency: 'INR', value: Number(p.price || 0) })) sessionStorage.setItem(key, '1');
    }, 800);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== '/checkout') return;
    const items = cart();
    if (!items.length) return;
    lastCart.current = items;
    const key = `meta:checkout:${signature(items)}`;
    if (!sessionStorage.getItem(key) && send('InitiateCheckout', { content_ids: ids(items), contents: contents(items), content_type: 'product', currency: 'INR', num_items: items.reduce((s, i) => s + Number(i.quantity || 1), 0), value: value(items) })) sessionStorage.setItem(key, '1');
  }, [pathname]);

  useEffect(() => {
    if (pathname !== '/checkout') return;
    const detect = () => {
      const text = document.body.innerText || '';
      if (!text.includes('Order Placed Successfully!')) return;
      const orderId = text.match(/verified order reference is\s+([^\s.]+)/i)?.[1]?.trim();
      if (!orderId || !lastCart.current.length) return;
      const key = `meta:purchase:${orderId}`;
      const items = lastCart.current;
      const verifiedValue = Number(document.querySelector('[data-meta-purchase-value]')?.getAttribute('data-meta-purchase-value'));
      const purchaseValue = Number.isFinite(verifiedValue) && verifiedValue > 0 ? verifiedValue : value(items);
      if (!sessionStorage.getItem(key) && send('Purchase', { content_ids: ids(items), contents: contents(items), content_type: 'product', currency: 'INR', num_items: items.reduce((s, i) => s + Number(i.quantity || 1), 0), order_id: orderId, value: purchaseValue })) sessionStorage.setItem(key, '1');
    };
    const observer = new MutationObserver(detect);
    observer.observe(document.body, { childList: true, subtree: true });
    detect();
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
