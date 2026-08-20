'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseShippingRules, ShippingActionState, ShippingRules, validateShippingRules } from '@/lib/settings/shipping-rules';

function formNumber(formData: FormData, key: string): number {
  return Number(String(formData.get(key) ?? '').trim());
}

export async function saveShippingRules(
  _previousState: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  const { user, role } = await getCurrentUser();
  if (!user || !role || !['admin', 'super_admin', 'staff'].includes(role)) {
    return { status: 'error', message: 'You are not authorized to update store settings.' };
  }

  const rules: ShippingRules = parseShippingRules({
    pricing_mode: 'temporary_slabs',
    free_shipping_enabled: formData.get('free_shipping_enabled') === 'on',
    free_shipping_threshold: formNumber(formData, 'free_shipping_threshold'),
    apply_courier_charge: formData.get('apply_courier_charge') === 'on',
    courier_markup_pct: formNumber(formData, 'courier_markup_pct'),
    weight_buffer_pct: formNumber(formData, 'weight_buffer_pct'),
    shipping_slab_500g: formNumber(formData, 'shipping_slab_500g'),
    shipping_slab_1000g: formNumber(formData, 'shipping_slab_1000g'),
    shipping_slab_2000g: formNumber(formData, 'shipping_slab_2000g'),
    temporary_max_weight_grams: formNumber(formData, 'temporary_max_weight_grams'),
    cod_fee_type: formData.get('cod_fee_type'),
    cod_fee_flat: formNumber(formData, 'cod_fee_flat'),
    cod_fee_threshold: formNumber(formData, 'cod_fee_threshold'),
    cod_fee_above_threshold: formNumber(formData, 'cod_fee_above_threshold'),
  });

  const validationErrors = validateShippingRules(rules);
  if (validationErrors.length > 0) {
    return { status: 'error', message: validationErrors.join(' ') };
  }

  const supabase = await createServerSupabaseClient();
  const { data: current, error: readError } = await supabase
    .from('store_settings')
    .select('value, version')
    .eq('key', 'shipping_rules')
    .maybeSingle();

  if (readError) {
    return { status: 'error', message: `Unable to read shipping settings: ${readError.message}` };
  }

  const currentValue = current?.value && typeof current.value === 'object' && !Array.isArray(current.value)
    ? current.value
    : {};

  const { data: updated, error: updateError } = await supabase
    .from('store_settings')
    .update({
      value: { ...currentValue, ...rules },
      version: Number(current?.version || 0) + 1,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('key', 'shipping_rules')
    .select('key')
    .maybeSingle();

  if (updateError || !updated) {
    return {
      status: 'error',
      message: `Shipping settings were not saved: ${updateError?.message || 'No authorized row was updated.'}`,
    };
  }

  revalidatePath('/admin/shipping');
  revalidatePath('/admin/settings');
  return { status: 'success', message: 'Authoritative temporary shipping settings saved.' };
}
