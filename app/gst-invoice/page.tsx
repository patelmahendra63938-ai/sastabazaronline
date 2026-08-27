import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import {
  BadgeCheck,
  Building2,
  FileText,
  Mail,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import { BUSINESS_INFO } from '@/lib/business-info';

export const metadata: Metadata = {
  title: 'GST Invoice Information | ADHYEY BROTHERS',
  description:
    'Learn how GST invoices work for orders placed with ADHYEY BROTHERS, including GSTIN, invoice details and customer support information.',
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

            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#f0c987]">
              Customer Information
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              GST Invoice Information
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#f4dfbf]">
              ADHYEY BROTHERS maintains GST invoice records for eligible orders.
              This page explains the invoice information available with your order
              and how to contact us if you need assistance.
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
                  <h2 className="text-sm font-black">GST-Inclusive Pricing</h2>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-gray-600">
                  Product prices shown to customers are treated as inclusive of
                  applicable GST where GST applies. The tax invoice can show the
                  taxable value and applicable GST component separately.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-black text-[#741f23]">
                What the tax invoice can include
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'Invoice / order reference',
                  'Order date',
                  'Customer billing details',
                  'Product description',
                  'HSN code where recorded',
                  'Quantity and unit price',
                  'Applicable GST rate',
                  'Taxable value',
                  'CGST + SGST for intra-state supply',
                  'IGST for inter-state supply',
                  'Grand total',
                  'Payment method / status',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 rounded-xl border border-gray-200 bg-[#fffdf9] p-3 text-xs text-gray-700"
                  >
                    <BadgeCheck size={15} className="mt-0.5 shrink-0 text-[#b5843d]" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[#741f23]">
                <FileText size={18} aria-hidden="true" />
                <h2 className="text-base font-black">How invoice access works</h2>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-relaxed text-gray-600">
                <p>
                  Invoice records are generated from the order information stored
                  in our system. If you need a copy of your GST invoice, keep your
                  order number ready and contact our support team.
                </p>

                <p>
                  For business purchases, please make sure the billing details you
                  provide are accurate before requesting a business GST invoice.
                  If a GSTIN is required on the invoice, share the correct GSTIN
                  and legal business name with our support team.
                </p>

                <p>
                  Tax treatment may differ depending on the product, applicable GST
                  rate and place of supply. The invoice generated for the actual
                  order is the relevant record for that transaction.
                </p>
              </div>
            </section>

            <section className="rounded-2xl bg-[#741f23] p-5 text-white sm:p-6">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-[#f0c987]" aria-hidden="true" />
                <h2 className="text-base font-black">Need your GST invoice?</h2>
              </div>

              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#f4dfbf]">
                Contact us with your order number and billing details. We will help
                you with the invoice information available for your order.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`mailto:${BUSINESS_INFO.email}`}
                  className="rounded-xl bg-[#f0c987] px-4 py-2.5 text-xs font-black text-[#741f23] transition hover:bg-white"
                >
                  Email Support
                </a>

                <Link
                  href="/orders"
                  className="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
                >
                  View Orders
                </Link>
              </div>
            </section>

            <p className="text-[11px] leading-relaxed text-gray-500">
              This page is provided for customer information. The final GST
              treatment, tax values and invoice particulars depend on the actual
              order data and applicable tax rules for the transaction.
            </p>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
