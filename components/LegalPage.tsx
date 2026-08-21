import type { ReactNode } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { businessInfo } from '@/lib/business-info';

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col justify-between bg-gray-50">
      <div>
        <Header />
        <article className="mx-auto my-8 max-w-4xl rounded-3xl border border-gray-200 bg-white px-5 py-8 shadow-sm sm:px-10 sm:py-12">
          <h1 className="mb-2 text-3xl font-black text-indigo-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mb-2 text-sm font-semibold text-gray-700">
            {businessInfo.legalIdentity}
          </p>
          <p className="mb-8 text-xs text-gray-500">
            Last updated: {businessInfo.lastUpdated}
          </p>
          <div className="space-y-7 text-sm leading-7 text-gray-600">
            {children}
          </div>
        </article>
      </div>
      <Footer />
    </main>
  );
}

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold text-gray-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function ContactDetails() {
  return (
    <address className="not-italic">
      <p>{businessInfo.legalBusinessName}</p>
      <p>{businessInfo.registeredAddress}</p>
      <p>
        Phone:{' '}
        <a className="font-semibold text-indigo-700 hover:underline" href={businessInfo.supportPhoneHref}>
          {businessInfo.supportPhone}
        </a>
      </p>
      <p>
        Email:{' '}
        <a className="font-semibold text-indigo-700 hover:underline" href={`mailto:${businessInfo.supportEmail}`}>
          {businessInfo.supportEmail}
        </a>
      </p>
    </address>
  );
}
