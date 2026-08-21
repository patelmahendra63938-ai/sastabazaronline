import type { Metadata } from 'next';
import { ContactDetails, LegalPage, PolicySection } from '@/components/LegalPage';
import { businessInfo } from '@/lib/business-info';

export const metadata: Metadata = {
  title: 'Contact Us | SASTABAZARONLINE',
  description: 'Contact SASTABAZARONLINE customer support for products, orders, payments, shipping, returns and refunds.',
};

export default function ContactUsPage() {
  return (
    <LegalPage title="Contact Us">
      <PolicySection title="Business Details">
        <dl className="grid gap-3 sm:grid-cols-[190px_1fr]">
          <dt className="font-semibold text-gray-900">Brand Name</dt><dd>{businessInfo.brandName}</dd>
          <dt className="font-semibold text-gray-900">Legal Business Name</dt><dd>{businessInfo.legalBusinessName}</dd>
          <dt className="font-semibold text-gray-900">Registered Business Address</dt><dd>{businessInfo.registeredAddress}</dd>
        </dl>
      </PolicySection>
      <PolicySection title="Customer Support">
        <ContactDetails />
        <p>Customers may contact us regarding products, orders, payments, cancellations, shipping, returns and refunds. To help us locate an order, include the order reference and the phone number or email used when ordering, but never send a card PIN, CVV, UPI PIN or internet banking password.</p>
      </PolicySection>
    </LegalPage>
  );
}
