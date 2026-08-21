import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createCartQuoteSignature,
  getValidCheckoutQuote,
} from '../lib/checkout/quote-state.ts';
import { calculateNimbusCustomerPricing } from '../lib/pricing/nimbus-customer-pricing.ts';

const cart = [{ product_id: 'product-1', size: 'Free Size', quantity: 1 }];
const cartSignature = createCartQuoteSignature(cart);
const codQuote = {
  serviceable: true,
  originalProductPriceTotal: 625,
  discountDeductionAmount: 0,
  primaryOfferName: null,
  discountedSubtotal: 625,
  actualWeightGrams: 450,
  shippingCharge: 46.71,
  codCharge: 36.58,
  totalPayable: 708.29,
  courierName: 'Ekart',
  tatDays: 2,
  message: 'Delivery available via Ekart.',
};
const prepaidQuote = {
  ...codQuote,
  shippingCharge: 50,
  codCharge: 0,
  totalPayable: 675,
};
const cache = {
  COD: { mode: 'COD', pincode: '395004', cartSignature, quote: codQuote },
  ONLINE: { mode: 'ONLINE', pincode: '395004', cartSignature, quote: prepaidQuote },
};

test('COD quote is valid only for COD and cannot be reused for prepaid', () => {
  assert.equal(getValidCheckoutQuote({ COD: cache.COD }, 'COD', '395004', cartSignature), codQuote);
  assert.equal(getValidCheckoutQuote({ COD: cache.COD }, 'ONLINE', '395004', cartSignature), null);
});

test('failed or missing prepaid quote cannot produce a payable amount', () => {
  assert.equal(getValidCheckoutQuote({ COD: cache.COD }, 'ONLINE', '395004', cartSignature), null);
});

test('switching back to COD can reuse the still-valid COD quote', () => {
  assert.equal(getValidCheckoutQuote(cache, 'COD', '395004', cartSignature)?.totalPayable, 708.29);
});

test('PIN and cart changes invalidate both mode quotes', () => {
  assert.equal(getValidCheckoutQuote(cache, 'COD', '395005', cartSignature), null);
  assert.equal(getValidCheckoutQuote(cache, 'ONLINE', '395005', cartSignature), null);
  const changedCart = createCartQuoteSignature([{ ...cart[0], quantity: 2 }]);
  assert.equal(getValidCheckoutQuote(cache, 'COD', '395004', changedCart), null);
  assert.equal(getValidCheckoutQuote(cache, 'ONLINE', '395004', changedCart), null);
});

test('successful prepaid quote contains subtotal plus delivery and zero COD', () => {
  const quote = getValidCheckoutQuote(cache, 'ONLINE', '395004', cartSignature);
  assert.equal(quote.codCharge, 0);
  assert.equal(quote.totalPayable, quote.discountedSubtotal + quote.shippingCharge);
});

test('COD regression remains ₹46.71 delivery plus ₹36.58 COD', () => {
  const pricing = calculateNimbusCustomerPricing(
    { totalPaise: 7251, codChargesPaise: 3658 },
    'cod'
  );
  assert.equal(pricing.customerDeliveryPaise, 4671);
  assert.equal(pricing.customerCodPaise, 3658);
});

test('checkout renders QR only from a valid active quote and never uses product subtotal as fallback payable', async () => {
  const source = await readFile(new URL('../app/checkout/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /paymentMethod === 'ONLINE' && quote &&/);
  assert.match(source, /paymentMethod === 'ONLINE' && !quote &&/);
  assert.match(source, /const grandTotal = quote\?\.totalPayable \?\? null/);
  assert.doesNotMatch(source, /quote\?\.totalPayable \?\? displaySubtotal/);
});
