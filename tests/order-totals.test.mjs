import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveOrderTotals } from '../lib/orders/order-totals.ts';

test('COD snapshot reconciles', () => assert.deepEqual(resolveOrderTotals({ subtotal: 45, shipping_charge: 110, cod_charge: 50, grand_total: 205, payment_method: 'COD' }), { productSubtotal: 45, subtotal: 45, shippingCharge: 110, codCharge: 50, discountAmount: 0, grandTotal: 205, isCod: true, usedHistoricalCodFallback: false }));
test('online has zero COD', () => assert.equal(resolveOrderTotals({ subtotal: 45, shipping_charge: 110, cod_charge: 0, grand_total: 155, payment_method: 'ONLINE' }).codCharge, 0));
test('discount snapshot reconciles original product subtotal', () => { const result = resolveOrderTotals({ subtotal: 90, discount_amount: 10, shipping_charge: 80, cod_charge: 40, grand_total: 210, payment_method: 'COD' }); assert.equal(result.productSubtotal, 100); assert.equal(result.productSubtotal - result.discountAmount + result.shippingCharge + result.codCharge, result.grandTotal); });
test('historical COD uses residual only for compatibility', () => { const result = resolveOrderTotals({ subtotal: 45, shipping_charge: 110, grand_total: 205, payment_method: 'COD' }); assert.equal(result.codCharge, 50); assert.equal(result.usedHistoricalCodFallback, true); });
test('free shipping and no courier charge reconcile with COD', () => { assert.equal(resolveOrderTotals({ subtotal: 1000, shipping_charge: 0, cod_charge: 50, grand_total: 1050, payment_method: 'COD' }).grandTotal, 1050); assert.equal(resolveOrderTotals({ subtotal: 500, shipping_charge: 0, cod_charge: 40, grand_total: 540, payment_method: 'COD' }).codCharge, 40); });
