import { createHmac, timingSafeEqual } from 'node:crypto';

export const SUPPORTED_NIMBUS_EVENTS = [
  'order.created',
  'order.updated',
  'tracking.updated',
] as const;

export type NimbusEventType = (typeof SUPPORTED_NIMBUS_EVENTS)[number];

export function computeNimbusSignature(rawBody: Uint8Array, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

export function hasValidNimbusSignature(
  rawBody: Uint8Array,
  suppliedSignature: string | null,
  secret: string
): boolean {
  if (!suppliedSignature || !/^sha256=[a-f0-9]{64}$/.test(suppliedSignature)) {
    return false;
  }

  const expected = Buffer.from(computeNimbusSignature(rawBody, secret), 'utf8');
  const supplied = Buffer.from(suppliedSignature, 'utf8');

  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function parseNimbusWebhookPayload(rawBody: Uint8Array): Record<string, unknown> {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(rawBody));

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Webhook payload must be a JSON object.');
  }

  return parsed as Record<string, unknown>;
}

export function isSupportedNimbusEvent(eventType: string): eventType is NimbusEventType {
  return SUPPORTED_NIMBUS_EVENTS.includes(eventType as NimbusEventType);
}

/**
 * The official event payload field mapping has not yet been supplied. This
 * boundary deliberately prevents status, shipment, inventory, or notification
 * side effects until identifiers and tracking fields can be mapped safely.
 */
export function planNimbusEventProcessing(eventType: string): {
  processingStatus: 'awaiting_payload_mapping' | 'ignored_unsupported_event';
  shouldResolveShipmentMapping: false;
  shouldSendNotifications: false;
} {
  return {
    processingStatus: isSupportedNimbusEvent(eventType)
      ? 'awaiting_payload_mapping'
      : 'ignored_unsupported_event',
    shouldResolveShipmentMapping: false,
    shouldSendNotifications: false,
  };
}

export function isDuplicateDeliveryError(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}
