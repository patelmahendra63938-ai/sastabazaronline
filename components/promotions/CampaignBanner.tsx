'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getImageProps } from 'next/image';
import {
  Clock,
  Ticket,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Campaign } from '@/lib/promotions';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';

interface CampaignBannerProps {
  campaign?: Campaign | null;
}

export default function CampaignBanner({
  campaign,
}: CampaignBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    d: number;
    h: number;
    m: number;
    s: number;
  } | null>(null);

  const [isExpired, setIsExpired] =
    useState(false);

  const endAt = campaign?.end_at;

  useEffect(() => {
    if (!endAt) {
      return;
    }

    const target =
      new Date(endAt).getTime();

    const updateTimer = () => {
      const now =
        new Date().getTime();

      const diff =
        target - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
      } else {
        setIsExpired(false);

        setTimeLeft({
          d: Math.floor(
            diff /
              (1000 * 60 * 60 * 24)
          ),

          h: Math.floor(
            (diff %
              (1000 *
                60 *
                60 *
                24)) /
              (1000 * 60 * 60)
          ),

          m: Math.floor(
            (diff %
              (1000 * 60 * 60)) /
              (1000 * 60)
          ),

          s: Math.floor(
            (diff %
              (1000 * 60)) /
              1000
          ),
        });
      }
    };

    const initialUpdate =
      window.setTimeout(
        updateTimer,
        0
      );

    const interval =
      setInterval(
        updateTimer,
        1000
      );

    return () => {
      window.clearTimeout(
        initialUpdate
      );

      clearInterval(interval);
    };
  }, [endAt]);

  // Safety guard: hooks above always run in the same order.
  if (
    !campaign ||
    !campaign.end_at ||
    !campaign.start_at ||
    !campaign.is_enabled
  ) {
    return null;
  }

  const nowTimestamp =
    new Date().getTime();

  const startTimestamp =
    new Date(
      campaign.start_at
    ).getTime();

  if (
    startTimestamp >
    nowTimestamp
  ) {
    return null;
  }

  if (isExpired) {
    return null;
  }

  const themeClasses: Record<
    string,
    string
  > = {
    Festive:
      'bg-gradient-to-r from-[#741f23] via-[#8d3035] to-[#5e171b] text-white border-[#d7aa5b]/40 shadow-[#741f23]/10',

    Wedding:
      'bg-gradient-to-r from-rose-900 via-pink-900 to-rose-950 text-rose-100 border-rose-800/40 shadow-rose-900/10',

    Luxury:
      'bg-gradient-to-r from-[#3f1619] via-[#5e171b] to-[#741f23] text-[#fff7e8] border-[#d7aa5b]/30 shadow-black/10',

    Clearance:
      'bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white border-red-500/30 shadow-red-600/10',
  };

  const activeTheme =
    themeClasses[campaign.theme] ||
    themeClasses.Festive;

  const targetUrl =
    campaign.slug
      ? `/sale/${campaign.slug}`
      : `/?category=${encodeURIComponent(
          campaign.target_category ||
            ''
        )}`;

  const desktopBanner =
    getImageProps({
      src: resolveStorefrontImageSrc(
        campaign.banner_url ||
          campaign.mobile_banner_url
      ),

      alt: campaign.name,

      width: 1200,

      height: 660,

      sizes:
        '(max-width: 768px) 100vw, 42vw',

      fetchPriority: 'high',
    }).props;

  const mobileBanner =
    campaign.mobile_banner_url
      ? getImageProps({
          src: resolveStorefrontImageSrc(
            campaign.mobile_banner_url
          ),

          alt: campaign.name,

          width: 768,

          height: 440,

          sizes: '100vw',

          fetchPriority:
            'high',
        }).props
      : null;

  return (
    <Link
      href={targetUrl}
      className={`group relative my-4 block w-full cursor-pointer overflow-hidden rounded-3xl border shadow-xl transition-all duration-300 hover:border-white/40 hover:shadow-2xl ${activeTheme}`}
      aria-label={`View ${campaign.name}`}
    >
      <div className="flex flex-col items-stretch md:flex-row">
        {/* Responsive Banner Image Column */}
        {(campaign.banner_url ||
          campaign.mobile_banner_url) && (
          <div className="relative h-48 min-h-[220px] w-full shrink-0 overflow-hidden bg-black/10 md:h-auto md:w-5/12">
            <picture>
              {mobileBanner && (
                <source
                  media="(max-width: 768px)"
                  srcSet={
                    mobileBanner.srcSet
                  }
                />
              )}

              {/* getImageProps keeps art direction while using Next's image optimizer. */}
              <img
                {...desktopBanner}
                alt={campaign.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </picture>

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:bg-gradient-to-r" />
          </div>
        )}

        {/* Banner Details & Countdown Column */}
        <div className="flex flex-1 flex-col justify-center space-y-4 p-6 sm:p-8 md:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d7aa5b]/40 bg-black/30 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#f3d9a7] backdrop-blur-md">
              <Sparkles
                size={13}
                className="animate-pulse"
              />

              ADHYEY BROTHERS Exclusive Event
            </span>

            {campaign.coupon_code && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono text-[11px] font-bold tracking-widest text-white backdrop-blur-md">
                <Ticket
                  size={13}
                  className="text-[#d7aa5b]"
                />

                CODE:{' '}
                {campaign.coupon_code}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black uppercase leading-none tracking-tight text-white drop-shadow-sm sm:text-4xl lg:text-5xl">
              {campaign.name}
            </h2>

            <p className="mt-1 text-lg font-black text-[#f3d9a7] sm:text-2xl">
              {campaign.discount_type ===
              'PERCENTAGE'
                ? `${campaign.discount_value}% OFF`
                : `FLAT ₹${campaign.discount_value} OFF`}
            </p>

            <p className="mt-2 line-clamp-2 max-w-xl text-xs font-medium text-gray-100 opacity-90 sm:text-sm">
              {campaign.description ||
                'Shop our seasonal collection with automatic discounts applied at checkout.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {timeLeft && (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-4 py-2.5 font-mono text-xs font-bold text-[#f3d9a7] backdrop-blur-md">
                <Clock size={15} />

                <span>
                  Ends In:{' '}
                  {timeLeft.d}d{' '}
                  {timeLeft.h}h{' '}
                  {timeLeft.m}m{' '}
                  {timeLeft.s}s
                </span>
              </div>
            )}

            <div className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-black uppercase text-[#741f23] shadow-lg transition-colors group-hover:bg-[#f3d9a7]">
              <span>
                Shop The Sale
              </span>

              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-1"
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}