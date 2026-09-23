import Link from 'next/link';
import { requireAdminUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { approvePost, cancelPost, generateProductPosts, replacePost, savePostCaption } from './actions';

export const dynamic = 'force-dynamic';

const notice: Record<string, string> = {
  generated: 'Drafts are ready for review. Existing slots were left unchanged.',
  approved: 'Post approved for its scheduled slot.',
  saved: 'Caption saved. Review and approve the draft.',
  cancelled: 'Post cancelled.',
  replaced: 'New product draft prepared. Review and approve it.',
  expired: 'This slot has passed. Generate drafts for upcoming days.',
  'product-changed': 'Product price, image or availability changed. This draft needs a fresh review.',
  'no-products': 'No in-stock products with images are available.',
};

export default async function SocialPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  await requireAdminUser();
  const { result } = await searchParams;
  const configured = Boolean(process.env.META_SYSTEM_USER_ACCESS_TOKEN && process.env.CRON_SECRET);
  const enabled = process.env.META_PUBLISH_ENABLED === 'true';
  const { data: posts, error } = await supabaseAdmin.from('meta_product_posts')
    .select('id,channel,publish_date,scheduled_at,product_id,product_title,price_snapshot,image_url,caption,status,remote_post_id,error_message')
    .order('scheduled_at', { ascending: false }).limit(60);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-[#ead8b8] bg-white p-6">
        <h1 className="text-2xl font-bold text-[#741f23]">Meta product planner</h1>
        <p className="mt-2 text-sm text-stone-600">
          Facebook: 7:00 AM IST. Instagram: 7:00 PM IST. Products come from the website catalog.
          New drafts are prepared daily; each post needs your approval before it can publish.
        </p>
        <p className="mt-1 text-xs text-amber-800">
          On Vercel Hobby, a daily job may run later within its scheduled hour.
        </p>
        <p className="mt-2 text-sm font-semibold text-[#741f23]">
          Publishing: {configured && enabled ? 'enabled (Meta permissions still require a live check)' :
            'paused until server credentials and the publishing switch are configured'}
        </p>
        <form action={generateProductPosts} className="mt-4">
          <button className="rounded-lg bg-[#741f23] px-4 py-2 text-sm font-semibold text-white">
            Prepare next 7 days
          </button>
        </form>
        {result && <p role="status" className="mt-3 text-sm text-stone-700">{notice[result] || 'The request could not be completed. Please try again.'}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">Planner database is not ready yet.</p>}
      </div>

      <div className="space-y-4">
        {posts?.map((post) => (
          <article key={post.id} className="grid gap-4 rounded-2xl border border-[#ead8b8] bg-white p-4 md:grid-cols-[120px_1fr]">
            {/* Product images are public catalog images; no third-party upload happens here. */}
            <a href={post.image_url} target="_blank" rel="noreferrer" className="block h-32 overflow-hidden rounded-lg bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.image_url} alt={post.product_title} className="h-full w-full object-contain" />
            </a>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded bg-[#f4e6d2] px-2 py-1 font-bold capitalize">{post.channel}</span>
                <span>{post.publish_date} · {post.channel === 'facebook' ? '7:00 AM' : '7:00 PM'} IST</span>
                <span className="rounded bg-stone-100 px-2 py-1 font-semibold capitalize">{post.status}</span>
              </div>
              <Link href={`/product/${post.product_id}`} className="font-semibold text-[#741f23] underline">{post.product_title}</Link>
              <p className="text-xs text-stone-500">Price at draft creation: ₹{post.price_snapshot}</p>
              {post.status === 'pending' ? (
                <form action={savePostCaption} className="space-y-2">
                  <input type="hidden" name="id" value={post.id} />
                  <label className="block text-sm font-medium" htmlFor={`caption-${post.id}`}>Post caption</label>
                  <textarea id={`caption-${post.id}`} name="caption" defaultValue={post.caption} maxLength={2200} required rows={4}
                    className="w-full rounded-lg border border-stone-300 p-2 text-sm" />
                  <button className="rounded-lg border border-[#741f23] px-3 py-1.5 text-sm text-[#741f23]">Save caption</button>
                </form>
              ) : <p className="whitespace-pre-wrap text-sm text-stone-700">{post.caption}</p>}
              {post.error_message && <p className="text-xs text-red-700">Publishing failed: {post.error_message}</p>}
              {post.remote_post_id && <p className="text-xs text-stone-500">Meta post ID: {post.remote_post_id}</p>}
              <div className="flex gap-2">
                {post.status === 'pending' && (
                  <form action={approvePost}><input type="hidden" name="id" value={post.id} />
                    <button className="rounded-lg bg-green-700 px-3 py-1.5 text-sm text-white">Approve</button></form>
                )}
                {['pending', 'approved'].includes(post.status) && (
                  <form action={cancelPost}><input type="hidden" name="id" value={post.id} />
                    <button className="rounded-lg border border-red-600 px-3 py-1.5 text-sm text-red-700">Cancel</button></form>
                )}
                {['cancelled', 'failed'].includes(post.status) && (
                  <form action={replacePost}><input type="hidden" name="id" value={post.id} />
                    <button className="rounded-lg border border-[#741f23] px-3 py-1.5 text-sm text-[#741f23]">Replace draft</button></form>
                )}
              </div>
            </div>
          </article>
        ))}
        {!error && !posts?.length && <p className="text-sm text-stone-600">No drafts yet. Prepare the next seven days above.</p>}
      </div>
    </div>
  );
}
