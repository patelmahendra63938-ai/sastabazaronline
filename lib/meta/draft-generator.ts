import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { istDate, productCaption, scheduledUtc, type SocialChannel, type SocialSlot } from './post-planner';

export async function prepareProductPostDrafts() {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id,title,price,images,stock,category')
    .eq('is_active', true).gt('stock', 0)
    .order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error('Catalog unavailable');
  const eligible = products?.filter((p) =>
    typeof p.images?.[0] === 'string' && Number.isFinite(Number(p.price))
  ) || [];
  if (!eligible.length) return 0;

  const rows = [];
  for (let day = 0; day < 7; day++) {
    const date = istDate(day);
    for (const [channelIndex, channel] of (['facebook', 'instagram'] as SocialChannel[]).entries()) {
      for (const slot of [1, 2] as SocialSlot[]) {
        const scheduled_at = scheduledUtc(date, channel, slot);
        if (new Date(scheduled_at).getTime() < Date.now() + 15 * 60_000) continue;
        const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
        const product = eligible[(dayNumber * 4 + channelIndex * 2 + slot - 1) % eligible.length];
        rows.push({
          channel, slot, publish_date: date, scheduled_at,
          product_id: product.id, product_title: product.title,
          price_snapshot: Number(product.price), image_url: product.images[0],
          caption: productCaption(product.title, Number(product.price), product.id, channel, product.category),
        });
      }
    }
  }
  if (!rows.length) return 0;
  const { error: insertError } = await supabaseAdmin.from('meta_product_posts')
    .upsert(rows, { onConflict: 'channel,publish_date,slot', ignoreDuplicates: true });
  if (insertError) throw new Error('Draft queue unavailable');
  return rows.length;
}
