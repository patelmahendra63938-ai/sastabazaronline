export const CHECKOUT_GST_COOKIE = 'adhyey_checkout_gst';

export type CheckoutGstSnapshot = {
  requested: true;
  gstin: string;
  billing_address: string;
  submitted_at: string;
  source: 'customer_provided';
};

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function normalizeCheckoutGstDetails(value: unknown): CheckoutGstSnapshot | null {
  if (!value || typeof value !== 'object') return null;

  const input = value as Record<string, unknown>;
  const requested = input.requested === true;
  const gstin = String(input.gstin || '').trim().toUpperCase();
  const billingAddress = String(input.billing_address || '').trim();

  if (!requested || !GSTIN_PATTERN.test(gstin) || billingAddress.length < 10) {
    return null;
  }

  return {
    requested: true,
    gstin,
    billing_address: billingAddress,
    submitted_at: new Date().toISOString(),
    source: 'customer_provided',
  };
}

export function parseCheckoutGstCookie(rawValue?: string | null): CheckoutGstSnapshot | null {
  if (!rawValue) return null;

  try {
    const decoded = decodeURIComponent(rawValue);
    return normalizeCheckoutGstDetails(JSON.parse(decoded));
  } catch {
    return null;
  }
}
