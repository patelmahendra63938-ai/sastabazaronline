import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { BUSINESS_INFO } from '@/lib/business-info';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Learn how ADHYEY BROTHERS collects, uses, protects and shares information when you shop on adhyeybrothers.in.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <h2>Introduction</h2>
        <p>
          This Privacy Policy explains how {BUSINESS_INFO.entity} (&quot;we&quot;,
          &quot;us&quot; or &quot;our&quot;) collects, uses, stores and shares information
          when you visit or shop on {BUSINESS_INFO.website}. Our store serves
          customers in India.
        </p>
      </section>

      <section>
        <h2>Information we collect</h2>
        <p>
          Depending on how you use the Website, we may collect information you
          provide such as your name, email address, mobile number, account details,
          billing or delivery address, PIN code, order details, product reviews,
          support messages and other information needed to provide the service you
          request.
        </p>
        <p>
          For payments, we may store transaction status, payment method, payment
          reference or UTR and related order information where required for payment
          confirmation, reconciliation or refunds. Sensitive payment credentials
          such as card PINs, UPI PINs and banking passwords should never be shared
          with us. Payment providers may process payment information under their own
          privacy and security practices.
        </p>
        <p>
          We may also collect limited technical and usage information such as
          device/browser information, pages viewed, referral information and
          website interactions through server logs, cookies or analytics tools.
        </p>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>
          We use information to operate the Website, create and secure accounts,
          process and deliver orders, confirm payments, provide GST invoices,
          calculate shipping, send order or service communications, handle returns
          and refunds, respond to support requests, prevent fraud or misuse,
          improve the Website and comply with applicable legal and tax obligations.
        </p>
        <p>
          Where permitted, we may also use contact information to communicate
          relevant offers or updates. You can ask us to stop optional marketing
          communications.
        </p>
      </section>

      <section>
        <h2>Sharing of information</h2>
        <p>
          We share information only where reasonably necessary to operate the
          store or meet legal obligations. This may include payment service
          providers, courier and logistics partners, hosting/database providers,
          email or messaging providers, analytics services and professional or
          government authorities where disclosure is required by law.
        </p>
        <p>
          We do not sell customer personal data. Third-party services process data
          under their own terms and privacy practices where applicable.
        </p>
      </section>

      <section>
        <h2>Cookies and analytics</h2>
        <p>
          The Website may use necessary cookies or similar storage for account,
          cart, security and site functionality. We may also use analytics or
          advertising measurement tools to understand website performance and the
          effectiveness of campaigns. Browser settings can be used to control many
          cookies, although disabling necessary storage may affect site features.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          We use reasonable technical and organisational safeguards designed to
          protect information against unauthorised access, loss, misuse or
          disclosure. No internet transmission or storage system can be guaranteed
          to be completely secure, so customers should also protect their account
          credentials and never share OTPs, PINs or passwords with anyone claiming
          to represent us.
        </p>
      </section>

      <section>
        <h2>Retention and deletion</h2>
        <p>
          We retain information only for as long as reasonably necessary for the
          purposes described above, including order fulfilment, support, accounting,
          tax, fraud-prevention and legal requirements. Where account-deletion or
          data-deletion features are available, you may use them or contact us for
          assistance. Certain transaction records may need to be retained where
          required by law or for legitimate business records.
        </p>
      </section>

      <section>
        <h2>Your choices and rights</h2>
        <p>
          You may request reasonable access to or correction of personal
          information we hold about you, request account/data deletion where
          applicable, or withdraw optional marketing consent by contacting us.
          Requests may be verified before action is taken and remain subject to
          applicable legal retention requirements.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          We may update this Privacy Policy when our Website, service providers or
          legal requirements change. The current version published on this page
          applies from the time it is posted.
        </p>
      </section>

      <section>
        <h2>Grievance Officer and contact</h2>
        <p>{BUSINESS_INFO.grievanceOfficer}</p>
        <p>Designation: Grievance Officer</p>
        <p>
          {BUSINESS_INFO.entity}
          <br />
          {BUSINESS_INFO.addressLines.map((line, index) => (
            <span key={line}>
              {line}
              {index < BUSINESS_INFO.addressLines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
        <p>
          Email:{' '}
          <a href={`mailto:${BUSINESS_INFO.email}`}>{BUSINESS_INFO.email}</a>
        </p>
        <p>
          Phone:{' '}
          <a href={BUSINESS_INFO.grievancePhoneHref}>
            {BUSINESS_INFO.grievancePhone}
          </a>
        </p>
      </section>
    </LegalPage>
  );
}
