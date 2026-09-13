'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type RatingSummary = {
  average: number;
  count: number;
};

const summaryCache = new Map<string, RatingSummary>();
const pendingProductIds = new Set<string>();
const listeners = new Map<string, Set<(summary: RatingSummary) => void>>();
let batchScheduled = false;

function publish(productId: string, summary: RatingSummary) {
  summaryCache.set(productId, summary);
  const productListeners = listeners.get(productId);
  if (!productListeners) return;

  for (const listener of productListeners) {
    listener(summary);
  }
  listeners.delete(productId);
}

async function flushRatingBatch() {
  batchScheduled = false;
  const productIds = Array.from(pendingProductIds);
  pendingProductIds.clear();
  if (!productIds.length) return;

  const { data, error } = await supabase
    .from('reviews')
    .select('product_id, rating')
    .in('product_id', productIds)
    .eq('status', 'approved');

  if (error) {
    for (const productId of productIds) {
      publish(productId, { average: 0, count: 0 });
    }
    return;
  }

  const grouped = new Map<string, number[]>();

  for (const row of data || []) {
    const productId = String(row.product_id || '');
    const rating = Number(row.rating || 0);
    if (!productId || !rating) continue;

    const values = grouped.get(productId) || [];
    values.push(rating);
    grouped.set(productId, values);
  }

  for (const productId of productIds) {
    const values = grouped.get(productId) || [];
    const average = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
    publish(productId, { average, count: values.length });
  }
}

function requestRating(
  productId: string,
  listener: (summary: RatingSummary) => void
) {
  const cached = summaryCache.get(productId);
  if (cached) {
    listener(cached);
    return () => {};
  }

  const productListeners = listeners.get(productId) || new Set();
  productListeners.add(listener);
  listeners.set(productId, productListeners);
  pendingProductIds.add(productId);

  if (!batchScheduled) {
    batchScheduled = true;
    window.setTimeout(() => void flushRatingBatch(), 0);
  }

  return () => {
    const current = listeners.get(productId);
    current?.delete(listener);
    if (current && current.size === 0) {
      listeners.delete(productId);
    }
  };
}

export default function ProductRatingTag({ productId }: { productId: string }) {
  const [summary, setSummary] = useState<RatingSummary>(() =>
    summaryCache.get(productId) || { average: 0, count: 0 }
  );

  useEffect(() => requestRating(productId, setSummary), [productId]);

  return (
    <Link
      href={`/product/${productId}#reviews`}
      aria-label={
        summary.count
          ? `Open ${summary.average.toFixed(1)} star product reviews`
          : 'Open product reviews'
      }
      className="inline-flex min-h-6 max-w-full items-center gap-0.5 whitespace-nowrap rounded-full border border-[#ead8b8] bg-[#fffaf5] px-1.5 py-0.5 text-[9px] font-black leading-none text-[#741f23] shadow-sm transition hover:border-[#d7aa5b] hover:bg-[#fff7e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b] md:min-h-7 md:gap-1 md:px-2 md:py-1 md:text-[10px]"
    >
      <Star
        size={11}
        fill={summary.count ? 'currentColor' : 'none'}
        className="shrink-0 text-[#d7aa5b] md:h-3 md:w-3"
        aria-hidden="true"
      />
      <span className="min-w-0 truncate">
        {summary.count
          ? `${summary.average.toFixed(1)} (${summary.count})`
          : 'No reviews'}
      </span>
    </Link>
  );
}
