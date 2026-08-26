import type { ReactNode } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { BUSINESS_INFO } from '@/lib/business-info';

export function PolicyLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="font-semibold text-[#741f23] underline-offset-2 hover:text-[#b5843d] hover:underline"
    >
      {children}
    </a>
  );
}

export function BusinessContact({
  grievance = false,
}: {
  grievance?: boolean;
}) {
  return (
    <section>
      <h2>Contact information</h2>

      <p>
        <strong>{BUSINESS_INFO.entity}</strong>
        <br />
        Brand: {BUSINESS_INFO.brand}
        <br />
        GSTIN: {BUSINESS_INFO.gstin}
      </p>

      <p>
        {BUSINESS_INFO.addressLines.map((line) => (
          <span key={line}>
            {line}
            <br />
          </span>
        ))}
      </p>

      <p>
        Email:{' '}
        <a href={`mailto:${BUSINESS_INFO.email}`}>
          {BUSINESS_INFO.email}
        </a>
        <br />
        Office phone:{' '}
        <a href={BUSINESS_INFO.officePhoneHref}>
          {BUSINESS_INFO.officePhone}
        </a>
        <br />

        {grievance && (
          <>
            Grievance Officer: {BUSINESS_INFO.grievanceOfficer}
            <br />
            Grievance phone:{' '}
            <a href={BUSINESS_INFO.grievancePhoneHref}>
              {BUSINESS_INFO.grievancePhone}
            </a>
            <br />
          </>
        )}

        Website:{' '}
        <a href={BUSINESS_INFO.websiteHref}>
          {BUSINESS_INFO.website}
        </a>
      </p>
    </section>
  );
}

export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#fffaf5] flex flex-col justify-between">
      <div>
        <Header />

        <article className="max-w-4xl mx-auto my-8 rounded-3xl border border-[#ead8b8] bg-[#fffdf9] px-5 py-10 shadow-sm sm:px-8 sm:py-12">
          <div className="mb-8 border-b border-[#ead8b8] pb-5">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#b5843d]">
              ADHYEY BROTHERS
            </p>

            <h1 className="text-3xl font-black text-[#741f23] sm:text-4xl">
              {title}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              <strong>{BUSINESS_INFO.brand}</strong> is owned and
              operated by <strong>{BUSINESS_INFO.entity}</strong>.
            </p>
          </div>

          <div className="space-y-7 text-sm leading-relaxed text-stone-600 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#741f23] [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_a]:font-semibold [&_a]:text-[#741f23] [&_a]:underline-offset-2 [&_a]:hover:text-[#b5843d] [&_a]:hover:underline [&_strong]:text-stone-800">
            {children}
          </div>
        </article>
      </div>

      <Footer />
    </main>
  );
}
