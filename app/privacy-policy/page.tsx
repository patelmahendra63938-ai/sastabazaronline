import type { Metadata } from 'next';
import LegalPage, { BusinessContact } from '@/components/legal/LegalPage';
export const metadata: Metadata = { title: 'Privacy Policy' };
export default function PrivacyPolicyPage() { return <LegalPage title="Privacy Policy">
  <section><h2>Information we collect</h2><p>We may collect customer and order information such as name, phone number, email address, billing and delivery addresses, ordered products, transaction references, payment status, support communications, and device or usage information needed to operate and secure the website.</p></section>
  <section><h2>How information is used</h2><p>We use personal information for order fulfilment, payment processing and reconciliation, delivery and tracking updates, customer support, fraud prevention, website security, accounting, and legal or regulatory compliance.</p></section>
  <section><h2>Sharing</h2><p>We share information only as reasonably necessary with payment service providers, couriers and logistics partners, technology and hosting providers, professional advisers, or government and legal authorities where required. Personal data is not sold.</p></section>
  <section><h2>Payment and account safety</h2><p>Payments are processed through supported payment service providers subject to applicable Indian regulations. SASTABAZARONLINE will never ask for your UPI PIN, OTP, card PIN, CVV, or banking password. Do not share these credentials with anyone.</p></section>
  <section><h2>Retention and rights</h2><p>We retain information only for legitimate business, contractual, fraud-prevention, and legal purposes. Subject to applicable law, you may contact us to request access, correction, or deletion of eligible personal information.</p></section><BusinessContact grievance />
</LegalPage>; }
