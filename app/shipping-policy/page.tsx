import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { CUSTOMER_SHIPPING_MAX_INR } from '@/lib/shipping/policy';

export const metadata: Metadata = { title: 'Shipping Policy' };

export default function ShippingPolicyPage() {
  return (
    <LegalPage title="Shipping Policy">
      <p>
        Orders are shipped through registered domestic courier companies and/or speed post only. Orders are normally shipped within 2 days from the date of the order and/or payment, or as per the delivery date agreed at order confirmation, subject to courier company or postal authority norms.
      </p>
      <p>
        Customer shipping charges are calculated from the live courier rate applicable to the delivery PIN code, parcel weight and package dimensions. The customer shipping charge will not exceed ₹{CUSTOMER_SHIPPING_MAX_INR} per order. Any applicable COD charge is shown separately during checkout.
      </p>
      <p>
        ADHYEY BROTHERS is not responsible for delays caused by the courier company or postal authority. Delivery is made to the address provided by the buyer at the time of purchase. Shipping charges paid by the customer are non-refundable unless required under the applicable refund or return policy.
      </p>
    </LegalPage>
  );
}
