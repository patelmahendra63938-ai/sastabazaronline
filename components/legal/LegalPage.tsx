import type { ReactNode } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { BUSINESS_INFO } from '@/lib/business-info';

export function PolicyLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="font-semibold text-indigo-700 hover:underline">{children}</a>;
}

export function BusinessContact({ grievance = false }: { grievance?: boolean }) {
  return <section><h2>Contact information</h2>
    <p><strong>{BUSINESS_INFO.entity}</strong><br />Brand: {BUSINESS_INFO.brand}<br />GSTIN: {BUSINESS_INFO.gstin}</p>
    <p>{BUSINESS_INFO.addressLines.map((line) => <span key={line}>{line}<br /></span>)}</p>
    <p>Email: <a href={`mailto:${BUSINESS_INFO.email}`}>{BUSINESS_INFO.email}</a><br />Office phone: <a href={BUSINESS_INFO.officePhoneHref}>{BUSINESS_INFO.officePhone}</a><br />
      {grievance && <>Grievance Officer: {BUSINESS_INFO.grievanceOfficer}<br />Grievance phone: <a href={BUSINESS_INFO.grievancePhoneHref}>{BUSINESS_INFO.grievancePhone}</a><br /></>}
      Website: <a href={BUSINESS_INFO.websiteHref}>{BUSINESS_INFO.website}</a></p>
  </section>;
}

export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return <main className="min-h-screen bg-gray-50 flex flex-col justify-between"><div><Header />
    <article className="max-w-4xl mx-auto px-5 sm:px-8 py-12 bg-white rounded-3xl border my-8 shadow-sm">
      <h1 className="text-3xl font-black text-indigo-950 mb-4">{title}</h1>
      <p className="mb-8 text-sm text-gray-600"><strong>{BUSINESS_INFO.brand}</strong> is owned and operated by <strong>{BUSINESS_INFO.entity}</strong>.</p>
      <div className="space-y-7 text-sm text-gray-600 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-2 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-indigo-700 [&_a]:hover:underline">{children}</div>
    </article></div><Footer /></main>;
}
