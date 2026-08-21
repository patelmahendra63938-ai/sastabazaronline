import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNimbusCustomerPricing,
  NimbusCustomerPricingError,
} from '../lib/pricing/nimbus-customer-pricing.ts';

test('COD marks up only the non-COD courier cost', () => {
  const result = calculateNimbusCustomerPricing(
    { totalPaise: 7500, codChargesPaise: 1500 },
    'cod'
  );
  assert.deepEqual(result, {
    nimbusTotalPaise: 7500,
    nimbusCodPaise: 1500,
    nonCodCourierPaise: 6000,
    customerDeliveryPaise: 7800,
    customerCodPaise: 1500,
  });
  assert.equal(result.customerCodPaise, 1500);
  assert.equal(result.customerDeliveryPaise + result.customerCodPaise, 9300);
});

test('prepaid marks up the complete courier total and has zero COD', () => {
  const result = calculateNimbusCustomerPricing(
    { totalPaise: 6000, codChargesPaise: 999 },
    'prepaid'
  );
  assert.equal(result.customerDeliveryPaise, 7800);
  assert.equal(result.customerCodPaise, 0);
});

test('integer paise markup always rounds upward', () => {
  assert.equal(
    calculateNimbusCustomerPricing({ totalPaise: 1 }, 'prepaid').customerDeliveryPaise,
    2
  );
});

test('surcharge and insurance already included in total remain in non-COD base', () => {
  const result = calculateNimbusCustomerPricing(
    { totalPaise: 8000, codChargesPaise: 1000 },
    'cod'
  );
  assert.equal(result.nonCodCourierPaise, 7000);
  assert.equal(result.customerDeliveryPaise, 9100);
});

for (const rate of [
  { codChargesPaise: 0 },
  { totalPaise: 0, codChargesPaise: 0 },
  { totalPaise: 1000.5, codChargesPaise: 0 },
  { totalPaise: 1000, codChargesPaise: 1001 },
  { totalPaise: 1000, codChargesPaise: -1 },
]) {
  test(`invalid live rate fails closed: ${JSON.stringify(rate)}`, () => {
    assert.throws(
      () => calculateNimbusCustomerPricing(rate, 'cod'),
      NimbusCustomerPricingError
    );
  });
}

test('a fresh final quote can change both persisted customer charges', () => {
  const preview = calculateNimbusCustomerPricing(
    { totalPaise: 7500, codChargesPaise: 1500 },
    'cod'
  );
  const final = calculateNimbusCustomerPricing(
    { totalPaise: 8000, codChargesPaise: 1800 },
    'cod'
  );
  assert.notEqual(final.customerDeliveryPaise, preview.customerDeliveryPaise);
  assert.notEqual(final.customerCodPaise, preview.customerCodPaise);
});

test('persisted rupee snapshots reconcile exactly from integer paise', () => {
  const productSubtotalPaise = 4500;
  const live = calculateNimbusCustomerPricing(
    { totalPaise: 7500, codChargesPaise: 1500 },
    'cod'
  );
  const snapshot = {
    shipping_charge: live.customerDeliveryPaise / 100,
    cod_charge: live.customerCodPaise / 100,
    actual_courier_cost: live.nimbusTotalPaise / 100,
    grand_total:
      (productSubtotalPaise + live.customerDeliveryPaise + live.customerCodPaise) / 100,
  };
  assert.deepEqual(snapshot, {
    shipping_charge: 78,
    cod_charge: 15,
    actual_courier_cost: 75,
    grand_total: 138,
  });
});
