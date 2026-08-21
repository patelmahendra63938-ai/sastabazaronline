import type { Metadata } from 'next';
import { ContactDetails, LegalPage, PolicySection } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Cancellation, Return & Refund Policy | SASTABAZARONLINE',
  description: 'Cancellation, seven-day return eligibility and refund processing for SASTABAZARONLINE orders.',
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Cancellation, Return & Refund Policy">
      <PolicySection title="Cancellation Before Shipment">
        <p>Contact support promptly if you want to cancel an order. We will try to cancel it if shipment processing has not started. Cancellation is not confirmed until our team verifies the order status.</p>
      </PolicySection>
      <PolicySection title="Cancellation After Shipment">
        <p>Once an order has shipped, cancellation may not be possible. You may refuse delivery where appropriate or request an eligible return after delivery. Shipping, RTO or other charges may be considered when permitted by law and when the failed delivery or refusal was not caused by our error.</p>
      </PolicySection>
      <PolicySection title="Seven-Day Return Period">
        <p>Eligible products may be requested for return within 7 days after delivery. Contact support within this period and provide the order reference, item details and reason for return. Product-specific exclusions disclosed before purchase and items that cannot reasonably be returned for hygiene, safety or legal reasons may apply, subject to applicable consumer rights.</p>
      </PolicySection>
      <PolicySection title="Return Eligibility">
        <p>A returned product should generally be unused, unworn where applicable, unwashed, undamaged, and include its original tags, accessories and original packaging where applicable. Keep the product and packaging until the request is resolved.</p>
      </PolicySection>
      <PolicySection title="Damaged, Defective or Incorrect Products">
        <p>If an item arrives damaged, defective or different from what was ordered, contact support within the return period. We may request photographs, video, packaging images or other reasonable evidence to verify the issue and arrange an appropriate resolution.</p>
      </PolicySection>
      <PolicySection title="Return Verification">
        <p>Approval may depend on order verification, the stated reason, evidence provided and inspection of the returned item. A return request does not automatically guarantee a refund. We will not reject a valid statutory remedy merely because a separate website condition is not met.</p>
      </PolicySection>
      <PolicySection title="Refunds for Prepaid Orders">
        <p>Approved refunds for prepaid orders are generally returned to the original payment method when supported by the payment provider. Bank or payment-provider posting time may apply after initiation.</p>
      </PolicySection>
      <PolicySection title="Refunds for COD Orders">
        <p>For an approved COD refund, we may request customer-owned bank account or UPI details through an appropriate support process. We will never request a UPI PIN, card PIN, CVV or internet banking password.</p>
      </PolicySection>
      <PolicySection title="Shipping Charge Treatment">
        <p>Original shipping or COD charges may be non-refundable when the order was correctly fulfilled and the return is based on customer preference, where permitted by law. If we confirm a damaged, defective or incorrect product, reasonable return-shipping and order charges will be addressed as part of the resolution.</p>
      </PolicySection>
      <PolicySection title="Refund Processing">
        <p>After the returned product or cancellation is verified, we will communicate the decision and initiate any approved refund within a reasonable processing period. The time for funds to appear can vary by bank, UPI provider or payment processor.</p>
      </PolicySection>
      <PolicySection title="Customer Support"><ContactDetails /></PolicySection>
    </LegalPage>
  );
}
