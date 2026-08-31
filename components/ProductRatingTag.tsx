'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ProductRatingTag({ productId }: { productId: string }) {
  const [ratings, setRatings] = useState<number[]>([]);

  useEffect(() => {
    let active = true;

    async function loadRating() {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', productId)
        .eq('status', 'approved');

      if (!active || error) return;
      setRatings((data || []).map(item => Number(item.rating || 0)).filter(Boolean));
    }

    loadRating();
    return () => { active = false; };
  }, [productId]);

  const average = useMemo(() => {
    if (!ratings.length) return 0;
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }, [ratings]);

  return (
    <Link
      href={`/product/${productId}#reviews`}
      aria-label={ratings.length ? `Open ${average.toFixed(1)} star product reviews` : 'Open product reviews'}
      className="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full border border-[#ead8b8] bg-[#fffaf5] px-2 py-1 text-[10px] font-black text-[#741f23] shadow-sm transition hover:border-[#d7aa5b] hover:bg-[#fff7e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b]"
    >
      <Star size={12} fill={ratings.length ? 'currentColor' : 'none'} className="text-[#d7aa5b]" aria-hidden="true" />
      {ratings.length ? `${average.toFixed(1)} (${ratings.length})` : 'No reviews'}
    </Link>
  );
}
