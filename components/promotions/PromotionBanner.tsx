'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getImageProps } from 'next/image';
import { Clock, Ticket } from 'lucide-react';
import { Campaign } from '@/lib/promotions';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';

export default function CampaignBanner({ campaign }: { campaign: Campaign }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const target = new Date(campaign.end_at).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;
      
      if (diff <= 0) {
        setIsExpired(true);
        clearInterval(interval);
      } else {
        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [campaign.end_at]);

  // Hide if expired, disabled, or if it hasn't started yet
  if (isExpired || !campaign.is_enabled || new Date(campaign.start_at).getTime() > new Date().getTime()) return null;

  // Theme configurations mapped cleanly
  const themeColors: Record<string, string> = {
    'Festive': 'bg-orange-600 text-white border-orange-700',
    'Wedding': 'bg-rose-900 text-rose-100 border-rose-950',
    'Luxury': 'bg-indigo-950 text-indigo-100 border-black',
    'Clearance': 'bg-red-600 text-white border-red-800'
  };
  const activeTheme = themeColors[campaign.theme] || themeColors['Festive'];
  const desktopBanner = getImageProps({
    src: resolveStorefrontImageSrc(campaign.banner_url || campaign.mobile_banner_url),
    alt: campaign.name,
    width: 1200,
    height: 660,
    sizes: '(max-width: 768px) 100vw, 42vw',
  }).props;
  const mobileBanner = campaign.mobile_banner_url
    ? getImageProps({
        src: resolveStorefrontImageSrc(campaign.mobile_banner_url),
        alt: campaign.name,
        width: 768,
        height: 440,
        sizes: '100vw',
      }).props
    : null;

  return (
    <div className={`w-full rounded-2xl overflow-hidden shadow-lg flex flex-col md:flex-row border ${activeTheme} relative`}>
      {(campaign.banner_url || campaign.mobile_banner_url) && (
        <div className="w-full md:w-5/12 h-40 md:h-auto shrink-0 relative">
          <picture>
            {mobileBanner && <source media="(max-width: 768px)" srcSet={mobileBanner.srcSet} />}
            {/* getImageProps keeps art direction while using Next's image optimizer. */}
            <img {...desktopBanner} alt={campaign.name} className="w-full h-full object-cover" />
          </picture>
        </div>
      )}
      
      <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
        <h3 className="text-2xl md:text-3xl font-black mb-1 uppercase tracking-wider">{campaign.name}</h3>
        <p className="text-sm font-medium mb-4 opacity-90">{campaign.description || `Celebrate with special savings on our collection.`}</p>
        
        <div className="flex items-center gap-4 flex-wrap mb-5">
          <div className="bg-white/20 px-4 py-2 rounded-xl text-lg font-black tracking-wide border border-white/30 backdrop-blur-sm">
            {campaign.discount_type === 'PERCENTAGE' ? `${campaign.discount_value}% OFF` : `₹${campaign.discount_value} OFF`}
          </div>
          {campaign.coupon_code && (
            <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-xl text-xs font-mono font-bold tracking-widest border border-black/40">
              <Ticket size={16} /> USE CODE: {campaign.coupon_code}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {timeLeft && (
            <div className="flex items-center gap-2 bg-black/20 px-4 py-2.5 rounded-xl text-xs font-mono font-bold tracking-widest">
              <Clock size={16} />
              <span>Ends In: {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s</span>
            </div>
          )}
          <Link href={`/sale/${campaign.slug}`} className="bg-white text-gray-900 hover:bg-gray-100 text-xs font-black px-8 py-3 rounded-xl transition shadow-xl uppercase">
            Shop The Sale →
          </Link>
        </div>
      </div>
    </div>
  );
}
