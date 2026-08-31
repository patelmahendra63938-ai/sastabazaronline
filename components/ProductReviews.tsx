'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Star, X, ShieldCheck, MessageSquare } from 'lucide-react';
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

export default function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('id,customer_name,rating,review_text,verified_purchase,created_at')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    setReviews((data || []) as Review[]);
  }

  useEffect(() => { loadReviews(); }, [productId]);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === '#reviews') setOpen(true);
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  const average = useMemo(() => {
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
        className="fixed bottom-24 left-4 z-40 rounded-full border border-[#ead8b8] bg-white px-4 py-2.5 shadow-lg flex items-center gap-2 text-xs font-bold text-[#741f23]"
        aria-label="Open customer ratings and reviews"
      >
        <Star size={15} fill="currentColor" className="text-[#d7aa5b]" />
        {reviews.length ? `${average.toFixed(1)} (${reviews.length} reviews)` : 'Customer Reviews'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] bg-black/50 p-3 sm:p-6 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="bg-[#fffdf9] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#ead8b8] shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-[#ead8b8] p-5 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-black text-[#741f23]">Customer Ratings & Reviews</h2>
                <p className="text-xs text-gray-500 mt-1">Only delivered orders can submit verified reviews.</p>
              </div>
              <button type="button" onClick={closePopup} className="p-2 rounded-full hover:bg-gray-100" aria-label="Close reviews">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div className="rounded-2xl bg-white border border-[#ead8b8] p-4 flex items-center gap-4">
                <div className="text-3xl font-black text-[#741f23]">{reviews.length ? average.toFixed(1) : '—'}</div>
                <div>
                  <div className="flex gap-0.5">{[1,2,3,4,5].map(n => <Star key={n} size={17} fill={n <= Math.round(average) ? 'currentColor' : 'none'} className="text-[#d7aa5b]" />)}</div>
                  <p className="text-xs text-gray-500 mt-1">{reviews.length} approved verified review{reviews.length === 1 ? '' : 's'}</p>
                </div>
              </div>

              <form onSubmit={submitReview} className="bg-white rounded-2xl border border-[#ead8b8] p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-black text-gray-900"><MessageSquare size={16} /> Write a verified review</div>
                <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star rating`}><Star size={24} fill={n <= rating ? 'currentColor' : 'none'} className="text-[#d7aa5b]" /></button>)}</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} required placeholder="Order number" className="border rounded-xl px-3 py-2 text-sm" />
                  <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="Order email" className="border rounded-xl px-3 py-2 text-sm" />
                </div>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} required minLength={10} maxLength={1000} rows={4} placeholder="Tell other customers about the product quality, fit, fabric, colour, or your experience." className="w-full border rounded-xl px-3 py-2 text-sm" />
                <div className="flex items-center gap-2 text-[11px] text-gray-500"><ShieldCheck size={14} className="text-green-600" /> Order number and email are used only to verify that this product was delivered to you.</div>
                {message && <p className="text-xs font-semibold text-[#741f23]">{message}</p>}
                <button disabled={submitting} type="submit" className="bg-[#741f23] text-white rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit Review'}</button>
              </form>

              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <div className="bg-white border border-dashed border-[#ead8b8] rounded-2xl p-8 text-center text-sm text-gray-500">No approved customer reviews yet. Be the first verified buyer to review this product.</div>
                ) : reviews.map(review => (
                  <article key={review.id} className="bg-white border border-[#ead8b8] rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-bold text-sm text-gray-900">{review.customer_name || 'Verified Customer'}</div>
                      {review.verified_purchase && <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">Verified Purchase</span>}
                    </div>
                    <div className="flex gap-0.5 mt-2">{[1,2,3,4,5].map(n => <Star key={n} size={14} fill={n <= review.rating ? 'currentColor' : 'none'} className="text-[#d7aa5b]" />)}</div>
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{review.review_text}</p>
                    <p className="text-[10px] text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString('en-IN')}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
