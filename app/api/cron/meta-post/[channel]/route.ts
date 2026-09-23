import { supabaseAdmin } from '@/lib/supabase/admin';
import { istDate, type SocialChannel } from '@/lib/meta/post-planner';
import { publishMetaProduct } from '@/lib/meta/publish';
import { prepareProductPostDrafts } from '@/lib/meta/draft-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  if (channel !== 'facebook' && channel !== 'instagram') return new Response('Not found', { status: 404 });
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    await prepareProductPostDrafts();
  } catch {
    return Response.json({ error: 'Draft generation unavailable' }, { status: 503 });
  }
  if (process.env.META_PUBLISH_ENABLED !== 'true') {
    return Response.json({ status: 'paused' });
  }

  const now = new Date();
  const { data: candidate, error } = await supabaseAdmin.from('meta_product_posts')
    .select('id,product_id,price_snapshot,image_url,caption,scheduled_at')
    .eq('channel', channel)
    .eq('publish_date', istDate())
    .eq('status', 'approved')
    .lte('scheduled_at', now.toISOString())
    .gte('scheduled_at', new Date(now.getTime() - 90 * 60_000).toISOString())
    .maybeSingle();
  if (error) return Response.json({ error: 'Queue unavailable' }, { status: 503 });
  if (!candidate) return Response.json({ status: 'nothing_due' });

  // The conditional update claims the row once, even if the cron trigger is delivered twice.
  const { data: claimed, error: claimError } = await supabaseAdmin.from('meta_product_posts')
    .update({ status: 'publishing', claimed_at: now.toISOString(), updated_at: now.toISOString() })
    .eq('id', candidate.id).eq('status', 'approved').select('id').maybeSingle();
  if (claimError || !claimed) return Response.json({ status: 'already_claimed' });

  let remoteId: string | null = null;
  let attemptedPublish = false;
  try {
    const { data: product } = await supabaseAdmin.from('products')
      .select('is_active,stock,price,images').eq('id', candidate.product_id).maybeSingle();
    if (!product?.is_active || Number(product.stock) <= 0 ||
        Number(product.price) !== Number(candidate.price_snapshot) ||
        product.images?.[0] !== candidate.image_url) {
      throw new Error('Product changed or is out of stock; needs a new approval');
    }
    attemptedPublish = true;
    remoteId = await publishMetaProduct({
      id: candidate.id, channel: channel as SocialChannel, caption: candidate.caption,
    });
    const { error: recordError } = await supabaseAdmin.from('meta_product_posts')
      .update({ status: 'published', remote_post_id: remoteId, published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', candidate.id).eq('status', 'publishing');
    if (recordError) throw new Error('Published on Meta but database update failed; check Meta before any retry');
    return Response.json({ status: 'published', id: candidate.id });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'Unknown publishing error';
    await supabaseAdmin.from('meta_product_posts').update({
      // Publishing may have succeeded even if its response was lost. Never auto-retry it.
      status: attemptedPublish ? 'publishing' : 'failed',
      error_message: message, updated_at: new Date().toISOString(),
    }).eq('id', candidate.id).eq('status', 'publishing');
    return Response.json({ status: 'failed', id: candidate.id }, { status: 502 });
  }
}
