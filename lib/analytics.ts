export type GA4Item = {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_category?: string;
  item_variant?: string;
};

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function trackGA4Event(eventName: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

export function toGA4Items(cart: any[]): GA4Item[] {
  return cart.map((item) => ({
    item_id: String(item.product_id || item.id || ''),
    item_name: String(item.title || 'Product'),
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 1),
    ...(item.category ? { item_category: String(item.category) } : {}),
    ...(item.size ? { item_variant: String(item.size) } : {}),
  }));
}
