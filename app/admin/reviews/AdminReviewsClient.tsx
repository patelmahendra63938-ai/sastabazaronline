'use client';

import { useState, useTransition } from 'react';
import { CheckCircle, Loader2, Star, Trash2, XCircle } from 'lucide-react';
import { deleteReviewAction, moderateReviewAction } from '@/actions/reviews';

type ReviewRow = {
  id: string;
  product_id: string;
  order_number: string;
  customer_name: string;
  rating: number;
  review_text: string;
  status: 'pending' | 'approved' | 'rejected';
  verified_purchase: boolean;
  created_at: string;
};

export default function AdminReviewsClient({ initialReviews }: { initialReviews: ReviewRow[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [pending, startTransition] = useTransition();

  function updateStatus(id: string, status: 'approved' | 'rejected') {
    startTransition(async () => {
      const result = await moderateReviewAction({ reviewId: id, status });
      if (result.success) setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      else alert(result.error || 'Review could not be updated.');
    });
  }

  function remove(id: string) {
    if (!confirm('Delete this review permanently?')) return;
    startTransition(async () => {
      const result = await deleteReviewAction(id);
      if (result.success) setReviews(prev => prev.filter(r => r.id !== id));
      else alert(result.error || 'Review could not be deleted.');
    });
  }

  if (!reviews.length) {
    return <div className="bg-white rounded-2xl border p-12 text-center text-sm text-gray-500">No customer reviews yet.</div>;
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden relative">
      {pending && <div className="absolute inset-0 z-10 bg-white/50 flex items-start justify-center pt-8"><Loader2 className="animate-spin" /></div>}
      <div className="divide-y">
        {reviews.map(review => (
          <div key={review.id} className="p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-gray-900">{review.customer_name || 'Verified Customer'}</span>
                  <span className="inline-flex items-center gap-1 rounded bg-green-600 text-white px-2 py-0.5 text-[10px] font-bold">{review.rating}<Star size={10} fill="white" /></span>
                  {review.verified_purchase && <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">Verified Purchase</span>}
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${review.status === 'approved' ? 'bg-blue-50 text-blue-700' : review.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{review.status.toUpperCase()}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Order {review.order_number} · {new Date(review.created_at).toLocaleString('en-IN')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateStatus(review.id, 'approved')} className="inline-flex items-center gap-1 rounded-lg bg-green-600 text-white px-3 py-2 text-xs font-bold"><CheckCircle size={14} /> Approve</button>
                <button onClick={() => updateStatus(review.id, 'rejected')} className="inline-flex items-center gap-1 rounded-lg bg-gray-700 text-white px-3 py-2 text-xs font-bold"><XCircle size={14} /> Reject</button>
                <button onClick={() => remove(review.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" aria-label="Delete review"><Trash2 size={16} /></button>
              </div>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.review_text}</p>
            <p className="text-[10px] text-gray-400 font-mono">Product: {review.product_id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
