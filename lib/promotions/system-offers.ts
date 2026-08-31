export type SystemOfferStatus = 'LIVE NOW' | 'UPCOMING' | 'EXPIRED' | 'DISABLED';

export interface SystemOfferDefinition {
  id: string;
  name: string;
  description: string;
  label: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumOrder: number | null;
  couponCode: string | null;
  campaignMode: 'AUTOMATIC' | 'COUPON' | 'BOTH';
  scope: 'ORDER' | 'PRODUCT';
  startAt: string;
  endAt: string;
  isEnabled: boolean;
}

export const WELCOME50_OFFER: SystemOfferDefinition = {
  id: 'system-welcome50',
  name: 'Website Launch Offer',
  description: 'Get ₹50 OFF on orders of ₹499 or more.',
  label: 'Website Launch Offer — ₹50 OFF on ₹499+',
  discountType: 'FIXED',
  discountValue: 50,
  minimumOrder: 499,
  couponCode: 'WELCOME50',
  campaignMode: 'AUTOMATIC',
  scope: 'ORDER',
  startAt: '2026-08-29T00:00:00+05:30',
  endAt: '2026-09-07T23:59:59.999+05:30',
  isEnabled: true,
};

export const SYSTEM_OFFERS: SystemOfferDefinition[] = [WELCOME50_OFFER];

export function getSystemOfferStatus(
  offer: SystemOfferDefinition,
  now = Date.now()
): SystemOfferStatus {
  if (!offer.isEnabled) return 'DISABLED';

  const start = Date.parse(offer.startAt);
  const end = Date.parse(offer.endAt);

  if (now < start) return 'UPCOMING';
  if (now > end) return 'EXPIRED';
  return 'LIVE NOW';
}

export function isSystemOfferActive(
  offer: SystemOfferDefinition,
  now = Date.now()
): boolean {
  return getSystemOfferStatus(offer, now) === 'LIVE NOW';
}
