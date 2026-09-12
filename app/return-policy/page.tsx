import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { BUSINESS_INFO } from '@/lib/business-info';

export const metadata: Metadata = { title: 'Return Policy' };

export default function ReturnPolicyPage() {
  return (
    <LegalPage title="Return Policy">
      <p>
        ADHYEY BROTHERS offers a 7-day return or exchange window for eligible
        clothing products. The 7-day period starts from the date the order is
        delivered to you, not from the order placement date.
      </p>

      <h2 className="text-lg font-bold text-gray-900">Eligibility</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>The return or exchange request must be submitted within 7 days of delivery.</li>
        <li>The item must be unused, unwashed and in the same condition in which it was received.</li>
        <li>Original tags, labels, accessories and packaging supplied with the item must be retained.</li>
        <li>Discounted or sale-priced items remain eligible for return or exchange unless a specific product is clearly marked as non-returnable before purchase.</li>
        <li>Items that are used, washed, altered, damaged after delivery, or returned incomplete may be rejected after inspection.</li>
      </ul>

      <h2 className="text-lg font-bold text-gray-900">Return shipping</h2>
      <p>
        For every eligible return accepted under this policy, ADHYEY BROTHERS
        will bear the return courier charge. We will arrange or authorize the
        reverse pickup where service is available. Customers will not be charged
        a return-shipping fee for an eligible return.
      </p>

      <h2 className="text-lg font-bold text-gray-900">Damaged, defective or wrong item</h2>
      <p>
        If you receive a damaged, defective, incorrect or materially different
        item, submit the return request within the same 7-day delivery window and
        provide reasonable details or photographs if requested. After verification,
        we will process an eligible return, replacement or exchange without a
        return-shipping charge.
      </p>

      <h2 className="text-lg font-bold text-gray-900">Inspection and approval</h2>
      <p>
        Returned items are inspected after receipt. Once the item passes the
        applicable quality check, the return, exchange or refund will be approved
        and processed in accordance with our Refund and Cancellation Policy.
      </p>

      <p>
        For assistance, contact {BUSINESS_INFO.entity} at {BUSINESS_INFO.email} or
        {` ${BUSINESS_INFO.officePhone}`}.
      </p>
    </LegalPage>
  );
}
