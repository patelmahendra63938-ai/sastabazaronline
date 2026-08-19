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
  Star 
} from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  comment: string;
  rating?: number;
  isVerifiedPurchase?: boolean;
}

interface SellerMarketplaceTrustProps {
  // URLs supplied via configuration / env / props. If empty, card is not rendered.
  amazonUrl?: Hey, check out the products that I am selling on Amazon. You can visit my storefront on Amazon from here:
https://www.amazon.in/l/27943762031?me=AXKNNYVWLT32Y&tag=ShopReferral_d451e877-492b-4a44-8989-d4151cfc4c54&ref=sf_seller_app_share_new_ls_srb
You easily can browse popular products, best offers, and top discounted products on my storefront. If you like the products, then please share my storefront with others in your network who might be interested.;
  flipkartUrl?: https://www.flipkart.com/adhyey-brothers-women-crop-top-skirt-ethnic-jacket-set/p/itm2881ff260ebcc?pid=ETHHJNJYHKNYXZPM;
  meeshoUrl?: https://www.meesho.com/Adhyey?ms=2;
  // Authentic synchronized testimonials only. Pass empty array if none exist.
  testimonials?: Testimonial[];
}

export default function SellerMarketplaceTrust({
  amazonUrl = process.env.NEXT_PUBLIC_SELLER_AMAZON_URL || '',
  flipkartUrl = process.env.NEXT_PUBLIC_SELLER_FLIPKART_URL || '',
  meeshoUrl = process.env.NEXT_PUBLIC_SELLER_MEESHO_URL || '',
  testimonials = []
}: SellerMarketplaceTrustProps) {
  const marketplaces = [
    {
      id: 'amazon',
      platform: 'Amazon',
      sellerName: 'Adhyey Brothers',
      description: 'Find our catalog of home, kitchen, and lifestyle items on Amazon India.',
      url: amazonUrl,
      accentBorder: 'hover:border-amber-400',
      glowColor: 'group-hover:shadow-amber-500/10',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
      ctaText: 'Visit Seller Profile',
      tagColor: 'bg-amber-500'
    },
    {
      id: 'flipkart',
      platform: 'Flipkart',
      sellerName: 'Adhyey Brothers',
      description: 'Explore our verified range of products directly on Flipkart marketplace.',
      url: flipkartUrl,
      accentBorder: 'hover:border-blue-400',
      glowColor: 'group-hover:shadow-blue-500/10',
      badgeBg: 'bg-blue-50 text-blue-900 border-blue-200',
      ctaText: 'Visit Seller Profile',
      tagColor: 'bg-blue-600'
    },
    {
      id: 'meesho',
      platform: 'Meesho',
      sellerName: 'Adhyey Brothers',
      description: 'Verify our wholesale catalog and merchant presence on Meesho.',
      url: meeshoUrl,
      accentBorder: 'hover:border-pink-400',
      glowColor: 'group-hover:shadow-pink-500/10',
      badgeBg: 'bg-pink-50 text-pink-900 border-pink-200',
      ctaText: 'Visit Seller Profile',
      tagColor: 'bg-pink-600'
    }
  ].filter(m => Boolean(m.url && m.url.trim() !== ''));

  return (
    <section 
      aria-labelledby="seller-trust-heading" 
      className="w-full py-12 md:py-16 bg-[#F8F9FB] border-t border-gray-150"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Header Block */}
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-950 text-[11px] font-bold tracking-wide uppercase">
            <ShieldCheck size={14} className="text-orange-500" />
            <span>Official Seller Verification</span>
          </div>
          <h2 
            id="seller-trust-heading" 
            className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight"
          >
            Trusted by Shoppers Across India
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            Verified seller presence across leading marketplaces
          </p>
        </div>

        {/* Verification Context Notice */}
        <div className="mb-8 p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs max-w-3xl mx-auto text-center">
          <p className="text-xs text-gray-600 leading-relaxed">
            Want to verify <strong className="text-indigo-950 font-bold">Adhyey Brothers</strong>? Check our seller presence on leading marketplaces below. 
            Enjoy factory-direct wholesale pricing, direct order tracking, and GST invoicing exclusively on <strong className="text-orange-600 font-bold">SASTABAZARONLINE</strong>.
          </p>
        </div>

        {/* Responsive Marketplace Cards Grid (3 on desktop, 2+1 on tablet, 1 on mobile) */}
        {marketplaces.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {marketplaces.map((item) => (
              <div
                key={item.id}
                className={`group relative bg-white rounded-3xl border border-gray-200/90 p-6 shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${item.accentBorder} ${item.glowColor} flex flex-col justify-between`}
              >
                <div>
                  {/* Card Header & Brand Identifier */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full ${item.tagColor}`} />
                      <span className="text-base font-black text-indigo-950 tracking-tight">
                        {item.platform}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.badgeBg}`}>
                      Verified Presence
                    </span>
                  </div>

                  {/* Seller Identity */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                      <Store size={14} className="text-gray-400" />
                      <span>Seller: {item.sellerName}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* External Action Button */}
                <div className="pt-4 border-t border-gray-100 mt-4">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${item.sellerName} profile on ${item.platform} (opens in new tab)`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-indigo-950 bg-gray-50 hover:bg-indigo-950 hover:text-white border border-gray-200 transition-colors duration-200 group-hover:border-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <span>{item.ctaText}</span>
                    <ExternalLink size={13} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Factually Supported Trust Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 max-w-5xl mx-auto">
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">100% Authentic</p>
              <p className="text-[11px] text-gray-500">Factory direct products</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">Verified Seller</p>
              <p className="text-[11px] text-gray-500">Adhyey Brothers Surat</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">Secure Checkout</p>
              <p className="text-[11px] text-gray-500">COD & Verified UPI</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">India-Wide Delivery</p>
              <p className="text-[11px] text-gray-500">PIN-verified courier dispatch</p>
            </div>
          </div>
        </div>

        {/* Genuine Customer Testimonials (Rendered strictly if verified data exists) */}
        {testimonials && testimonials.length > 0 && (
          <div className="mt-12 pt-10 border-t border-gray-200/80">
            <div className="text-center mb-6">
              <h3 className="text-lg font-black text-indigo-950">Verified Buyer Experiences</h3>
              <p className="text-xs text-gray-500">Real feedback from genuine orders</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testimonials.map((t) => (
                <div key={t.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                  {t.rating && (
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(Math.min(5, Math.max(1, t.rating)))].map((_, i) => (
                        <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-700 italic leading-relaxed">
                    &quot;{t.comment}&quot;
                  </p>
                  <div className="flex items-center justify-between text-[11px] border-t border-gray-100 pt-2 text-gray-500">
                    <span className="font-bold text-indigo-950">{t.name}</span>
                    {t.isVerifiedPurchase && (
                      <span className="text-green-700 flex items-center gap-1 font-semibold">
                        <CheckCircle2 size={12} /> Verified Order
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