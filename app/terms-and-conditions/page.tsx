import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { BUSINESS_INFO } from '@/lib/business-info';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
};

export default function TermsAndConditionsPage() {
  return (
    <LegalPage title="Terms & Conditions">
      <ol className="list-decimal space-y-4 pl-6">
        <li>
          This document is an electronic record under the Information Technology
          Act, 2000 and applicable rules concerning electronic records. It is
          generated electronically and does not require a physical or digital
          signature.
        </li>

        <li>
          These Terms govern access to and use of https://www.adhyeybrothers.in/
          (the &quot;Website&quot;) and purchases made through the Website.
        </li>

        <li>
          The Website is owned and operated by {BUSINESS_INFO.entity}, GSTIN
          {` ${BUSINESS_INFO.gstin}`}, with its business address at
          {` ${BUSINESS_INFO.addressLines.join(' ')}`} (&quot;ADHYEY BROTHERS&quot;,
          &quot;we&quot;, &quot;us&quot; or &quot;our&quot;).
        </li>

        <li>
          By accessing the Website or placing an order, you agree to these Terms
          together with the Privacy Policy, Shipping Policy, Return Policy and
          Refund and Cancellation Policy published on the Website.
        </li>

        <li>
          You must provide accurate contact, delivery and payment information when
          placing an order or creating an account. You are responsible for keeping
          your account credentials secure and for activity carried out through
          your account.
        </li>

        <li>
          Product photographs, descriptions, sizes, colours, prices, discounts and
          availability are presented as accurately as reasonably possible. Minor
          colour or appearance differences may occur because of lighting, screen
          settings or normal manufacturing variation. Availability may change
          before an order is confirmed.
        </li>

        <li>
          Prices shown on the Website are in Indian Rupees. Applicable taxes,
          shipping charges, COD charges, discounts and the final payable amount
          are shown during checkout as applicable to the order.
        </li>

        <li>
          An order is subject to acceptance and successful processing. We may
          cancel or refuse an order where required because of stock issues,
          incorrect pricing, suspected misuse, payment failure, serviceability or
          other legitimate operational reasons. Where payment has already been
          received for an order cancelled by us, an applicable refund will be
          processed.
        </li>

        <li>
          Customer-requested cancellation is available only while the order is in
          a cancellable stage. Once an order has shipped or moved beyond the
          cancellable stage, the cancellation option may no longer be available.
        </li>

        <li>
          Eligible clothing products may be returned or exchanged within 7 days
          from delivery in accordance with our Return Policy. ADHYEY BROTHERS
          bears the return courier charge for every eligible return accepted under
          that policy. Refunds are handled under our Refund and Cancellation
          Policy.
        </li>

        <li>
          Website content, branding, graphics, product content and other
          intellectual property are owned by or licensed to ADHYEY BROTHERS unless
          stated otherwise. You may not copy, misuse or commercially exploit such
          material without authorization.
        </li>

        <li>
          You must not use the Website for unlawful, fraudulent, abusive or
          prohibited activity or attempt to interfere with the Website, payments,
          accounts, orders or security controls.
        </li>

        <li>
          The Website may link to third-party services such as payment, shipping,
          social or marketplace services. Those third-party services may have
          their own terms and privacy practices, and their independent systems may
          affect transaction or delivery processing times.
        </li>

        <li>
          To the extent permitted by applicable law, neither party will be liable
          for failure or delay caused by events beyond reasonable control,
          including disruptions affecting payment, courier, telecommunications,
          hosting or other external infrastructure.
        </li>

        <li>
          Nothing in these Terms is intended to exclude rights or remedies that
          cannot lawfully be excluded under applicable consumer law.
        </li>

        <li>
          These Terms are governed by the laws of India. Subject to applicable
          consumer-law rights regarding forum or jurisdiction, disputes relating
          to these Terms or Website transactions are subject to the competent
          courts at Surat, Gujarat, India.
        </li>

        <li>
          Questions or complaints may be sent to {BUSINESS_INFO.email}. Our
          Grievance Officer is {BUSINESS_INFO.grievanceOfficer}, contactable at
          {` ${BUSINESS_INFO.grievancePhone}`}.
        </li>
      </ol>
    </LegalPage>
  );
}
