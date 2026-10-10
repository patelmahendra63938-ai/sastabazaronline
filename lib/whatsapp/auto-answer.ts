import { createHash } from 'node:crypto';

export function autoReplyId(phone: string, to: string, timestamp: string) {
  // One atomic reservation per contact per 30-second bucket, including concurrent webhooks.
  const bucket = Math.floor(Date.parse(timestamp) / 30000);
  const hash = createHash('sha256').update('whatsapp-auto:' + phone + ':' + to + ':' + bucket).digest('hex');
  return hash.slice(0,8)+'-'+hash.slice(8,12)+'-4'+hash.slice(13,16)+'-a'+hash.slice(17,20)+'-'+hash.slice(20,32);
}

export function automaticAnswer(input: string): string | null {
  const text = input.trim().toLowerCase();
  if (/^(stop|unsubscribe|બંધ|બંધ કરો)$/i.test(text)) return null;
  if (/^(thanks?|thank you|ok|okay|ધન્યવાદ|આભાર)[.!\s]*$/i.test(text)) return null;
  const site = 'https://www.adhyeybrothers.in';
  if (/\b(order|tracking|track|delivery|shipping)\b|ઓર્ડર|ડિલિવરી|ડિલીવરી/.test(text) || text === '2') {
    return 'Adhyey Brothers — automatic reply\nઓર્ડરની મદદ માટે તમારો order number મોકલો. અમારી team અહીંથી આગળ મદદ કરશે.\nCheck your order: ' + site + '/orders\nPlease do not send payment PINs or OTPs.';
  }
  if (/\b(price|rate|catalog|catalogue|size|dhoti|choli|product|collection)\b|કિંમત|ભાવ|સાઇઝ|કપડાં/.test(text) || text === '1') {
    return 'Adhyey Brothers — automatic reply\nઅમારાં કપડાં, હાલની કિંમત અને ઉપલબ્ધ size અહીં જુઓ: ' + site + '\nSend a product link/photo and your size for help. અમારી team ઉપલબ્ધતા confirm કરશે.';
  }
  if (/\b(human|agent|help|support|return|refund|cancel|complaint)\b|મદદ|રિટર્ન|રિફંડ/.test(text) || text === '3') {
    return 'Adhyey Brothers — automatic reply\nતમારો પ્રશ્ન અને જરૂરી હોય તો order number મોકલો. અમારી team આ inboxમાંથી જવાબ આપશે.\nPlease do not share card details, PINs or OTPs.';
  }
  return 'નમસ્તે! Adhyey Brothersમાં સ્વાગત છે 🙏\nThis is an automatic reply. અમે અમારા બનાવેલા કપડાં વેચીએ છીએ.\n1 — Clothes, prices & sizes\n2 — Order / delivery help\n3 — Talk to our team\nShop: ' + site + '\nReply with 1, 2 or 3, or send your question.';
}
