'use server';

import { getAdminSession } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type CampaignInput = {
  name?: unknown;
  description?: unknown;
  discount_type?: unknown;
  discount_value?: unknown;
  campaign_mode?: unknown;
  coupon_code?: unknown;
  target_category?: unknown;
  start_at?: unknown;
  end_at?: unknown;
  theme?: unknown;
  is_homepage_visible?: unknown;
};

const text = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

export async function createCampaignAction(formDataObject: CampaignInput) {
  const admin = await getAdminSession();
  if (!admin.user || !admin.authorized) {
    return { success: false, error: 'Admin access required.' };
  }

  const name = text(formDataObject?.name);
  const description = text(formDataObject?.description);
  const discountType = text(formDataObject?.discount_type).toUpperCase();
  const discountValue = Number(formDataObject?.discount_value);
  const campaignMode = text(formDataObject?.campaign_mode).toUpperCase();
  const couponCode = text(formDataObject?.coupon_code).toUpperCase();
  const targetCategory = text(formDataObject?.target_category);
  const theme = text(formDataObject?.theme);
  const startAt = new Date(text(formDataObject?.start_at));
  const endAt = new Date(text(formDataObject?.end_at));

  if (!name || name.length > 120) {
    return { success: false, error: 'A valid campaign name is required.' };
  }
  if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
    return { success: false, error: 'Invalid discount type.' };
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { success: false, error: 'A valid discount value is required.' };
  }
  if (discountType === 'PERCENTAGE' && discountValue > 100) {
    return { success: false, error: 'Percentage discount cannot exceed 100.' };
  }
  if (!['AUTOMATIC', 'COUPON', 'BOTH'].includes(campaignMode)) {
    return { success: false, error: 'Invalid campaign mode.' };
  }
  if (campaignMode !== 'AUTOMATIC' && !/^[A-Z0-9_-]{3,30}$/.test(couponCode)) {
    return { success: false, error: 'A valid coupon code is required.' };
  }
  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    endAt <= startAt
  ) {
    return { success: false, error: 'A valid campaign date range is required.' };
  }

  const slugBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const newCampaign = {
    name,
    slug,
    description: description || null,
    discount_type: discountType,
    discount_value: discountValue,
    campaign_mode: campaignMode,
    coupon_code: campaignMode === 'AUTOMATIC' ? null : couponCode,
    target_category:
      !targetCategory || targetCategory === 'ALL' ? null : targetCategory,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    theme: theme || 'Festive',
    is_homepage_visible: Boolean(formDataObject?.is_homepage_visible),
    is_enabled: true,
  };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('promotions')
    .insert(newCampaign)
    .select('id, name, slug')
    .single();

  if (error) {
    console.error('Admin campaign creation failed.', { code: error.code });
    return { success: false, error: 'Campaign creation failed.' };
  }

  return { success: true, data };
}
