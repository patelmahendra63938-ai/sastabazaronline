'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Star, CheckCircle, Trash2, Loader2 } from 'lucide-react';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setReviews(data);
      }
      setLoading(false);
    };
    fetchReviews();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    await supabase.from('reviews').delete().eq('id', id);
    setReviews(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-indigo-950">Customer Reviews & Moderation</h1>
        <p className="text-xs text-gray-500 mt-1">Manage customer feedback, star ratings, and store trust metrics.</p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No Customer Reviews Yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">Feedback submitted by customers on product pages will appear here for moderation.</p>
          </div>
        ) : (
          <div className="divide-y text-xs">
            {reviews.map(rev => (
              <div key={rev.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{rev.customer_name || 'Anonymous'}</span>
                    <span className="flex items-center bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                      {rev.rating} <Star size={10} fill="white" className="ml-0.5" />
                    </span>
                  </div>
                  <p className="text-gray-600">{rev.comment || rev.review_text}</p>
                </div>
                <button onClick={() => handleDelete(rev.id)} className="text-red-500 hover:text-red-700 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}