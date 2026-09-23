import { supabaseAdmin } from '@/lib/supabase/admin';
import { publishMetaProduct } from '@/lib/meta/publish';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POST_ID = 'a2cdd8de-ff1c-4ba5-aebb-ee71ea50e9b2';

export async function GET() {
  const { data: post, error } = await supabaseAdmin.from('meta_product_posts')
    .select('id,channel,slot,publish_date,product_id,price_snapshot,image_url,caption,status,error_message,remote_post_id')
    .eq('id', POST_ID).maybeSingle();

  if (error || !post) return Response.json({ status: 'missing' }, { status: 404 });
  if (post.status === 'published' || post.remote_post_id) {
    return Response.json({ status: 'already_published', remote_post_id: post.remote_post_id });
  }
  if (post.channel !== 'instagram' || post.slot !== 1 || post.publish_date !== '2026-09-23') {
    return Response.json({ status: 'wrong_post' }, { status: 409 });
  }
  if (post.status !== 'publishing' || post.error_message !== 'Only photo or video can be accepted as media type.') {
    return Response.json({ status: 'not_retryable', current_status: post.status }, { status: 409 });
  }

  const { data: product } = await supabaseAdmin.from('products')
    .select('is_active,stock,price,images').eq('id', post.product_id).maybeSingle();
  if (!product?.is_active || Number(product.stock) <= 0 ||
      Number(product.price) !== Number(post.price_snapshot) ||
      product.images?.[0] !== post.image_url) {
    return Response.json({ status: 'product_changed' }, { status: 409 });
  }

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
    .eq('id', post.id)
    .eq('status', 'publishing');

  if (updateError) {
    return Response.json({ status: 'published_but_record_failed', remote_post_id: remoteId }, { status: 500 });
  }

  return Response.json({ status: 'published', remote_post_id: remoteId });
}
