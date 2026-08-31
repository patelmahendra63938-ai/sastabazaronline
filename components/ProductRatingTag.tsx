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
      className="absolute bottom-2.5 left-2.5 z-20 inline-flex min-h-8 items-center gap-1 rounded-full border border-white/80 bg-white/95 px-2.5 py-1 text-[10px] font-black text-[#741f23] shadow-md backdrop-blur transition hover:bg-[#fff7e8]"
    >
      <Star size={12} fill={ratings.length ? 'currentColor' : 'none'} className="text-[#d7aa5b]" />
      {ratings.length ? `${average.toFixed(1)} (${ratings.length})` : 'No reviews'}
    </Link>
  );
}
