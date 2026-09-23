import { supabaseAdmin } from '@/lib/supabase/admin';
import { publishMetaProduct } from '@/lib/meta/publish';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POST_ID = '302b6867-250c-449c-9db9-c1eb80b26f48';

export async function GET() {
  const { data: post, error } = await supabaseAdmin.from('meta_product_posts')
    .select('id,channel,slot,publish_date,product_id,price_snapshot,image_url,caption,status,remote_post_id')
    .eq('id', POST_ID).maybeSingle();

  if (error || !post) return Response.json({ status: 'missing' }, { status: 404 });
  if (post.status === 'published' || post.remote_post_id) {
    return Response.json({ status: 'already_published', remote_post_id: post.remote_post_id });
  }
  if (post.channel !== 'instagram' || post.slot !== 2 || post.publish_date !== '2026-09-23' || post.status !== 'approved') {
    return Response.json({ status: 'not_publishable', current_status: post.status }, { status: 409 });
  }

  const { data: product } = await supabaseAdmin.from('products')
    .select('is_active,stock,price,images').eq('id', post.product_id).maybeSingle();
  if (!product?.is_active || Number(product.stock) <= 0 ||
      Number(product.price) !== Number(post.price_snapshot) ||
      product.images?.[0] !== post.image_url) {
    return Response.json({ status: 'product_changed' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: claimed } = await supabaseAdmin.from('meta_product_posts')
    .update({ status: 'publishing', claimed_at: now, updated_at: now })
    .eq('id', post.id).eq('status', 'approved').select('id').maybeSingle();
  if (!claimed) return Response.json({ status: 'already_claimed' }, { status: 409 });

  try {
    const remoteId = await publishMetaProduct({
      id: post.id,
      channel: 'instagram',
      caption: post.caption,
    });

    const { error: updateError } = await supabaseAdmin.from('meta_product_posts')
      .update({
        status: 'published',
        remote_post_id: remoteId,
        error_message: null,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id).eq('status', 'publishing');

    if (updateError) {
      return Response.json({ status: 'published_but_record_failed', remote_post_id: remoteId }, { status: 500 });
    }
    return Response.json({ status: 'published', remote_post_id: remoteId });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'Unknown publishing error';
    await supabaseAdmin.from('meta_product_posts')
      .update({ status: 'publishing', error_message: message, updated_at: new Date().toISOString() })
      .eq('id', post.id).eq('status', 'publishing');
    return Response.json({ status: 'failed', error: message }, { status: 502 });
  }
}
