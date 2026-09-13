import Link from 'next/link';
import { ArrowRight, Sparkles, ShoppingBag } from 'lucide-react';

const mobileShortcuts = [
  { label: 'Featured', href: '#featured-products-heading' },
  { label: 'Dhoti Choli', href: '/collections/dhoti-choli' },
  { label: 'Wedding', href: '/search?q=Wedding' },
  { label: 'Haldi', href: '/search?q=Haldi' },
  { label: 'Navratri', href: '/search?q=Navratri' },
  { label: 'Girls', href: '/search?q=Girls' },
];

export default function MobileHomeDiscovery() {
  return (
    <div
      data-mobile-home-discovery
      className="border-b border-[#ead8b8] bg-[#fffaf5] md:hidden"
    >
      <div className="mx-auto max-w-7xl px-4 pb-2.5 pt-2">
        <section
          aria-label="Mobile shopping introduction"
          className="relative overflow-hidden rounded-2xl border border-[#dfbd82] bg-gradient-to-br from-[#741f23] via-[#8d3035] to-[#5e171b] shadow-sm"
        >
          <div
            aria-hidden="true"
            className="absolute -right-8 -top-10 h-28 w-28 rounded-full border border-white/15 bg-white/5"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-12 right-10 h-24 w-24 rounded-full border border-[#f0c987]/20 bg-[#f0c987]/10"
          />

          <div className="relative flex min-h-[104px] items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#f0c987]">
                <Sparkles size={12} aria-hidden="true" />
                Shop the latest styles
              </p>
              <p className="mt-1 max-w-[15rem] text-lg font-black leading-tight tracking-tight text-white">
                Festive fashion, faster to browse
              </p>
              <Link
                href="#featured-products-heading"
                className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#741f23] shadow-sm"
              >
                Shop products
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>

            <div
              aria-hidden="true"
              className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-[#f0c987] backdrop-blur-sm"
            >
              <ShoppingBag size={30} strokeWidth={1.6} />
            </div>
          </div>
        </section>

        <nav
          id="mobile-shop-pills"
          aria-label="Quick shopping categories"
          className="scrollbar-hide -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-0.5 whitespace-nowrap"
        >
          {mobileShortcuts.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-[#e5cfa8] bg-white px-3 py-1.5 text-xs font-bold text-[#741f23] shadow-xs transition active:scale-[0.98]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
