import type { Metadata } from 'next';
import { ContactDetails, LegalPage, PolicySection } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms & Conditions | SASTABAZARONLINE',
  description: 'Terms governing use of SASTABAZARONLINE and orders placed through the website.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions">
      <p>These terms govern your use of this website and purchases from SASTABAZARONLINE. By using the website or placing an order, you agree to these terms and the policies linked from them.</p>
      <PolicySection title="Website Usage">
        <p>You may use the website for lawful personal shopping and order-related purposes. You must not interfere with the website, attempt unauthorized access, submit false information, misuse promotions, impersonate another person, or use automated or fraudulent methods that harm customers, the business or service providers.</p>
      </PolicySection>
      <PolicySection title="Products and Descriptions">
        <p>We sell the products shown in the live catalogue, which may include home, kitchen, lifestyle, fashion and other consumer products. We aim to present accurate descriptions, images, dimensions and specifications. Colours and appearance may vary slightly by screen, lighting or manufacturing batch. Product availability is not guaranteed until an order is accepted.</p>
      </PolicySection>
      <PolicySection title="Pricing, Tax and Charges">
        <p>Prices are displayed in Indian Rupees (INR). Applicable taxes, discounts, shipping or delivery charges and Cash on Delivery (COD) charges, where applicable, are shown through the product, cart or checkout experience before final order placement. Offers may have eligibility conditions and may be changed or withdrawn where permitted.</p>
      </PolicySection>
      <PolicySection title="Orders and Acceptance">
        <p>Submitting an order is an offer to purchase. An order may be accepted after product availability, delivery serviceability, pricing and payment details are validated. ADHYEY BROTHERS may cancel or decline an order because of stock unavailability, pricing or listing error, failed payment, unserviceable location, suspected fraud, regulatory restriction or another reasonable operational issue. Any amount captured for a cancelled prepaid order will be handled under the refund policy.</p>
      </PolicySection>
      <PolicySection title="Payment Methods">
        <p>Payment methods actually available for an order are displayed at checkout and may include COD or an enabled online payment method. Availability can depend on the delivery location, order value or operational status. Never disclose your card PIN, CVV, UPI PIN or internet banking password to our support team.</p>
      </PolicySection>
      <PolicySection title="Shipping and Delivery">
        <p>Orders are delivered to serviceable locations in India. Delivery dates are estimates and may be affected by courier capacity, weather, holidays, address issues and other operational conditions. Please review the Shipping & Delivery Policy for details.</p>
      </PolicySection>
      <PolicySection title="Cancellations, Returns and Refunds">
        <p>Eligibility and processing are governed by our Cancellation, Return & Refund Policy. Nothing in these terms excludes rights or remedies that cannot lawfully be excluded under applicable consumer law.</p>
      </PolicySection>
      <PolicySection title="Customer Responsibilities">
        <p>You are responsible for providing accurate contact, delivery and order information; keeping account credentials secure; checking product suitability before ordering; being available for delivery; and following reasonable return-verification instructions.</p>
      </PolicySection>
      <PolicySection title="Governing Law">
        <p>These terms are governed by the laws of India, including applicable consumer-protection and e-commerce laws. Disputes will be subject to the jurisdiction of competent courts in Surat, Gujarat, without limiting any forum or remedy available to a consumer under applicable law.</p>
      </PolicySection>
      <PolicySection title="Contact Us"><ContactDetails /></PolicySection>
    </LegalPage>
  );
}
