import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { calculateTemporarySlabCharges } from '../lib/pricing/temporary-slabs.ts';

const baseRules = { pricing_mode: 'temporary_slabs', free_shipping_enabled: false, free_shipping_threshold: 999, apply_courier_charge: true, shipping_slab_500g: 80, shipping_slab_1000g: 110, shipping_slab_2000g: 140, temporary_max_weight_grams: 2000, courier_markup_pct: 30, weight_buffer_pct: 0, cod_fee_type: 'tiered', cod_fee_flat: 40, cod_fee_threshold: 1000, cod_fee_above_threshold: 50 };
const quote = (weight, subtotal = 500, paymentMethod = 'ONLINE', overrides = {}) => calculateTemporarySlabCharges({ actualWeightGrams: weight, discountedSubtotal: subtotal, paymentMethod, rules: { ...baseRules, ...overrides } });

test('temporary slab boundaries and combined weight', () => {
  assert.equal(quote(300).shippingCharge, 80); assert.equal(quote(500).shippingCharge, 80);
  assert.equal(quote(501).shippingCharge, 110); assert.equal(quote(1000).shippingCharge, 110);
  assert.equal(quote(1001).shippingCharge, 140); assert.equal(quote(2000).shippingCharge, 140);
  assert.throws(() => quote(2001), /exceeds/); assert.equal(quote(300 + 300).shippingCharge, 110);
});
test('free shipping uses discounted subtotal and admin controls', () => {
  assert.equal(quote(300, 999).shippingCharge, 80);
  assert.equal(quote(300, 998, 'ONLINE', { free_shipping_enabled: true }).shippingCharge, 80);
  assert.equal(quote(300, 999, 'ONLINE', { free_shipping_enabled: true }).shippingCharge, 0);
  assert.equal(quote(300, 800, 'ONLINE', { apply_courier_charge: false }).shippingCharge, 0);
});
test('COD tier, boundary, prepaid, and flat mode', () => {
  assert.equal(quote(300, 999, 'COD').codCharge, 40); assert.equal(quote(300, 1000, 'COD').codCharge, 50);
  assert.equal(quote(300, 999, 'ONLINE').codCharge, 0); assert.equal(quote(300, 1200, 'COD', { cod_fee_type: 'flat' }).codCharge, 40);
});
test('missing exact weight is rejected', () => { assert.throws(() => quote(0), /missing or invalid/); });
test('server engine ignores client-supplied prices and uses exact product weight', async () => {
  const source = await readFile(new URL('../lib/pricing/pricing-engine.ts', import.meta.url), 'utf8');
  assert.match(source, /net_weight_grams/);
  assert.match(source, /const originalPrice = Number\(product\.price\)/);
  assert.doesNotMatch(source, /item\.(price|weight_kg|net_weight)/);
});
