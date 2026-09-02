import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import {
  BadgeCheck,
  Building2,
  FileText,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import { BUSINESS_INFO } from '@/lib/business-info';

export const metadata: Metadata = {
  title: 'GST Invoice Information | ADHYEY BROTHERS',
  description:
    'Learn how to request a GST invoice for an ADHYEY BROTHERS order using your GSTIN and GST billing address.',
};

export default function GstInvoicePage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] text-stone-900">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="overflow-hidden rounded-3xl border border-[#ead8b8] bg-white shadow-sm">
          <div className="bg-[#741f23] px-5 py-8 text-white sm:px-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-[#f0c987]">
              <ReceiptText size={24} aria-hidden="true" />
            </div>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#f0c987]">Customer Information</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">GST Invoice Information</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#f4dfbf]">
              For a business purchase, you can attach your GSTIN and GST billing address directly to an eligible order from My Orders. No external GST verification API is used.
            </p>
          </div>

          <div className="space-y-8 p-5 sm:p-8">
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#ead8b8] bg-[#fff7e8] p-5">
                <div className="flex items-center gap-2 text-[#741f23]">
                  <Building2 size={18} aria-hidden="true" />
                  <h2 className="text-sm font-black">Registered Business</h2>
                </div>
                <div className="mt-4 space-y-2 text-xs leading-relaxed text-gray-700">
                  <p><strong>Business Name:</strong> {BUSINESS_INFO.entity}</p>
                  <p><strong>GSTIN:</strong> {BUSINESS_INFO.gstin}</p>
                  <p><strong>Location:</strong> Surat, Gujarat, India</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ead8b8] bg-white p-5">
                <div className="flex items-center gap-2 text-[#741f23]">
                  <ShieldCheck size={18} aria-hidden="true" />
                  <h2 className="text-sm font-black">Customer-Provided GST Details</h2>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-gray-600">
                  Enter the GSTIN and GST billing address carefully. ADHYEY BROTHERS stores the details as provided by the customer and does not label them as externally verified.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[#741f23]">
                <FileText size={18} aria-hidden="true" />
                <h2 className="text-base font-black">How to request a GST invoice</h2>
              </div>
              <ol className="mt-4 space-y-3 text-xs leading-relaxed text-gray-700">
                <li className="flex gap-3"><BadgeCheck size={16} className="mt-0.5 shrink-0 text-[#b5843d]" /><span>Open <strong>My Orders</strong> and select the relevant order.</span></li>
                <li className="flex gap-3"><BadgeCheck size={16} className="mt-0.5 shrink-0 text-[#b5843d]" /><span>Press <strong>Need GST Invoice?</strong>.</span></li>
                <li className="flex gap-3"><BadgeCheck size={16} className="mt-0.5 shrink-0 text-[#b5843d]" /><span>Enter your 15-character GSTIN and complete GST billing address.</span></li>
                <li className="flex gap-3"><BadgeCheck size={16} className="mt-0.5 shrink-0 text-[#b5843d]" /><span>Save the details. They are attached to that order and become available to the invoice workflow.</span></li>
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-black text-[#741f23]">What the tax invoice can include</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'Invoice / order reference',
                  'Order date',
                  'Customer GSTIN when requested',
                  'GST billing address when requested',
                  'Product description and HSN',
                  'Quantity and unit price',
                  'Applicable GST rate',
                  'Taxable value',
                  'CGST + SGST or IGST',
                  'Grand total',
                  'Payment method / status',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-xl border border-gray-200 bg-[#fffdf9] p-3 text-xs text-gray-700">
                    <BadgeCheck size={15} className="mt-0.5 shrink-0 text-[#b5843d]" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-[#741f23] p-5 text-white sm:p-6">
              <h2 className="text-base font-black">Need a GST invoice for an order?</h2>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#f4dfbf]">
                Open your order and use the GST invoice option. Guest orders may require the same email and phone number used at checkout before GST details can be saved.
              </p>
              <Link href="/orders" className="mt-4 inline-block rounded-xl bg-[#f0c987] px-4 py-2.5 text-xs font-black text-[#741f23] transition hover:bg-white">
                Open My Orders
              </Link>
            </section>

            <p className="text-[11px] leading-relaxed text-gray-500">
              Product prices are treated as GST-inclusive where applicable. Final tax values and invoice particulars depend on the actual order, applicable GST rate and place of supply.
            </p>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
