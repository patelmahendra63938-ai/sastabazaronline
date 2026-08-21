'use client';

import React from 'react';
import {
  ShieldCheck,
  ExternalLink,
  Truck,
  Lock,
  CheckCircle2,
  Store,
  Sparkles,
  Star,
} from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  comment: string;
  rating?: number;
  isVerifiedPurchase?: boolean;
}

interface SellerMarketplaceTrustProps {
  amazonUrl?: string;
  flipkartUrl?: string;
  meeshoUrl?: string;
  testimonials?: Testimonial[];
}

export default function SellerMarketplaceTrust({
  amazonUrl = process.env.NEXT_PUBLIC_SELLER_AMAZON_URL || '',
  flipkartUrl = process.env.NEXT_PUBLIC_SELLER_FLIPKART_URL || '',
  meeshoUrl = process.env.NEXT_PUBLIC_SELLER_MEESHO_URL || '',
  testimonials = [],
}: SellerMarketplaceTrustProps) {
  const marketplaces = [
    {
      id: 'amazon',
      platform: 'Amazon',
      sellerName: 'Adhyey Brothers',
      description:
        'Find our catalog of home, kitchen, and lifestyle items on Amazon India.',
      url: amazonUrl,
      accentBorder: 'hover:border-amber-400',
      glowColor: 'group-hover:shadow-amber-500/10',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
      ctaText: 'Visit Seller Profile',
      tagColor: 'bg-amber-500',
    },
    {
      id: 'flipkart',
      platform: 'Flipkart',
      sellerName: 'Adhyey Brothers',
      description:
        'Explore our verified range of products directly on Flipkart marketplace.',
      url: flipkartUrl,
      accentBorder: 'hover:border-blue-400',
      glowColor: 'group-hover:shadow-blue-500/10',
      badgeBg: 'bg-blue-50 text-blue-900 border-blue-200',
      ctaText: 'Visit Seller Profile',
      tagColor: 'bg-blue-600',
    },
    {
      id: 'meesho',
      platform: 'Meesho',
      sellerName: 'Adhyey Brothers',
      description:
        'Verify our wholesale catalog and merchant presence on Meesho.',
      url: meeshoUrl,
      accentBorder: 'hover:border-pink-400',
      glowColor: 'group-hover:shadow-pink-500/10',
      badgeBg: 'bg-pink-50 text-pink-900 border-pink-200',
      ctaText: 'Visit Seller Profile',
      tagColor: 'bg-pink-600',
    },
  ].filter((m) => Boolean(m.url && m.url.trim() !== ''));

  return (
    <section
      aria-labelledby="seller-trust-heading"
      className="w-full border-t border-gray-150 bg-[#F8F9FB] py-12 md:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header Block */}
        <div className="mx-auto mb-10 max-w-2xl space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-950">
            <ShieldCheck size={14} className="text-orange-500" />
            <span>Official Seller Verification</span>
          </div>

          <h2
            id="seller-trust-heading"
            className="text-2xl font-black tracking-tight text-indigo-950 sm:text-3xl"
          >
            Trusted by Shoppers Across India
          </h2>

          <p className="text-xs font-medium text-gray-600 sm:text-sm">
            Verified seller presence across leading marketplaces
          </p>
        </div>

        {/* Verification Context Notice */}
        <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-gray-200/80 bg-white p-4 text-center shadow-2xs">
          <p className="text-xs leading-relaxed text-gray-600">
            Want to verify{' '}
            <strong className="font-bold text-indigo-950">
              Adhyey Brothers
            </strong>
            ? Check our seller presence on leading marketplaces below. Enjoy
            factory-direct wholesale pricing, direct order tracking, and GST
            invoicing exclusively on{' '}
            <strong className="font-bold text-orange-600">
              SASTABAZARONLINE
            </strong>
            .
          </p>
        </div>

        {/* Marketplace Cards */}
        {marketplaces.length > 0 && (
          <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {marketplaces.map((item) => (
              <div
                key={item.id}
                className={`group relative flex flex-col justify-between rounded-3xl border border-gray-200/90 bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${item.accentBorder} ${item.glowColor}`}
              >
                <div>
                  {/* Card Header */}
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-3 w-3 rounded-full ${item.tagColor}`}
                      />

                      <span className="text-base font-black tracking-tight text-indigo-950">
                        {item.platform}
                      </span>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${item.badgeBg}`}
                    >
                      Verified Presence
                    </span>
                  </div>

                  {/* Seller Identity */}
                  <div className="mb-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                      <Store size={14} className="text-gray-400" />
                      <span>Seller: {item.sellerName}</span>
                    </div>

                    <p className="text-xs leading-relaxed text-gray-500">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* External Action Button */}
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${item.sellerName} profile on ${item.platform} (opens in new tab)`}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-indigo-950 transition-colors duration-200 hover:bg-indigo-950 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 group-hover:border-transparent"
                  >
                    <span>{item.ctaText}</span>

                    <ExternalLink
                      size={13}
                      className="opacity-70 transition-opacity group-hover:opacity-100"
                    />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trust Row */}
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Sparkles size={20} />
            </div>

            <div>
              <p className="text-xs font-bold text-indigo-950">
                100% Authentic
              </p>
              <p className="text-[11px] text-gray-500">
                Factory direct products
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldCheck size={20} />
            </div>

            <div>
              <p className="text-xs font-bold text-indigo-950">
                Verified Seller
              </p>
              <p className="text-[11px] text-gray-500">
                Adhyey Brothers Surat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <Lock size={18} />
            </div>

            <div>
              <p className="text-xs font-bold text-indigo-950">
                Secure Checkout
              </p>
              <p className="text-[11px] text-gray-500">
                COD &amp; Verified UPI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Truck size={20} />
            </div>

            <div>
              <p className="text-xs font-bold text-indigo-950">
                India-Wide Delivery
              </p>
              <p className="text-[11px] text-gray-500">
                PIN-verified courier dispatch
              </p>
            </div>
          </div>
        </div>

        {/* Customer Testimonials */}
        {testimonials.length > 0 && (
          <div className="mt-12 border-t border-gray-200/80 pt-10">
            <div className="mb-6 text-center">
              <h3 className="text-lg font-black text-indigo-950">
                Verified Buyer Experiences
              </h3>

              <p className="text-xs text-gray-500">
                Real feedback from genuine orders
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs"
                >
                  {t.rating && (
                    <div className="flex items-center gap-1 text-amber-500">
                      {[
                        ...Array(
                          Math.min(5, Math.max(1, Math.round(t.rating))),
                        ),
                      ].map((_, i) => (
                        <Star
                          key={i}
                          size={13}
                          className="fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                  )}

                  <p className="text-xs italic leading-relaxed text-gray-700">
                    &quot;{t.comment}&quot;
                  </p>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] text-gray-500">
                    <span className="font-bold text-indigo-950">
                      {t.name}
                    </span>

                    {t.isVerifiedPurchase && (
                      <span className="flex items-center gap-1 font-semibold text-green-700">
                        <CheckCircle2 size={12} />
                        Verified Order
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}