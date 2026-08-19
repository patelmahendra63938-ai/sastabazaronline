import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeNimbusSignature,
  hasValidNimbusSignature,
  isDuplicateDeliveryError,
  isSupportedNimbusEvent,
  parseNimbusWebhookPayload,
  planNimbusEventProcessing,
} from '../lib/nimbuspost/webhook.ts';

const secret = 'test-webhook-secret';
const body = new TextEncoder().encode('{"example":true}');

test('accepts a valid raw-body HMAC signature', () => {
  assert.equal(hasValidNimbusSignature(body, computeNimbusSignature(body, secret), secret), true);
});

test('rejects invalid and missing signatures', () => {
  assert.equal(hasValidNimbusSignature(body, 'sha256=' + '0'.repeat(64), secret), false);
  assert.equal(hasValidNimbusSignature(body, null, secret), false);
});

test('rejects malformed JSON', () => {
  assert.throws(() => parseNimbusWebhookPayload(new TextEncoder().encode('{')), SyntaxError);
});

test('recognizes duplicate delivery database errors', () => {
  assert.equal(isDuplicateDeliveryError({ code: '23505' }), true);
  assert.equal(isDuplicateDeliveryError({ code: 'other' }), false);
});

for (const eventType of ['order.created', 'order.updated', 'tracking.updated']) {
  test(`queues ${eventType} without unsafe business side effects`, () => {
    assert.equal(isSupportedNimbusEvent(eventType), true);
    assert.deepEqual(planNimbusEventProcessing(eventType), {
      processingStatus: 'awaiting_payload_mapping',
      shouldResolveShipmentMapping: false,
      shouldSendNotifications: false,
    });
  });
}

test('records an unknown event as ignored', () => {
  assert.equal(isSupportedNimbusEvent('shipment.deleted'), false);
  assert.deepEqual(planNimbusEventProcessing('shipment.deleted'), {
    processingStatus: 'ignored_unsupported_event',
    shouldResolveShipmentMapping: false,
    shouldSendNotifications: false,
  });
});

test('does not resolve a missing shipment mapping or send notifications', () => {
  const plan = planNimbusEventProcessing('tracking.updated');
  assert.equal(plan.shouldResolveShipmentMapping, false);
  assert.equal(plan.shouldSendNotifications, false);
});
