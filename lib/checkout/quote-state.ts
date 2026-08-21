export type CheckoutQuoteMode = 'COD' | 'ONLINE';

export interface CheckoutQuoteData {
  serviceable: true;
  originalProductPriceTotal: number;
  discountDeductionAmount: number;
  primaryOfferName: string | null;
  discountedSubtotal: number;
  actualWeightGrams: number;
  shippingCharge: number;
  codCharge: number;
  totalPayable: number;
  courierName: string | null;
  tatDays: number | null;
  message: string;
}

export interface CheckoutQuoteEntry {
  mode: CheckoutQuoteMode;
  pincode: string;
  cartSignature: string;
  quote: CheckoutQuoteData;
}

export type CheckoutQuoteCache = Partial<Record<CheckoutQuoteMode, CheckoutQuoteEntry>>;

export interface QuoteCartItem {
  id?: string;
  product_id?: string;
  size?: string;
  quantity?: number;
  selected_campaign_id?: string;
}

export function createCartQuoteSignature(cart: QuoteCartItem[]): string {
  return JSON.stringify(cart.map((item) => ({
    productId: String(item.product_id || item.id || ''),
    size: String(item.size || 'Free Size'),
    quantity: Number(item.quantity),
    campaignId: String(item.selected_campaign_id || ''),
  })));
}

export function getValidCheckoutQuote(
  cache: CheckoutQuoteCache,
  mode: CheckoutQuoteMode,
  pincode: string,
  cartSignature: string
): CheckoutQuoteData | null {
  const entry = cache[mode];
  return entry && entry.mode === mode && entry.pincode === pincode &&
    entry.cartSignature === cartSignature && entry.quote.serviceable === true
    ? entry.quote
    : null;
}
