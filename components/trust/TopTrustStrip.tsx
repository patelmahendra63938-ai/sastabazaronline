import Link from 'next/link';
import {
  Headphones,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Truck,
  WalletCards,
} from 'lucide-react';

const items = [
  {
    title: 'Secure Payments',
    detail: 'Pay safely through our online checkout.',
    icon: WalletCards,
  },
  {
    title: 'GST Invoice',
    detail: 'GST invoice information available for eligible orders.',
    icon: ReceiptText,
  },
  {
    title: 'Tracked Delivery',
    detail: 'Shipment updates and AWB tracking after dispatch.',
    icon: Truck,
  },
  {
    title: '7-Day Return Policy',
    detail: 'Eligible items can be returned as per policy terms.',
    icon: RotateCcw,
    href: '/return-policy',
  },
  {
    title: 'Customer Support',
    detail: 'Help for orders, payment, shipping and delivery.',
    icon: Headphones,
  },
];

export default function TopTrustStrip() {
  return (
    <section
      aria-labelledby="top-trust-heading"
      className="overflow-hidden rounded-3xl border border-[#ead8b8] bg-white shadow-xs"
    >
      <div className="border-b border-[#ead8b8] bg-[#741f23] px-4 py-3 text-center sm:px-6">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck size={17} className="text-[#f0c987]" aria-hidden="true" />
          <h2
            id="top-trust-heading"
            className="text-xs font-black uppercase tracking-[0.12em] text-white sm:text-sm"
          >
            Shop With Confidence
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x-0 divide-y divide-[#eee7df] sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
        {items.map(({ title, detail, icon: Icon, href }) => {
          const content = (
            <div className="h-full p-4 text-center transition hover:bg-[#fffaf5] sm:p-5">
              <div className="mx-auto mb-2 flex size-9 items-center justify-center rounded-xl bg-[#fff2dc] text-[#741f23]">
                <Icon size={18} aria-hidden="true" />
              </div>
              <h3 className="text-[11px] font-black text-[#741f23] sm:text-xs">
                {title}
              </h3>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-500 sm:text-[11px]">
                {detail}
              </p>
            </div>
          );

          return href ? (
            <Link
              key={title}
              href={href}
              className="block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#741f23]"
            >
              {content}
            </Link>
          ) : (
            <div key={title}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}
