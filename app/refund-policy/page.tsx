import type { Metadata } from 'next';
import LegalPage, { BusinessContact } from '@/components/legal/LegalPage';
export const metadata: Metadata = { title: 'Refund Policy' };
export default function RefundPolicyPage() { return <LegalPage title="Refund Policy">
  <section><h2>Cancellation refunds</h2><p>An eligible order cancelled before dispatch receives a 100% refund. Once dispatched, cancellation may no longer be possible and the Return Policy may apply.</p></section>
  <section><h2>Return refunds</h2><p>After an approved return is received and its condition is verified, we process the refund within 5–7 business days. The time for the amount to appear may additionally depend on the bank or payment provider.</p></section>
  <section><h2>Failed transactions</h2><p>A failed transaction amount is normally reversed or refunded within 3–5 business days, subject to the bank or payment provider timeline. Contact us with the transaction reference if the amount does not return after that period.</p></section>
  <section><h2>Refund method</h2><p>Refunds are made to the original payment method wherever technically possible. For an approved Cash on Delivery refund, we may securely request customer-owned bank account or UPI details.</p></section>
  <section><h2>Refund safety</h2><p>SASTABAZARONLINE staff will never ask for an OTP, UPI PIN, card PIN, CVV, or banking password to issue a refund. Do not share these credentials with anyone.</p></section><BusinessContact />
</LegalPage>; }
