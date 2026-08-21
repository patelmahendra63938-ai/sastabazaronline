import React from 'react';
import { 
  ShieldCheck, 
  ExternalLink, 
  Sparkles, 
  Store, 
  CheckCircle2, 
  ShoppingBag 
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
      description: 'Explore the ADHYEY BROTHERS product catalog on Amazon India.',
      url: 'https://www.amazon.in/l/27943762031?me=AXKNNYVWLT32Y&tag=ShopReferral_d451e877-492b-4a44-8989-d4151cfc4c54&ref=sf_seller_app_share_new_ls_srb',
      ctaText: 'View on Amazon',
      accentBorder: 'hover:border-amber-400',
      glowColor: 'group-hover:shadow-amber-500/10',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
      tagColor: 'bg-amber-500',
      btnBg: 'bg-amber-500 hover:bg-amber-600 text-white'
    },
    {
      id: 'flipkart',
      platform: 'Flipkart',
      sellerName: 'ADHYEY BROTHERS',
      description: 'Browse ADHYEY BROTHERS products and collections on Flipkart.',
      url: 'https://www.flipkart.com/adhyey-brothers-women-crop-top-skirt-ethnic-jacket-set/p/itm2881ff260ebcc?pid=ETHHJNJYHKNYXZPM',
      ctaText: 'View on Flipkart',
      accentBorder: 'hover:border-blue-400',
      glowColor: 'group-hover:shadow-blue-500/10',
      badgeBg: 'bg-blue-50 text-blue-900 border-blue-200',
      tagColor: 'bg-blue-600',
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    {
      id: 'meesho',
      platform: 'Meesho',
      sellerName: 'ADHYEY BROTHERS',
      description: 'Find the ADHYEY BROTHERS profile and catalog on Meesho.',
      url: 'https://www.meesho.com/Adhyey?ms=2',
      ctaText: 'View on Meesho',
      accentBorder: 'hover:border-pink-400',
      glowColor: 'group-hover:shadow-pink-500/10',
      badgeBg: 'bg-pink-50 text-pink-900 border-pink-200',
      tagColor: 'bg-pink-600',
      btnBg: 'bg-pink-600 hover:bg-pink-700 text-white'
    }
  ].filter((marketplace) => ({ amazon: showAmazon, flipkart: showFlipkart, meesho: showMeesho })[marketplace.id]);

  if (marketplaces.length === 0) return null;

  return (
    <section 
      aria-labelledby="seller-trust-heading" 
      className="w-full py-12 md:py-16 bg-[#F8F9FB] border-t border-gray-200/60 my-8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-950 text-[11px] font-bold tracking-wide uppercase">
            <ShieldCheck size={14} className="text-orange-500" />
            <span>Marketplace Links</span>
          </div>
          <h2 
            id="seller-trust-heading" 
            className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight"
          >
            Find ADHYEY BROTHERS on Marketplaces
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            Visit our configured marketplace pages using the links below
          </p>
        </div>

        {/* Primary Brand Context Note */}
        <div className="mb-8 p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs max-w-3xl mx-auto text-center">
          <p className="text-xs text-gray-600 leading-relaxed">
            You can also find <strong className="text-indigo-950 font-bold">ADHYEY BROTHERS</strong> products on the marketplaces below.
            To browse the complete SASTABAZARONLINE catalog and current offers, continue shopping on this website.
          </p>
        </div>

        {/* Marketplace Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {marketplaces.map((item) => (
            <div
              key={item.id}
              className={`group relative bg-white rounded-3xl border border-gray-200/90 p-6 shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${item.accentBorder} ${item.glowColor} flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${item.tagColor}`} />
                    <span className="text-base font-black text-indigo-950 tracking-tight">
                      {item.platform}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.badgeBg}`}>
                    Marketplace Page
                  </span>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <Store size={14} className="text-gray-400" />
                    <span>Seller: {item.sellerName}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 mt-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.ctaText} for ADHYEY BROTHERS (opens in a new tab)`}
                  className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-600 ${item.btnBg}`}
                >
                  <span>{item.ctaText}</span>
                  <ExternalLink size={13} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Clean Trust Badges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 max-w-4xl mx-auto">
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">Product Information</p>
              <p className="text-[11px] text-gray-500">Product details shown clearly</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">Surat Business</p>
              <p className="text-[11px] text-gray-500">ADHYEY BROTHERS Surat</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <ShoppingBag size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">Online Catalog</p>
              <p className="text-[11px] text-gray-500">Current prices displayed</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">GST Invoicing</p>
              <p className="text-[11px] text-gray-500">24AKBPD1704F1Z1</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
