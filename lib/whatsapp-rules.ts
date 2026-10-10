import { createHmac, timingSafeEqual } from 'node:crypto';

export function validWebhookSignature(raw: string, signature: string | null, secret: string) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'));
}
export function replyWindowOpen(timestamp: string | null, now = Date.now()) {
  const time = timestamp ? Date.parse(timestamp) : NaN;
  return Number.isFinite(time) && time <= now && now - time < 24 * 60 * 60 * 1000;
}
export function incomingText(message: Record<string, any>): string {
  if (message.type === 'text') return String(message.text?.body || '');
  if (message.type === 'button') return String(message.button?.text || '');
  if (message.type === 'interactive') return String(message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '[Interactive message]');
  return String(message[message.type]?.caption || `[${message.type || 'Unsupported'} message — media preview unavailable]`);
}
