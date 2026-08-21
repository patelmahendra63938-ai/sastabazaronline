import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | SASTABAZARONLINE",
  description:
    "Privacy Policy of SASTABAZARONLINE, owned and operated by Adhyey Brothers.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <article className="mx-auto max-w-4xl rounded-2xl bg-white px-6 py-10 shadow-sm sm:px-10">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Last updated: 21 August 2026
          </p>

          <p className="mt-5 leading-7 text-slate-700">
            <strong>SASTABAZARONLINE</strong> is owned and operated by{" "}
            <strong>ADHYEY BROTHERS</strong>. This Privacy Policy explains how
            we collect, use and protect customer information.
          </p>
        </header>

        <div className="space-y-8 leading-7 text-slate-700">
          <PolicySection title="1. Information We Collect">
            <p>
              When you visit our website, place an order or contact us, we may
              collect:
            </p>

            <PolicyList
              items={[
                "Name, phone number and email address",
                "Billing and delivery address",
                "Order, product and transaction information",
                "Customer-support communications",
                "IP address, browser, device and security logs",
                "Optional location information, with your permission, to identify your delivery area or PIN code",
              ]}
            />

            <p>
              You may deny location permission and enter your delivery address
              manually.
            </p>
          </PolicySection>

          <PolicySection title="2. How We Use Information">
            <p>We use customer information to:</p>

            <PolicyList
              items={[
                "Process and deliver orders",
                "Verify PIN-code serviceability",
                "Confirm and reconcile payments",
                "Send order and delivery updates",
                "Process eligible cancellations, returns and refunds",
                "Provide customer support",
                "Prevent fraud and protect our website",
                "Maintain invoices and legal business records",
                "Comply with applicable laws",
              ]}
            />

            <p>
              <strong>We do not sell or rent customer information.</strong>
            </p>
          </PolicySection>

          <PolicySection title="3. PhonePe and Payment Processing">
            <p>
              Online payments may be processed through{" "}
              <strong>PhonePe Payment Gateway</strong>, banks, UPI providers and
              card networks.
            </p>

            <p>
              SASTABAZARONLINE and ADHYEY BROTHERS do not collect or store:
            </p>

            <PolicyList
              items={[
                "Complete debit or credit card numbers",
                "Card expiry dates or CVV",
                "Card PINs",
                "UPI PINs",
                "OTPs",
                "Internet-banking passwords",
              ]}
            />

            <p>
              Customers must enter such information only on the secure payment
              interface provided by PhonePe, their bank or another authorised
              payment provider.
            </p>

            <p>
              We may receive limited transaction information such as the order
              ID, payment ID, payment amount, payment method, payment status and
              refund status. We use this information for order confirmation,
              accounting, fraud prevention, refunds and customer support.
            </p>

            <p>
              Information provided directly to PhonePe is also governed by
              PhonePe&apos;s privacy policy and applicable terms.
            </p>
          </PolicySection>

          <PolicySection title="4. Information Sharing">
            <p>We may share only necessary information with:</p>

            <PolicyList
              items={[
                "PhonePe and other authorised payment providers",
                "Courier and logistics partners",
                "Website hosting, database, email and technology providers",
                "Accountants and legal advisers",
                "Government or regulatory authorities when required by applicable law",
              ]}
            />

            <p>
              Courier partners may receive your name, phone number, delivery
              address, order reference and Cash on Delivery amount to complete
              delivery.
            </p>
          </PolicySection>

          <PolicySection title="5. Cookies">
            <p>
              Our website may use essential cookies or similar technology for
              the shopping cart, login, checkout, website security, fraud
              prevention and performance.
            </p>

            <p>
              You may control cookies through your browser settings. Blocking
              essential cookies may prevent certain website features from
              working correctly.
            </p>
          </PolicySection>

          <PolicySection title="6. Data Security and Retention">
            <p>
              We use reasonable technical and administrative safeguards to
              protect customer information. However, no online system can be
              guaranteed to be completely secure.
            </p>

            <p>
              We retain information only for as long as necessary to fulfil
              orders, process refunds, resolve disputes, prevent fraud and
              comply with tax, accounting and legal requirements.
            </p>
          </PolicySection>

          <PolicySection title="7. Your Privacy Rights">
            <p>
              Subject to identity verification and applicable law, you may
              request:
            </p>

            <PolicyList
              items={[
                "Access to your personal information",
                "Correction or updating of your information",
                "Deletion of information that is no longer required",
                "Withdrawal of consent",
                "Resolution of a privacy complaint",
              ]}
            />

            <p>
              Some information may be retained when required for orders,
              payments, refunds, fraud prevention or legal compliance.
            </p>
          </PolicySection>

          <PolicySection title="8. Marketing Communications">
            <p>
              We may send promotional communications only where permitted by
              law and, where required, with your consent.
            </p>

            <p>
              You may opt out of promotional communications at any time. You
              may still receive important messages about orders, payments,
              delivery, returns, refunds and security.
            </p>
          </PolicySection>

          <PolicySection title="9. Children’s Privacy">
            <p>
              Our website is intended for adults. We do not knowingly collect
              personal information from children without appropriate consent
              from a parent or lawful guardian.
            </p>
          </PolicySection>

          <PolicySection title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy when our services or legal
              obligations change. The updated policy will be published on this
              page with a revised date.
            </p>
          </PolicySection>

          <PolicySection title="11. Contact and Grievance Details">
            <address className="not-italic">
              <p className="font-semibold text-slate-900">ADHYEY BROTHERS</p>
              <p>Owner and Operator of SASTABAZARONLINE</p>
              <p className="mt-3">
                3rd Floor, 33 Shaktinagar Society
                <br />
                Peoples Char Rasta, Katargam
                <br />
                Surat, Gujarat – 395004, India
              </p>

              <p className="mt-4">
                <strong>Phone:</strong>{" "}
                <a
                  href="tel:+919723268666"
                  className="text-blue-700 underline hover:text-blue-900"
                >
                  +91 9723268666
                </a>
              </p>

              <p>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:sales@sastabazaronline.in"
                  className="text-blue-700 underline hover:text-blue-900"
                >
                  sales@sastabazaronline.in
                </a>
              </p>
            </address>

            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
              <strong>Security warning:</strong> Please do not send your OTP,
              UPI PIN, card PIN, CVV, banking password or complete card details
              to us.
            </div>
          </PolicySection>
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-6">
          <Link
            href="/"
            className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
          >
            ← Return to SASTABAZARONLINE
          </Link>
        </footer>
      </article>
    </main>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function PolicyList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-6 marker:text-blue-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}