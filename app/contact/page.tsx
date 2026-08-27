import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import {
  Building2,
  Headphones,
  Mail,
  MapPin,
  PackageSearch,
  Phone,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import { BUSINESS_INFO } from '@/lib/business-info';

export const metadata: Metadata = {
  title: 'Contact Us | ADHYEY BROTHERS',
  description:
    'Contact ADHYEY BROTHERS for order, payment, shipping, GST invoice and customer support.',
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] text-stone-900">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="overflow-hidden rounded-3xl border border-[#ead8b8] bg-white shadow-sm">
          <div className="bg-[#741f23] px-5 py-8 text-white sm:px-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-[#f0c987]">
              <Headphones size={24} aria-hidden="true" />
            </div>

            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#f0c987]">
              Customer Support
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Contact ADHYEY BROTHERS
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#f4dfbf]">
              Need help with an order, payment, delivery, return or GST invoice?
              Use the contact details below and keep your order number ready when
              contacting us about an existing purchase.
            </p>
          </div>

          <div className="space-y-8 p-5 sm:p-8">
            <section className="grid gap-4 sm:grid-cols-2">
              <a
                href={`mailto:${BUSINESS_INFO.email}`}
                className="rounded-2xl border border-[#ead8b8] bg-[#fff7e8] p-5 transition hover:border-[#d7b06a] hover:shadow-sm"
              >
                <div className="flex items-center gap-2 text-[#741f23]">
                  <Mail size={18} aria-hidden="true" />
                  <h2 className="text-sm font-black">Email Support</h2>
                </div>
                <p className="mt-3 break-all text-xs font-bold text-gray-800">
                  {BUSINESS_INFO.email}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                  Recommended for order, payment, return and GST invoice queries.
                </p>
              </a>

              <a
                href={BUSINESS_INFO.officePhoneHref}
                className="rounded-2xl border border-[#ead8b8] bg-white p-5 transition hover:border-[#d7b06a] hover:shadow-sm"
              >
                <div className="flex items-center gap-2 text-[#741f23]">
                  <Phone size={18} aria-hidden="true" />
                  <h2 className="text-sm font-black">Customer Support Phone</h2>
                </div>
                <p className="mt-3 text-xs font-bold text-gray-800">
                  {BUSINESS_INFO.officePhone}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                  Call us for customer support and order assistance.
                </p>
              </a>
            </section>

            <section className="rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[#741f23]">
                <Building2 size={18} aria-hidden="true" />
                <h2 className="text-base font-black">Business Details</h2>
              </div>

              <div className="mt-4 grid gap-4 text-xs leading-relaxed text-gray-700 sm:grid-cols-2">
                <div>
                  <p className="font-black text-gray-900">{BUSINESS_INFO.entity}</p>
                  <p className="mt-1">GSTIN: {BUSINESS_INFO.gstin}</p>
                  <p className="mt-1">{BUSINESS_INFO.website}</p>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-[#b5843d]" aria-hidden="true" />
                  <address className="not-italic">
                    {BUSINESS_INFO.addressLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </address>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-black text-[#741f23]">
                Quick Support
              </h2>

              <div className="grid gap-3 sm:grid-cols-3">
                <Link
                  href="/orders"
                  className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-[#d7b06a] hover:shadow-sm"
                >
                  <PackageSearch size={19} className="text-[#741f23]" aria-hidden="true" />
                  <h3 className="mt-3 text-xs font-black text-[#741f23]">
                    Track Your Order
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                    Check your order and shipment status.
                  </p>
                </Link>

                <Link
                  href="/payment-information"
                  className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-[#d7b06a] hover:shadow-sm"
                >
                  <ShieldCheck size={19} className="text-[#741f23]" aria-hidden="true" />
                  <h3 className="mt-3 text-xs font-black text-[#741f23]">
                    Payment Help
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                    Read payment and verification guidance.
                  </p>
                </Link>

                <Link
                  href="/gst-invoice"
                  className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-[#d7b06a] hover:shadow-sm"
                >
                  <ReceiptText size={19} className="text-[#741f23]" aria-hidden="true" />
                  <h3 className="mt-3 text-xs font-black text-[#741f23]">
                    GST Invoice
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                    View GST invoice information and support.
                  </p>
                </Link>
              </div>
            </section>

            <section className="rounded-2xl bg-[#741f23] p-5 text-white sm:p-6">
              <h2 className="text-base font-black">Before contacting support</h2>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#f4dfbf]">
                For an existing order, please keep your order number, registered
                phone number and relevant payment or delivery details ready. This
                helps us identify the transaction more quickly.
              </p>
            </section>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
