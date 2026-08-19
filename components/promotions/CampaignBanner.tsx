'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Ticket, ArrowRight, Sparkles } from 'lucide-react';
import { Campaign } from '@/lib/promotions';

interface CampaignBannerProps {
  campaign?: Campaign | null;
}

export default function CampaignBanner({ campaign }: CampaignBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const endAt = campaign?.end_at;

  useEffect(() => {
    if (!endAt) {
      return;
    }

    const target = new Date(endAt).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
      } else {
        setIsExpired(false);
        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000)
        });
      }
    };

    const initialUpdate = window.setTimeout(updateTimer, 0);
    const interval = setInterval(updateTimer, 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      clearInterval(interval);
    };
  }, [endAt]);

  // Safety guard: hooks above always run in the same order.
  if (!campaign || !campaign.end_at || !campaign.start_at || !campaign.is_enabled) {
    return null;
  }

  const nowTimestamp = new Date().getTime();
  const startTimestamp = new Date(campaign.start_at).getTime();
  if (startTimestamp > nowTimestamp) {
    return null;
  }

  if (isExpired) return null;

  const themeClasses: Record<string, string> = {
    Festive: 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white border-orange-400/30 shadow-orange-500/10',
    Wedding: 'bg-gradient-to-r from-rose-900 via-pink-900 to-rose-950 text-rose-100 border-rose-800/40 shadow-rose-900/10',
    Luxury: 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-indigo-100 border-indigo-800/40 shadow-indigo-950/10',
    Clearance: 'bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white border-red-500/30 shadow-red-600/10'
  };

  const activeTheme = themeClasses[campaign.theme] || themeClasses.Festive;
  const targetUrl = campaign.slug ? `/sale/${campaign.slug}` : `/?category=${encodeURIComponent(campaign.target_category || '')}`;

  return (
    <Link
      href={targetUrl}
      className={`group block w-full rounded-3xl overflow-hidden shadow-xl border ${activeTheme} relative transition-all duration-300 hover:shadow-2xl hover:border-white/40 my-4 cursor-pointer`}
      aria-label={`View ${campaign.name}`}
    >
      <div className="flex flex-col md:flex-row items-stretch">
        {/* Responsive Banner Image Column */}
        {(campaign.banner_url || campaign.mobile_banner_url) && (
          <div className="w-full md:w-5/12 h-48 md:h-auto min-h-[220px] relative bg-black/10 overflow-hidden shrink-0">
            <picture>
              {campaign.mobile_banner_url && (
                <source media="(max-width: 768px)" srcSet={campaign.mobile_banner_url} />
              )}
              <img
                src={campaign.banner_url || campaign.mobile_banner_url || ''}
                alt={campaign.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                loading="eager"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          </div>
        )}

        {/* Banner Details & Countdown Column */}
        <div className="p-6 sm:p-8 md:p-10 flex-1 flex flex-col justify-center space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-yellow-300 border border-white/10">
              <Sparkles size={13} className="animate-pulse" />
              SASTABAZARONLINE Exclusive Event
            </span>
            {campaign.coupon_code && (
              <span className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-widest text-white border border-white/15">
                <Ticket size={13} className="text-yellow-400" />
                CODE: {campaign.coupon_code}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-none text-white drop-shadow-sm">
              {campaign.name}
            </h2>
            <p className="text-lg sm:text-2xl font-black text-yellow-300 mt-1">
              {campaign.discount_type === 'PERCENTAGE'
                ? `${campaign.discount_value}% OFF`
                : `FLAT ₹${campaign.discount_value} OFF`}
            </p>
            <p className="text-xs sm:text-sm font-medium opacity-90 max-w-xl text-gray-100 mt-2 line-clamp-2">
              {campaign.description || 'Shop our seasonal festival collection with automatic discounts applied at checkout.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {timeLeft && (
              <div className="flex items-center gap-2 bg-black/35 backdrop-blur-md px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-yellow-300 border border-white/10">
                <Clock size={15} />
                <span>
                  Ends In: {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
                </span>
              </div>
            )}

            <div className="inline-flex items-center gap-2 bg-white text-gray-950 font-black text-xs uppercase px-6 py-3 rounded-xl shadow-lg group-hover:bg-yellow-300 transition-colors">
              <span>Shop The Sale</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
