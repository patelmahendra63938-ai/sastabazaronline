import { supabaseAdmin } from '@/lib/supabase/admin';
import { prepareBrandContentDrafts } from '@/lib/brand-content/draft-generator';
import { istDate } from '@/lib/brand-content/planner';
import { publishLinkedInPost } from '@/lib/brand-content/linkedin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await prepareBrandContentDrafts();
  } catch {
    return Response.json({ error: 'Draft generation unavailable' }, { status: 503 });
  }

  if (process.env.LINKEDIN_PUBLISH_ENABLED !== 'true') {
    return Response.json({ status: 'paused' });
  }

  const now = new Date();
  const { data: candidate, error } = await supabaseAdmin
    .from('brand_content_posts')
    .select('id,body,scheduled_at')
    .eq('platform', 'linkedin')
    .eq('publish_date', istDate())
    .eq('status', 'approved')
    .lte('scheduled_at', now.toISOString())
    .gte('scheduled_at', new Date(now.getTime() - 90 * 60_000).toISOString())
    .maybeSingle();

  if (error) return Response.json({ error: 'Queue unavailable' }, { status: 503 });
  if (!candidate) return Response.json({ status: 'nothing_due' });

  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('brand_content_posts')
    .update({ status: 'publishing', claimed_at: now.toISOString(), updated_at: now.toISOString() })
    .eq('id', candidate.id)
    .eq('status', 'approved')
    .select('id')
    .maybeSingle();

  if (claimError || !claimed) return Response.json({ status: 'already_claimed' });

  try {
    const remoteId = await publishLinkedInPost(candidate.body);
    const { error: recordError } = await supabaseAdmin
      .from('brand_content_posts')
      .update({
        status: 'published',
        remote_post_id: remoteId,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate.id)
      .eq('status', 'publishing');

    if (recordError) throw new Error('Published on LinkedIn but database update failed; check LinkedIn before retrying');
    return Response.json({ status: 'published', id: candidate.id });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'Unknown LinkedIn error';
    await supabaseAdmin
      .from('brand_content_posts')
      .update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() })
      .eq('id', candidate.id)
      .eq('status', 'publishing');
    return Response.json({ status: 'failed', id: candidate.id }, { status: 502 });
  }
}
