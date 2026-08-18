'use server';

import { createClient } from '@supabase/supabase-js';

export async function createCampaignAction(formDataObject: any) {
  // Use service role key on the server to securely bypass RLS restrictions for store admins
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false } }
  );

  const slug = formDataObject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const newCampaign = {
    name: formDataObject.name,
    slug: slug,
    description: formDataObject.description,
    discount_type: formDataObject.discount_type,
    discount_value: parseFloat(formDataObject.discount_value),
    campaign_mode: formDataObject.campaign_mode,
    coupon_code: formDataObject.campaign_mode !== 'AUTOMATIC' ? formDataObject.coupon_code.toUpperCase() : null,
    target_category: formDataObject.target_category === 'ALL' ? null : formDataObject.target_category,
    start_at: new Date(formDataObject.start_at).toISOString(),
    end_at: new Date(formDataObject.end_at).toISOString(),
    theme: formDataObject.theme,
    is_homepage_visible: formDataObject.is_homepage_visible,
    is_enabled: true,
  };

  const { data, error } = await supabaseAdmin.from('promotions').insert([newCampaign]).select();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
}