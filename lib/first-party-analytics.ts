'use client';

type CommerceEventType = 'add_to_cart' | 'begin_checkout' | 'purchase';

function randomId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getVisitorId() {
  const key = 'ab_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = randomId('v');
    localStorage.setItem(key, id);
  }
  return id;
}

export function getSessionId() {
  const key = 'ab_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = randomId('s');
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function trackFirstPartyCommerceEvent(input: {
  eventType: CommerceEventType;
  productId?: string;
  quantity?: number;
  value?: number;
  orderNumber?: string;
  dedupeKey?: string;
}) {
  if (typeof window === 'undefined') return;

  const dedupeStorageKey = input.dedupeKey ? `ab:event:${input.dedupeKey}` : null;
  if (dedupeStorageKey && localStorage.getItem(dedupeStorageKey)) return;

  const payload = {
    clientEventId: randomId('evt'),
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    eventType: input.eventType,
    productId: input.productId || null,
    quantity: Math.max(1, Number(input.quantity || 1)),
    value: Math.max(0, Number(input.value || 0)),
    orderNumber: input.orderNumber || null,
    pagePath: window.location.pathname,
  };

  void fetch('/api/analytics/commerce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).then((response) => {
    if (response.ok && dedupeStorageKey) {
      localStorage.setItem(dedupeStorageKey, '1');
    }
  }).catch(() => {
    // Analytics must never block the shopping flow.
  });
}


export async function saveAbandonedCheckout(input: {
  fullName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  cart: any[];
  cartValue: number;
}) {
  if (typeof window === 'undefined') return;

  const response = await fetch('/api/analytics/abandoned-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      ...input,
    }),
    keepalive: true,
  }).catch(() => null);

  return response?.ok === true;
}

export async function markAbandonedCheckoutConverted(orderNumber: string) {
  if (typeof window === 'undefined' || !orderNumber) return;

  await fetch('/api/analytics/abandoned-checkout/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      orderNumber,
    }),
    keepalive: true,
  }).catch(() => null);
}
