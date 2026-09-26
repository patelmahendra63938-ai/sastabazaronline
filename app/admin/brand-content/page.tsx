import Link from 'next/link';
import { requireAdminUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { linkedinConfigured } from '@/lib/brand-content/linkedin';
import {
  approveBrandPost,
  cancelBrandPost,
  generateBrandContent,
  markContraPublished,
  postLinkedInNow,
  saveBrandPost,
} from './actions';

export const dynamic = 'force-dynamic';

const notices: Record<string, string> = {
  generated: 'LinkedIn and Contra drafts are prepared.',
  'nothing-generated': 'No new future slots were available.',
  saved: 'Draft saved.',
  approved: 'Draft approved.',
  cancelled: 'Draft cancelled.',
  expired: 'This scheduled slot has already passed.',
  published: 'LinkedIn post published.',
  'publish-failed': 'LinkedIn publish failed. Check credentials/permissions and the row error.',
  'publish-uncertain': 'LinkedIn may have published, but the database update was not confirmed. Check LinkedIn before retrying.',
  marked: 'Contra item marked as published.',
};

export default async function BrandContentPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  await requireAdminUser();
  const { result } = await searchParams;

  const { data: posts, error } = await supabaseAdmin
    .from('brand_content_posts')
    .select('id,platform,content_type,publish_date,scheduled_at,title,body,image_url,status,remote_post_id,error_message')
    .order('scheduled_at', { ascending: false })
    .limit(80);

  const linkedinReady = linkedinConfigured();
  const linkedinEnabled = process.env.LINKEDIN_PUBLISH_ENABLED === 'true';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl border border-[#ead8b8] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#741f23]">LinkedIn + Contra automation</h1>
            <p className="mt-2 text-sm text-stone-600">
              LinkedIn: 4 drafts/week at 10:30 AM IST. Contra: 1 case-study draft/week.
              Every item stays reviewable before publication.
            </p>
          </div>
          <Link href="/admin/social-planner" className="text-sm font-semibold text-[#741f23] underline">
            Facebook + Instagram planner
          </Link>
        </div>

        <p className="mt-3 text-sm font-semibold text-[#741f23]">
          LinkedIn publishing: {linkedinReady && linkedinEnabled
            ? 'enabled'
            : linkedinReady
              ? 'credentials present; publishing paused'
              : 'waiting for LinkedIn organization credentials'}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Contra drafts are prepared here for review/copying. Publishing remains manual until a supported Contra publishing API is available.
        </p>

        <form action={generateBrandContent} className="mt-4">
          <button className="rounded-lg bg-[#741f23] px-4 py-2 text-sm font-semibold text-white">
            Prepare next 4 weeks
          </button>
        </form>

        {result && <p role="status" className="mt-3 text-sm text-stone-700">{notices[result] || 'Request completed.'}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">Brand-content database is not ready yet.</p>}
      </section>

      <div className="space-y-4">
        {posts?.map((post) => (
          <article key={post.id} className="rounded-2xl border border-[#ead8b8] bg-white p-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded bg-[#f4e6d2] px-2 py-1 font-bold capitalize">{post.platform}</span>
              <span>{post.publish_date}</span>
              <span className="rounded bg-stone-100 px-2 py-1 font-semibold capitalize">{post.status}</span>
              <span className="text-stone-500">{post.content_type.replaceAll('_', ' ')}</span>
            </div>

            {post.status === 'pending' ? (
              <form action={saveBrandPost} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={post.id} />
                <input name="title" defaultValue={post.title} required maxLength={180}
                  className="w-full rounded-lg border border-stone-300 p-2 font-semibold" />
                <textarea name="body" defaultValue={post.body} required maxLength={5000} rows={10}
                  className="w-full rounded-lg border border-stone-300 p-3 text-sm" />
                <button className="rounded-lg border border-[#741f23] px-3 py-1.5 text-sm text-[#741f23]">
                  Save changes
                </button>
              </form>
            ) : (
              <div className="mt-4">
                <h2 className="font-semibold text-[#741f23]">{post.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{post.body}</p>
              </div>
            )}

            {post.image_url && (
              <a href={post.image_url} target="_blank" rel="noreferrer"
                className="mt-3 inline-block text-xs font-semibold text-[#741f23] underline">
                Open source product image
              </a>
            )}

            {post.error_message && <p className="mt-2 text-xs text-red-700">{post.error_message}</p>}
            {post.remote_post_id && <p className="mt-2 text-xs text-stone-500">LinkedIn post ID: {post.remote_post_id}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              {post.status === 'pending' && (
                <form action={approveBrandPost}>
                  <input type="hidden" name="id" value={post.id} />
                  <button className="rounded-lg bg-green-700 px-3 py-1.5 text-sm text-white">Approve</button>
                </form>
              )}

              {post.platform === 'linkedin' && ['pending', 'approved', 'failed'].includes(post.status) && (
                <form action={postLinkedInNow}>
                  <input type="hidden" name="id" value={post.id} />
                  <button className="rounded-lg bg-[#741f23] px-3 py-1.5 text-sm font-semibold text-white">Post Now</button>
                </form>
              )}

              {post.platform === 'contra' && ['pending', 'approved'].includes(post.status) && (
                <form action={markContraPublished}>
                  <input type="hidden" name="id" value={post.id} />
                  <button className="rounded-lg bg-[#741f23] px-3 py-1.5 text-sm font-semibold text-white">
                    Mark published
                  </button>
                </form>
              )}

              {['pending', 'approved', 'failed'].includes(post.status) && (
                <form action={cancelBrandPost}>
                  <input type="hidden" name="id" value={post.id} />
                  <button className="rounded-lg border border-red-600 px-3 py-1.5 text-sm text-red-700">Cancel</button>
                </form>
              )}
            </div>
          </article>
        ))}

        {!error && !posts?.length && (
          <p className="text-sm text-stone-600">No LinkedIn or Contra drafts yet.</p>
        )}
      </div>
    </div>
  );
}
