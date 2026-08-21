import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('checkout preview performs live verification after authoritative pricing', async () => {
  const source = await readFile(new URL('../app/api/shipping/check-pincode/route.ts', import.meta.url), 'utf8');
  const pricingIndex = source.indexOf('calculateAuthoritativeOrderPricing');
  const serviceabilityIndex = source.indexOf('await verifyLiveServiceability');
  assert.ok(pricingIndex >= 0);
  assert.ok(serviceabilityIndex > pricingIndex);
  assert.match(source, /Math\.round\(quote\.discountedSubtotal \* 100\)/);
  assert.match(source, /useLiveDeliveryPricing: true/);
  assert.doesNotMatch(source, /body\.(pickupPincode|weight_kg|courierId|actualCourierCost)/);
});

test('final order revalidates immediately before the secure atomic RPC', async () => {
  const source = await readFile(new URL('../actions/checkout.ts', import.meta.url), 'utf8');
  const serviceabilityIndex = source.indexOf('liveDelivery = await verifyLiveServiceability');
  const rpcIndex = source.indexOf("dbSupabase.rpc('place_order_atomic_secure'");
  assert.ok(serviceabilityIndex >= 0);
  assert.ok(rpcIndex > serviceabilityIndex);
  assert.match(source, /useLiveDeliveryPricing: true/);
  assert.match(source, /p_actual_courier_cost: liveDelivery\.actualCourierCost/);
  assert.match(source, /p_courier_partner: courierPartner/);
  assert.match(source, /customerDeliveryPaise \/ 100/);
  assert.match(source, /customerCodPaise \/ 100/);
  assert.match(source, /p_shipping_charge: customerShippingCharge/);
  assert.match(source, /p_cod_charge: appliedCodCharge/);
  assert.match(source, /p_grand_total: grandTotal/);
});

test('active quote path contains no V1 endpoint or fabricated courier fallback', async () => {
  const files = await Promise.all([
    readFile(new URL('../app/api/shipping/check-pincode/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../actions/checkout.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/shipping/live-serviceability.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/nimbuspost/v2-client.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/nimbuspost/v2-transport.ts', import.meta.url), 'utf8'),
  ]);
  const source = files.join('\n');
  assert.doesNotMatch(source, /api\.nimbuspost\.com\/v1/);
  assert.doesNotMatch(source, /Express Courier|Standard Courier|395006|0\.5 kg|baseCourierRate = 45/);
});

test('package builder uses only authoritative product physical fields', async () => {
  const source = await readFile(new URL('../lib/shipping/package-builder.ts', import.meta.url), 'utf8');
  assert.match(source, /product\.net_weight_grams/);
  assert.match(source, /product\.package_length_cm/);
  assert.match(source, /product\.package_width_cm/);
  assert.match(source, /product\.package_height_cm/);
  assert.match(source, /quantity: item\.quantity/);
  assert.doesNotMatch(source, /item\.(weight_kg|net_weight_grams|package_length_cm|package_width_cm|package_height_cm|price|courierId)/);
});

test('actual courier cost is internal totalPaise converted to rupees without GST addition', async () => {
  const liveSource = await readFile(new URL('../lib/shipping/live-serviceability.ts', import.meta.url), 'utf8');
  const routeSource = await readFile(new URL('../app/api/shipping/check-pincode/route.ts', import.meta.url), 'utf8');
  assert.match(liveSource, /actualCourierCost: selectedCourier\.result\.totalPaise \/ 100/);
  assert.doesNotMatch(liveSource, /totalPaise\s*\*\s*1\.18|actualCourierCost[^\n]*\+\s*tax/i);
  assert.doesNotMatch(routeSource, /actualCourierCost:\s*liveDelivery/);
});

test('live customer quote replaces legacy slabs and COD tiers without exposing internal cost', async () => {
  const routeSource = await readFile(new URL('../app/api/shipping/check-pincode/route.ts', import.meta.url), 'utf8');
  assert.match(routeSource, /customerDeliveryPaise \/ 100/);
  assert.match(routeSource, /customerCodPaise \/ 100/);
  assert.doesNotMatch(routeSource, /calculateTemporarySlabCharges|shipping_slab_500g|cod_fee_threshold/);
  assert.doesNotMatch(routeSource, /actualCourierCost|nimbusTotalPaise|courierId|requestId|traceId/);
});

test('browser-supplied shipping, COD, courier, weight, dimensions, and price are ignored', async () => {
  const routeSource = await readFile(new URL('../app/api/shipping/check-pincode/route.ts', import.meta.url), 'utf8');
  const actionSource = await readFile(new URL('../actions/checkout.ts', import.meta.url), 'utf8');
  const source = `${routeSource}\n${actionSource}`;
  assert.doesNotMatch(source, /body\.(shippingCharge|codCharge|courier|weight|dimensions|price)/);
  assert.doesNotMatch(source, /formData\.(shippingCharge|codCharge|courier|weight|dimensions|price)/);
});

test('application maps failed upstream serviceability to a generic customer 503', async () => {
  const routeSource = await readFile(new URL('../app/api/shipping/check-pincode/route.ts', import.meta.url), 'utf8');
  assert.match(routeSource, /customerServiceabilityError\(error\)/);
  assert.match(routeSource, /status: 503/);
  assert.doesNotMatch(routeSource, /error\.(code|detail|requestId|traceId)/);
});
