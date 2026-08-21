import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NimbusPostV2Error,
  requestNimbusServiceabilityWithConfig,
  selectLowestCostCourier,
} from '../lib/nimbuspost/v2-transport.ts';

const credentials = {
  apiKey: 'test-key',
  apiSecret: 'test-secret',
  pickupPincode: '111111',
};

function courier(overrides = {}) {
  return {
    courierId: '20',
    courierCode: 'C20',
    courierName: 'Documented Courier',
    courierDisplayName: 'Documented Courier',
    courierType: 'surface',
    zone: 'B',
    zoneLabel: 'Zone B',
    tatDays: 4,
    result: {
      chargeableGrams: 1000,
      chargedGrams: 1000,
      shippingChargesPaise: 9000,
      codChargesPaise: 1000,
      surchargesPaise: 0,
      insurancePaise: 0,
      rtoChargesPaise: 0,
      totalPaise: 10000,
      totalIfRtoPaise: 15000,
      taxableBasePaise: 10000,
      primarySlab: 'test',
    },
    ...overrides,
  };
}

function successResponse(available = [courier()]) {
  return {
    success: true,
    data: {
      pickupPincode: '111111',
      deliveryPincode: '222222',
      paymentMode: 'cod',
      totalChargeableGrams: 1000,
      available,
      excluded: [],
    },
  };
}

test('sends the exact COD V2 contract with authoritative paise', async () => {
  let captured;
  const response = await requestNimbusServiceabilityWithConfig(
    {
      deliveryPincode: '222222',
      paymentMode: 'cod',
      packages: [{ weight: 720, length: 28, width: 20, height: 4 }],
      orderValuePaise: 20500,
    },
    credentials,
    {
      fetchImpl: async (url, init) => {
        captured = { url, init };
        return Response.json(successResponse());
      },
    }
  );

  assert.equal(response.success, true);
  assert.equal(captured.url, 'https://api-v2.nimbuspost.com/v2/serviceability');
  assert.deepEqual(JSON.parse(captured.init.body), {
    pickupPincode: '111111',
    deliveryPincode: '222222',
    paymentMode: 'cod',
    packages: [{ weight: 720, length: 28, width: 20, height: 4 }],
    orderValuePaise: 20500,
  });
  assert.equal(captured.init.headers['x-api-key'], 'test-key');
  assert.equal(captured.init.headers['x-api-secret'], 'test-secret');
});

test('sends prepaid mode without a COD order value', async () => {
  let body;
  await requestNimbusServiceabilityWithConfig(
    {
      deliveryPincode: '222222',
      paymentMode: 'prepaid',
      packages: [{ weight: 720, length: 28.5, width: 20, height: 4 }],
    },
    credentials,
    {
      fetchImpl: async (_url, init) => {
        body = JSON.parse(init.body);
        return Response.json(successResponse());
      },
    }
  );
  assert.equal(body.paymentMode, 'prepaid');
  assert.equal('orderValuePaise' in body, false);
  assert.deepEqual(Object.keys(body).sort(), [
    'deliveryPincode',
    'packages',
    'paymentMode',
    'pickupPincode',
  ]);
  assert.deepEqual(body.packages, [
    { weight: 720, length: 28.5, width: 20, height: 4 },
  ]);
});

test('accepts a serviceable prepaid response without inventing COD data', async () => {
  const response = await requestNimbusServiceabilityWithConfig(
    {
      deliveryPincode: '222222',
      paymentMode: 'prepaid',
      packages: [{ weight: 720, length: 28, width: 20, height: 4 }],
    },
    credentials,
    {
      fetchImpl: async () => Response.json({
        ...successResponse(),
        data: { ...successResponse().data, paymentMode: 'prepaid' },
      }),
    }
  );
  assert.equal(response.success, true);
  assert.equal(response.data.paymentMode, 'prepaid');
  assert.equal(response.data.available.length, 1);
});

test('no available courier is not serviceable', () => {
  assert.equal(selectLowestCostCourier([]), null);
});

for (const [status, kind] of [[400, 'validation'], [401, 'authentication'], [422, 'validation'], [429, 'rate_limit']]) {
  test(`maps NimbusPost HTTP ${status} to ${kind}`, async () => {
    await assert.rejects(
      requestNimbusServiceabilityWithConfig(
        {
          deliveryPincode: '222222',
          paymentMode: 'cod',
          packages: [{ weight: 720, length: 28, width: 20, height: 4 }],
          orderValuePaise: 20500,
        },
        credentials,
        {
          fetchImpl: async () => Response.json(
            {
              success: false,
              error: { code: `HTTP_${status}`, detail: 'Test detail' },
              meta: { requestId: 'request-test', traceId: 'trace-test' },
            },
            { status }
          ),
        }
      ),
      (error) => {
        assert.equal(error instanceof NimbusPostV2Error, true);
        assert.equal(error.kind, kind);
        assert.equal(error.code, `HTTP_${status}`);
        assert.equal(error.requestId, 'request-test');
        return true;
      }
    );
  });
}

test('preserves an upstream HTTP 503 separately from the application response', async () => {
  await assert.rejects(
    requestNimbusServiceabilityWithConfig(
      {
        deliveryPincode: '222222',
        paymentMode: 'prepaid',
        packages: [{ weight: 720, length: 28, width: 20, height: 4 }],
      },
      credentials,
      {
        fetchImpl: async () => Response.json(
          {
            success: false,
            error: { code: 'UPSTREAM_UNAVAILABLE', detail: 'Provider unavailable' },
            meta: { requestId: 'request-503', traceId: 'trace-503' },
          },
          { status: 503 }
        ),
      }
    ),
    (error) => {
      assert.equal(error instanceof NimbusPostV2Error, true);
      assert.equal(error.status, 503);
      assert.equal(error.kind, 'api');
      assert.equal(error.code, 'UPSTREAM_UNAVAILABLE');
      assert.equal(error.detail, 'Provider unavailable');
      assert.equal(error.requestId, 'request-503');
      return true;
    }
  );
});

test('fails closed on timeout', async () => {
  await assert.rejects(
    requestNimbusServiceabilityWithConfig(
      {
        deliveryPincode: '222222',
        paymentMode: 'cod',
        packages: [{ weight: 720, length: 28, width: 20, height: 4 }],
        orderValuePaise: 20500,
      },
      credentials,
      {
        timeoutMs: 5,
        fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
      }
    ),
    (error) => error instanceof NimbusPostV2Error && error.kind === 'timeout'
  );
});

test('fails closed on network failure', async () => {
  await assert.rejects(
    requestNimbusServiceabilityWithConfig(
      {
        deliveryPincode: '222222',
        paymentMode: 'cod',
        packages: [{ weight: 720, length: 28, width: 20, height: 4 }],
        orderValuePaise: 20500,
      },
      credentials,
      { fetchImpl: async () => { throw new Error('offline'); } }
    ),
    (error) => error instanceof NimbusPostV2Error && error.kind === 'network'
  );
});

test('selects cheapest valid courier and breaks ties by courierId', () => {
  const selected = selectLowestCostCourier([
    courier({ courierId: '30', result: { ...courier().result, totalPaise: 9000 } }),
    courier({ courierId: '10', result: { ...courier().result, totalPaise: 9000 } }),
    courier({ courierId: '20', result: { ...courier().result, totalPaise: 10000 } }),
  ]);
  assert.equal(selected?.courierId, '10');
});
