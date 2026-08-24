import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Shipping Policy' };

export default function ShippingPolicyPage() {
  return (
    <LegalPage title="Shipping Policy">
      <p>The orders for the user are shipped through registered domestic courier companies and/or speed post only. Orders are shipped within 2 days from the date of the order and/or payment or as per the delivery date agreed at the time of order confirmation and delivering of the shipment, subject to courier company / post office norms. Platform Owner shall not be liable for any delay in delivery by the courier company / postal authority. Delivery of all orders will be made to the address provided by the buyer at the time of purchase. Delivery of our services will be confirmed on your email ID as specified at the time of registration. If there are any shipping cost(s) levied by the seller or the Platform Owner (as the case be), the same is not refundable.</p>
    </LegalPage>
  );
}
