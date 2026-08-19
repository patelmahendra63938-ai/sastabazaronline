import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  DEFAULT_SHIPPING_RULES,
  parseShippingRules,
  ShippingRules,
} from '@/lib/settings/shipping-rules';

export interface StoreSettingRow<T> {
  key: string;
  value: T;
  version: number;
  updated_at: string | null;
  updated_by: string | null;
}

export async function getShippingRulesSetting(): Promise<StoreSettingRow<ShippingRules>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('store_settings')
    .select('key, value, version, updated_at, updated_by')
    .eq('key', 'shipping_rules')
    .maybeSingle();

  if (error) {
    console.error('[STORE_SETTINGS_READ_ERROR]', error.message);
  }

  return {
    key: 'shipping_rules',
    value: data ? parseShippingRules(data.value) : DEFAULT_SHIPPING_RULES,
    version: Number(data?.version || 0),
    updated_at: data?.updated_at || null,
    updated_by: data?.updated_by || null,
  };
}

