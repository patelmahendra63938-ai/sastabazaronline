import { MessageSquare } from 'lucide-react';
import { requireAdminUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import AdminReviewsClient from './AdminReviewsClient';

export default async function AdminReviewsPage() {
  await requireAdminUser();

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('id,product_id,order_number,customer_name,rating,review_text,status,verified_purchase,created_at')
    .order('created_at', { ascending: false });

  const reviews = !error && data ? data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-indigo-950">Customer Reviews & Moderation</h1>
        <p className="text-xs text-gray-500 mt-1">Approve or reject verified-purchase product reviews before they appear publicly and in Google product structured data.</p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 text-sm">
          Reviews could not be loaded. Confirm the verified product reviews migration has been applied in Supabase.
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto"><MessageSquare size={24} /></div>
          <h3 className="text-sm font-bold text-gray-900">No Customer Reviews Yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">Verified feedback submitted after delivered orders will appear here for approval.</p>
        </div>
      ) : (
        <AdminReviewsClient initialReviews={reviews as any} />
      )}
    </div>
  );
}
