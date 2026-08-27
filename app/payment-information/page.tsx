import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import {
  BadgeCheck,
  Banknote,
  CreditCard,
  LockKeyhole,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Payment Information | ADHYEY BROTHERS',
  description:
    'Learn about secure online payments, Cash on Delivery, payment verification and order confirmation at ADHYEY BROTHERS.',
};

export default function PaymentInformationPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] text-stone-900">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="overflow-hidden rounded-3xl border border-[#ead8b8] bg-white shadow-sm">
          <div className="bg-[#741f23] px-5 py-8 text-white sm:px-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-[#f0c987]">
              <LockKeyhole size={24} aria-hidden="true" />
            </div>

            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#f0c987]">
              Secure Checkout
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Payment Information
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#f4dfbf]">
              ADHYEY BROTHERS currently supports secure online payment through
              PhonePe and Cash on Delivery where available. This page explains
              how payment verification and order confirmation work.
            </p>
          </div>

          <div className="space-y-8 p-5 sm:p-8">
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#ead8b8] bg-[#fff7e8] p-5">
                <div className="flex items-center gap-2 text-[#741f23]">
                  <CreditCard size={18} aria-hidden="true" />
                  <h2 className="text-sm font-black">Online Payment</h2>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-gray-600">
                  When you choose online payment at checkout, you are redirected
                  to the secure PhonePe payment flow. After payment, our website
                  verifies the payment status before confirming the order.
                </p>
              </div>

              <div className="rounded-2xl border border-[#ead8b8] bg-white p-5">
                <div className="flex items-center gap-2 text-[#741f23]">
                  <Banknote size={18} aria-hidden="true" />
                  <h2 className="text-sm font-black">Cash on Delivery</h2>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-gray-600">
                  Cash on Delivery may be available for eligible delivery PIN
                  codes. Availability and applicable order charges are checked
                  during checkout before the order is placed.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-black text-[#741f23]">
                How online payment confirmation works
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: '1. Verify delivery',
                    detail:
                      'Enter your delivery PIN code and complete the serviceability and pricing check.',
                    icon: PackageCheck,
                  },
                  {
                    title: '2. Choose Online Payment',
                    detail:
                      'Select the online payment option during checkout.',
                    icon: CreditCard,
                  },
                  {
                    title: '3. Complete PhonePe payment',
                    detail:
                      'You are sent to the secure payment page to complete the transaction.',
                    icon: ShieldCheck,
                  },
                  {
                    title: '4. Payment is verified',
                    detail:
                      'After returning to the website, the payment status is verified before the order is confirmed.',
                    icon: RefreshCw,
                  },
                ].map(({ title, detail, icon: Icon }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-gray-200 bg-[#fffdf9] p-4"
                  >
                    <div className="flex items-center gap-2 text-[#741f23]">
                      <Icon size={16} aria-hidden="true" />
                      <h3 className="text-xs font-black">{title}</h3>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-600">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-5 sm:p-6">
              <h2 className="text-base font-black text-[#741f23]">
                If payment shows as pending
              </h2>

              <div className="mt-4 space-y-3 text-xs leading-relaxed text-gray-600">
                <p>
                  In some cases, the payment provider may take extra time to
                  return the final payment status. If this happens, do not make
                  a second payment immediately.
                </p>

                <p>
                  Wait for the verification process to complete and check your
                  order status. If the payment remains unclear, contact support
                  with your payment and order details.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#ead8b8] bg-white p-5 sm:p-6">
              <h2 className="text-base font-black text-[#741f23]">
                Payment safety
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  'Always complete online payment through the checkout flow on our website.',
                  'Do not share OTP, UPI PIN, card PIN or banking password with anyone.',
                  'The order is confirmed only after the website receives the relevant payment result.',
                  'Keep your payment reference or transaction details until your order is confirmed.',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 rounded-xl bg-[#fff7e8] p-3 text-xs text-gray-700"
                  >
                    <BadgeCheck size={15} className="mt-0.5 shrink-0 text-[#b5843d]" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-[#741f23] p-5 text-white sm:p-6">
              <h2 className="text-base font-black">Need payment help?</h2>

              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#f4dfbf]">
                If you completed a payment but cannot confirm your order status,
                use the order page or contact our support team before attempting
                another payment.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/orders"
                  className="rounded-xl bg-[#f0c987] px-4 py-2.5 text-xs font-black text-[#741f23] transition hover:bg-white"
                >
                  View Orders
                </Link>

                <Link
                  href="/contact"
                  className="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
                >
                  Contact Support
                </Link>
              </div>
            </section>

            <p className="text-[11px] leading-relaxed text-gray-500">
              Available payment methods and delivery eligibility may depend on
              your PIN code, order details and the options presented during
              checkout.
            </p>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
