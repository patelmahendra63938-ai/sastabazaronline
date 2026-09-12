import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { BUSINESS_INFO } from '@/lib/business-info';

export const metadata: Metadata = { title: 'Refund and Cancellation Policy' };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund and Cancellation Policy">
      <h2 className="text-lg font-bold text-gray-900">Order cancellation</h2>
      <p>
        You may request cancellation while the order is still eligible for
        cancellation in your order page. Once an order has been shipped or is out
        for delivery, cancellation may no longer be available. If an order has
        already been delivered, the 7-day Return Policy will apply instead.
      </p>

      <h2 className="text-lg font-bold text-gray-900">Refunds for cancelled prepaid orders</h2>
      <p>
        When an eligible prepaid order is successfully cancelled, the payment is
        marked for refund through the available payment/refund workflow. The time
        taken for the amount to appear in your account may also depend on the
        payment provider, bank or UPI service used for the original transaction.
      </p>

      <h2 className="text-lg font-bold text-gray-900">Refunds after a return</h2>
      <p>
        Eligible returns must be requested within 7 days of delivery. ADHYEY
        BROTHERS bears the return courier charge for every eligible return under
        our Return Policy. After the returned item is received and passes the
        applicable quality check, the approved product refund will be processed.
      </p>

      <p>
        For prepaid orders, we will use the original payment/refund method where
        supported. For COD orders, we may request suitable bank or UPI details so
        that an approved refund can be sent to the customer.
      </p>

      <h2 className="text-lg font-bold text-gray-900">Damaged, defective or wrong items</h2>
      <p>
        If an item is damaged, defective, incorrect or materially different from
        what was ordered, notify us within 7 days of delivery and provide
        reasonable supporting details if requested. Once verified, the eligible
        return, replacement, exchange or refund will be handled without charging
        you a return-shipping fee.
      </p>

      <h2 className="text-lg font-bold text-gray-900">Refund processing</h2>
      <p>
        Once a refund is approved by ADHYEY BROTHERS, we aim to initiate it within
        5 business days. After initiation, additional bank, payment-gateway or UPI
        processing time may apply before the amount is visible in your account.
      </p>

      <p>
        For assistance, contact {BUSINESS_INFO.entity} at {BUSINESS_INFO.email} or
        {` ${BUSINESS_INFO.officePhone}`}.
      </p>
    </LegalPage>
  );
}
