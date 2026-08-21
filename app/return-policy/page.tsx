import type { Metadata } from 'next';
import LegalPage, { BusinessContact, PolicyLink } from '@/components/legal/LegalPage';
export const metadata: Metadata = { title: 'Return Policy' };
export default function ReturnPolicyPage() { return <LegalPage title="Return Policy">
  <section><h2>Return window</h2><p>Request an eligible return within 7 calendar days after delivery. Contact support with your order number and reason for return.</p></section>
  <section><h2>Return condition</h2><p>The product must be unused and in its original condition and packaging. Include all applicable accessories, tags, manuals, warranty cards, and supplied items.</p></section>
  <section><h2>Damaged, missing, or wrong items</h2><p>For a damaged, missing, defective, or wrong item, share the order number and clear photos or an unboxing video that reasonably supports the issue. Keep the product and packaging until resolved.</p></section>
  <section><h2>Reverse pickup</h2><p>After approval, reverse pickup is normally arranged within 2–4 business days, subject to courier serviceability. We will provide alternate instructions if pickup is unavailable.</p></section>
  <section><h2>Non-returnable items</h2><p>Items may be non-returnable only where that exclusion was clearly disclosed before purchase, including reasonable hygiene, safety, personalized, perishable, or legally restricted categories. This does not limit applicable consumer rights for damaged, defective, incorrect, or misrepresented goods.</p></section>
  <section><h2>Refunds</h2><p>Returned items are inspected after receipt. Approved refunds are handled under our <PolicyLink href="/refund-policy">Refund Policy</PolicyLink>.</p></section><BusinessContact />
</LegalPage>; }
