import type { Metadata } from 'next';
import LegalPage, { BusinessContact, PolicyLink } from '@/components/legal/LegalPage';
export const metadata: Metadata = { title: 'Terms & Conditions' };
export default function TermsAndConditionsPage() { return <LegalPage title="Terms & Conditions">
  <section><h2>Website use</h2><p>By accessing or using SASTABAZARONLINE and its services, you agree to these terms and applicable Indian law. You must provide accurate information and must not misuse, disrupt, or attempt unauthorized access to the website.</p></section>
  <section><h2>Products and pricing</h2><p>We aim to present product descriptions, images, availability, and prices accurately. Minor visual differences may occur. Prices are in Indian Rupees and applicable charges or taxes are shown before order confirmation. We may correct genuine listing or pricing errors before fulfilling an order.</p></section>
  <section><h2>Orders</h2><p>An order acknowledgement does not guarantee acceptance. Orders may be accepted, rejected, or cancelled for stock, verification, pricing-error, serviceability, legal, or fraud-prevention reasons. If payment was collected for an order we cannot accept, the eligible amount will be refunded.</p></section>
  <section><h2>Payments</h2><p>Payments are processed through supported payment service providers subject to applicable Indian regulations.</p></section>
  <section><h2>Cancellation, returns, and refunds</h2><p>Eligibility and timelines are governed by our <PolicyLink href="/refund-policy">Refund Policy</PolicyLink>, <PolicyLink href="/return-policy">Return Policy</PolicyLink>, and <PolicyLink href="/shipping-policy">Shipping Policy</PolicyLink>.</p></section>
  <section><h2>Intellectual property</h2><p>Website content, branding, text, graphics, and other materials owned or licensed by ADHYEY BROTHERS may not be copied, republished, or commercially exploited without permission, except as allowed by law.</p></section>
  <section><h2>Limitation of liability</h2><p>To the extent permitted by law, ADHYEY BROTHERS is not liable for indirect or consequential losses arising from website use, external service interruptions, or events beyond reasonable control. Nothing excludes rights or liabilities that cannot lawfully be excluded.</p></section>
  <section><h2>Governing law and jurisdiction</h2><p>These terms are governed by the laws of India. Subject to applicable consumer law, courts in Surat, Gujarat, India will have jurisdiction.</p></section><BusinessContact />
</LegalPage>; }
