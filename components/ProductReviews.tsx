'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Star, X, ShieldCheck, MessageSquare, BadgeCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { submitVerifiedReviewAction } from '@/actions/reviews';

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  verified_purchase: boolean;
  created_at: string;
};

type RatingSummary = { average: number; count: number };

function formatReviewDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<RatingSummary>({ average: 0, count: 0 });
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadReviews() {
    const [{ data: reviewRows }, { data: product }] = await Promise.all([
      supabase
        .from('reviews')
        .select('id,customer_name,rating,review_text,verified_purchase,created_at')
        .eq('product_id', productId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
      supabase
        .from('products')
        .select('rating,review_count')
        .eq('id', productId)
        .maybeSingle(),
    ]);

    const rows = (reviewRows || []) as Review[];
    setReviews(rows);

    const storedAverage = Number(product?.rating || 0);
    const storedCount = Number(product?.review_count || 0);
    if (storedCount > 0 && storedAverage > 0) {
      setSummary({ average: storedAverage, count: storedCount });
    } else if (rows.length) {
      setSummary({
        average: rows.reduce((sum, item) => sum + Number(item.rating || 0), 0) / rows.length,
        count: rows.length,
      });
    } else {
      setSummary({ average: 0, count: 0 });
    }
  }

  useEffect(() => { void loadReviews(); }, [productId]);

  useEffect(() => {
    const openFromHash = () => { if (window.location.hash === '#reviews') setOpen(true); };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  const writtenAverage = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length;
  }, [reviews]);

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const result = await submitVerifiedReviewAction({ productId, orderNumber, email, rating, reviewText });
    setSubmitting(false);
    setMessage(result.message || result.error || null);
    if (result.success) {
      setReviewText('');
      setOrderNumber('');
      setEmail('');
    }
  }

  function closePopup() {
    setOpen(false);
    if (window.location.hash === '#reviews') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  }

  return (
    <>
      <button
        id="reviews"
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-full border border-[#ead8b8] bg-white px-4 py-2.5 text-xs font-bold text-[#741f23] shadow-lg"
        aria-label="Open customer ratings and reviews"
      >
        <Star size={15} fill={summary.count ? 'currentColor' : 'none'} className="text-[#d7aa5b]" />
        {summary.count ? `${summary.average.toFixed(1)} (${summary.count} reviews)` : 'Write a review'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#ead8b8] bg-[#fffdf9] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ead8b8] bg-white p-5">
              <div>
                <h2 className="text-xl font-black text-[#741f23]">Customer Ratings & Reviews</h2>
                <p className="mt-1 text-xs text-gray-500">See the overall product rating and customer review details.</p>
              </div>
              <button type="button" onClick={closePopup} className="rounded-full p-2 hover:bg-gray-100" aria-label="Close reviews"><X size={20} /></button>
            </div>

            <div className="space-y-6 p-5">
              <div className="rounded-2xl border border-[#ead8b8] bg-white p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="flex items-end gap-2">
                      <div className="text-4xl font-black text-[#741f23]">{summary.count ? summary.average.toFixed(1) : '—'}</div>
                      <span className="pb-1 text-xs font-semibold text-gray-500">/ 5</span>
                    </div>
                    <div className="mt-1 flex gap-0.5">
                      {[1,2,3,4,5].map(n => <Star key={n} size={17} fill={summary.count && n <= Math.round(summary.average) ? 'currentColor' : 'none'} className="text-[#d7aa5b]" />)}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-gray-900">{summary.count} review{summary.count === 1 ? '' : 's'}</p>
                    {reviews.length > 0 && summary.count !== reviews.length && (
                      <p className="mt-1 text-xs text-gray-500">{reviews.length} written review{reviews.length === 1 ? '' : 's'} shown below</p>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={submitReview} className="space-y-3 rounded-2xl border border-[#ead8b8] bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-black text-gray-900"><MessageSquare size={16} /> Write a review</div>
                <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star rating`}><Star size={24} fill={n <= rating ? 'currentColor' : 'none'} className="text-[#d7aa5b]" /></button>)}</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} required placeholder="Order number" className="rounded-xl border px-3 py-2 text-sm" />
                  <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="Order email" className="rounded-xl border px-3 py-2 text-sm" />
                </div>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} required minLength={10} maxLength={1000} rows={4} placeholder="Tell other customers about the product quality, fit, fabric, colour, or your experience." className="w-full rounded-xl border px-3 py-2 text-sm" />
                <div className="flex items-center gap-2 text-[11px] text-gray-500"><ShieldCheck size={14} className="text-green-600" /> Order details are used only to confirm the purchase.</div>
                {message && <p className="text-xs font-semibold text-[#741f23]">{message}</p>}
                <button disabled={submitting} type="submit" className="rounded-xl bg-[#741f23] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit Review'}</button>
              </form>

              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#ead8b8] bg-white p-8 text-center text-sm text-gray-500">
                    No written customer reviews yet. Be the first customer to review this product.
                  </div>
                ) : (
                  <>
                    {summary.count !== reviews.length && (
                      <div className="rounded-xl bg-[#fff7e8] px-4 py-3 text-xs text-gray-600">
                        Overall rating: {summary.average.toFixed(1)} from {summary.count} reviews. Written reviews available here: {reviews.length}{writtenAverage ? ` (average ${writtenAverage.toFixed(1)})` : ''}.
                      </div>
                    )}
                    {reviews.map(review => (
                      <article key={review.id} className="rounded-2xl border border-[#ead8b8] bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-bold text-sm text-gray-900">{review.customer_name || 'Customer'}</div>
                          {review.verified_purchase && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700 ring-1 ring-inset ring-green-200"><BadgeCheck size={12} /> Verified Purchase</span>
                          )}
                        </div>
                        <div className="mt-2 flex gap-0.5">{[1,2,3,4,5].map(n => <Star key={n} size={14} fill={n <= review.rating ? 'currentColor' : 'none'} className="text-[#d7aa5b]" />)}</div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{review.review_text}</p>
                        <p className="mt-3 text-[11px] text-gray-500">Reviewed on {formatReviewDate(review.created_at)}</p>
                      </article>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
