'use server';

import { createClient } from '@supabase/supabase-js';
import { requireAdminUser } from '@/lib/auth';

function toBaseSlug(value: string) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  return slug || 'campaign';
}

export async function createCampaignAction(formDataObject: any) {
  // Enforce server-side authorization before using the privileged Supabase client.
  await requireAdminUser();

  // Use service role key on the server to securely bypass RLS restrictions for store admins.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false } }
  );

  const baseSlug = toBaseSlug(formDataObject.name);

  const campaignBase = {
    name: formDataObject.name,
    description: formDataObject.description,
    discount_type: formDataObject.discount_type,
    discount_value: parseFloat(formDataObject.discount_value),
    campaign_mode: formDataObject.campaign_mode,
    coupon_code: formDataObject.campaign_mode !== 'AUTOMATIC'
      ? String(formDataObject.coupon_code || '').trim().toUpperCase()
      : null,
    target_category: formDataObject.target_category === 'ALL' ? null : formDataObject.target_category,
    start_at: new Date(formDataObject.start_at).toISOString(),
    end_at: new Date(formDataObject.end_at).toISOString(),
    theme: formDataObject.theme,
    is_homepage_visible: formDataObject.is_homepage_visible,
    is_enabled: true,
  };

  // Slug is unique in the database. Reusing a campaign name must not fail,
  // so try the readable base slug first and add a numeric suffix on collision.
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const slug = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
    const newCampaign = { ...campaignBase, slug };

    const { data, error } = await supabaseAdmin
      .from('promotions')
      .insert([newCampaign])
      .select();

    if (!error) {
      return { success: true, data, slug };
    }

    const isSlugCollision =
      error.code === '23505' &&
      (error.message.includes('promotions_slug_key') || error.details?.includes('slug'));

    if (!isSlugCollision) {
      return { success: false, error: error.message };
    }
  }

  return {
    success: false,
    error: 'Could not generate a unique campaign URL. Please use a more specific campaign name.',
  };
}
