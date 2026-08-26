import React from 'react';
import {
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Store,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react';

interface HomepageSellerTrustProps {
  showAmazon?: boolean;
  showFlipkart?: boolean;
  showMeesho?: boolean;
}

export default function HomepageSellerTrust({
  showAmazon = true,
  showFlipkart = true,
  showMeesho = true,
}: HomepageSellerTrustProps) {
  const marketplaces = [
    {
      id: 'amazon',
      platform: 'Amazon',
      sellerName: 'ADHYEY BROTHERS',
      description:
        'Explore the ADHYEY BROTHERS product catalog on Amazon India.',
      url: 'https://www.amazon.in/l/27943762031?me=AXKNNYVWLT32Y&tag=ShopReferral_d451e877-492b-4a44-8989-d4151cfc4c54&ref=sf_seller_app_share_new_ls_srb',
      ctaText: 'View on Amazon',
      accentBorder: 'hover:border-amber-400',
      glowColor: 'group-hover:shadow-amber-500/10',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
      tagColor: 'bg-amber-500',
      btnBg: 'bg-amber-500 hover:bg-amber-600 text-white',
    },
    {
      id: 'flipkart',
      platform: 'Flipkart',
      sellerName: 'ADHYEY BROTHERS',
      description:
        'Browse ADHYEY BROTHERS products and collections on Flipkart.',
      url: 'https://www.flipkart.com/adhyey-brothers-women-crop-top-skirt-ethnic-jacket-set/p/itm2881ff260ebcc?pid=ETHHJNJYHKNYXZPM',
      ctaText: 'View on Flipkart',
      accentBorder: 'hover:border-blue-400',
      glowColor: 'group-hover:shadow-blue-500/10',
      badgeBg: 'bg-blue-50 text-blue-900 border-blue-200',
      tagColor: 'bg-blue-600',
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    {
      id: 'meesho',
      platform: 'Meesho',
      sellerName: 'ADHYEY BROTHERS',
      description:
        'Find the ADHYEY BROTHERS profile and catalog on Meesho.',
      url: 'https://www.meesho.com/Adhyey?ms=2',
      ctaText: 'View on Meesho',
      accentBorder: 'hover:border-pink-400',
      glowColor: 'group-hover:shadow-pink-500/10',
      badgeBg: 'bg-pink-50 text-pink-900 border-pink-200',
      tagColor: 'bg-pink-600',
      btnBg: 'bg-pink-600 hover:bg-pink-700 text-white',
    },
  ].filter(
    (marketplace) =>
      ({
        amazon: showAmazon,
        flipkart: showFlipkart,
        meesho: showMeesho,
      })[marketplace.id]
  );

  if (marketplaces.length === 0) return null;

  return (
    <section
      aria-labelledby="seller-trust-heading"
      className="my-8 w-full border-t border-[#ead8b8] bg-[#fffaf5] py-12 md:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto mb-10 max-w-2xl space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#ead8b8] bg-[#fff7e8] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#741f23]">
            <ShieldCheck
              size={14}
              className="text-[#b5843d]"
            />
            <span>Marketplace Links</span>
          </div>

          <h2
            id="seller-trust-heading"
            className="text-2xl font-black tracking-tight text-[#741f23] sm:text-3xl"
          >
            Find ADHYEY BROTHERS on Marketplaces
          </h2>

          <p className="text-xs font-medium text-gray-600 sm:text-sm">
            Visit our marketplace pages using the links below
          </p>
        </div>

        {/* Primary Brand Context Note */}
        <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-[#ead8b8] bg-white p-4 text-center shadow-2xs">
          <p className="text-xs leading-relaxed text-gray-600">
            You can also find{' '}
            <strong className="font-bold text-[#741f23]">
              ADHYEY BROTHERS
            </strong>{' '}
            products on the marketplaces below. To browse our complete
            catalog and current offers, continue shopping on this website.
          </p>
        </div>

        {/* Marketplace Cards Grid */}
        <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {marketplaces.map((item) => (
            <div
              key={item.id}
              className={`group relative flex transform flex-col justify-between rounded-3xl border border-[#ead8b8] bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${item.accentBorder} ${item.glowColor}`}
            >
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-3 w-3 rounded-full ${item.tagColor}`}
                    />

                    <span className="text-base font-black tracking-tight text-[#741f23]">
                      {item.platform}
                    </span>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${item.badgeBg}`}
                  >
                    Marketplace Page
                  </span>
                </div>

                <div className="mb-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <Store
                      size={14}
                      className="text-[#b5843d]"
                    />
                    <span>Seller: {item.sellerName}</span>
                  </div>

                  <p className="text-xs leading-relaxed text-gray-500">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="mt-2 border-t border-gray-100 pt-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.ctaText} for ADHYEY BROTHERS (opens in a new tab)`}
                  className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-xs transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#741f23] ${item.btnBg}`}
                >
                  <span>{item.ctaText}</span>

                  <ExternalLink
                    size={13}
                    className="opacity-80 transition-opacity group-hover:opacity-100"
                  />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Clean Trust Badges Row */}
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-2xl border border-[#ead8b8] bg-white p-4 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff7e8] text-[#b5843d]">
              <Sparkles size={20} />
            </div>

            <div>
              <p className="text-xs font-bold text-[#741f23]">
                Product Information
              </p>
              <p className="text-[11px] text-gray-500">
                Product details shown clearly
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#ead8b8] bg-white p-4 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff7e8] text-[#741f23]">
              <ShieldCheck size={20} />
            </div>

            <div>
              <p className="text-xs font-bold text-[#741f23]">
                Surat Business
              </p>
              <p className="text-[11px] text-gray-500">
                ADHYEY BROTHERS Surat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#ead8b8] bg-white p-4 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <ShoppingBag size={18} />
            </div>

            <div>
              <p className="text-xs font-bold text-[#741f23]">
                Online Catalog
              </p>
              <p className="text-[11px] text-gray-500">
                Current prices displayed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#ead8b8] bg-white p-4 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff7e8] text-[#b5843d]">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <p className="text-xs font-bold text-[#741f23]">
                GST Invoicing
              </p>
              <p className="text-[11px] text-gray-500">
                24AKBPD1704F1Z1
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}