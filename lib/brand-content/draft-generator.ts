import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { contraDraft, istDate, linkedinCaption, scheduledUtc } from './planner';

export async function prepareBrandContentDrafts(days = 28) {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id,title,price,images,stock,category')
    .eq('is_active', true)
    .gt('stock', 0)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error('Catalog unavailable');

  const eligible = products?.filter((p) =>
    typeof p.images?.[0] === 'string' && Number.isFinite(Number(p.price))
  ) || [];

  const rows: Array<Record<string, unknown>> = [];

  for (let offset = 0; offset < days; offset++) {
    const date = istDate(offset);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();

    // Monday, Wednesday, Friday, Saturday = 4 LinkedIn drafts/week.
    if ([1, 3, 5, 6].includes(weekday) && eligible.length) {
      const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
      const product = eligible[dayNumber % eligible.length];
      const scheduledAt = scheduledUtc(date, 'linkedin');
      if (new Date(scheduledAt).getTime() > Date.now() + 15 * 60_000) {
        rows.push({
          platform: 'linkedin',
          content_type: 'product_post',
          publish_date: date,
          scheduled_at: scheduledAt,
          product_id: product.id,
          title: product.title,
          body: linkedinCaption({
            title: product.title,
            price: Number(product.price),
            id: product.id,
            category: product.category,
          }),
          image_url: product.images[0],
        });
      }
    }

    // Monday = 1 Contra case-study draft/week.
    if (weekday === 1) {
      const weekIndex = Math.floor(Date.parse(`${date}T00:00:00Z`) / (7 * 86_400_000));
      const draft = contraDraft(weekIndex);
      const scheduledAt = scheduledUtc(date, 'contra');
      if (new Date(scheduledAt).getTime() > Date.now() + 15 * 60_000) {
        rows.push({
          platform: 'contra',
          content_type: 'case_study',
          publish_date: date,
          scheduled_at: scheduledAt,
          product_id: null,
          title: draft.title,
          body: draft.body,
          image_url: null,
        });
      }
    }
  }

  if (!rows.length) return 0;

  const { error: insertError } = await supabaseAdmin
    .from('brand_content_posts')
    .upsert(rows, { onConflict: 'platform,publish_date', ignoreDuplicates: true });

  if (insertError) throw new Error('Brand content queue unavailable');
  return rows.length;
}
