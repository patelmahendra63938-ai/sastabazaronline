import type { Metadata } from 'next';
import { ContactDetails, LegalPage, PolicySection } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy | SASTABAZARONLINE',
  description: 'Shipping charges, order processing, tracking and estimated delivery information for SASTABAZARONLINE orders.',
};

export default function ShippingPolicyPage() {
  return (
    <LegalPage title="Shipping & Delivery Policy">
      <PolicySection title="Serviceable Locations">
        <p>We deliver eligible orders within serviceable locations in India through third-party courier and logistics providers. Serviceability may depend on the delivery PIN code, package details, payment method and current courier availability. Where provided, use the PIN-code check before placing an order.</p>
      </PolicySection>
      <PolicySection title="Shipping and COD Charges">
        <p>Applicable shipping or delivery charges are displayed before final order placement. A COD fee, when applicable to the selected payment method, is displayed separately. Charges can vary based on serviceability, package characteristics, order value and configured shipping rules.</p>
      </PolicySection>
      <PolicySection title="Order Processing and Packing">
        <p>After an order is accepted, we verify order details, prepare the available items and pack them for dispatch. Processing time may vary by product availability, order volume, payment confirmation, holidays and operational conditions.</p>
      </PolicySection>
      <PolicySection title="Shipment and Tracking">
        <p>When tracking information is available from the courier, it may be shown on the order page or shared using the contact details supplied with the order. Tracking updates are provided by the courier and can take time to appear after dispatch.</p>
      </PolicySection>
      <PolicySection title="Estimated Delivery">
        <p>Any delivery date or time shown is an estimate, not a guarantee. Delivery may be affected by courier delays, public holidays, weather, local restrictions, high order volumes, remote-area service, or other operational circumstances outside our reasonable control. Contact support if tracking remains unchanged for an unusual period.</p>
      </PolicySection>
      <PolicySection title="Customer Responsibilities">
        <p>Provide a complete and correct delivery address, PIN code and working phone number. Please remain available for courier calls or delivery attempts. Incorrect or incomplete information may delay delivery or cause the shipment to be returned.</p>
      </PolicySection>
      <PolicySection title="Failed Delivery and Return to Origin (RTO)">
        <p>A courier may make delivery attempts according to its operating process. If delivery fails because the customer is unavailable, refuses the shipment, cannot be contacted, or supplied an incorrect address, the package may be marked Return to Origin (RTO). Contact support if you need help after a failed attempt. Reshipment, where available, may require reconfirmation of serviceability and applicable charges.</p>
      </PolicySection>
      <PolicySection title="Customer Support"><ContactDetails /></PolicySection>
    </LegalPage>
  );
}
