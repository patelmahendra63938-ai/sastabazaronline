import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface StorefrontVisibilitySettings {
  filter_panel_enabled: boolean;
  marketplace_links_enabled: boolean;
}

export const DEFAULT_STOREFRONT_VISIBILITY: StorefrontVisibilitySettings = {
  filter_panel_enabled: true,
  marketplace_links_enabled: true,
};

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function parseStorefrontVisibility(
  value: unknown
): StorefrontVisibilitySettings {
  const raw =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    filter_panel_enabled: asBoolean(
      raw.filter_panel_enabled,
      DEFAULT_STOREFRONT_VISIBILITY.filter_panel_enabled
    ),
    marketplace_links_enabled: asBoolean(
      raw.marketplace_links_enabled,
      DEFAULT_STOREFRONT_VISIBILITY.marketplace_links_enabled
    ),
  };
}

export async function getStorefrontVisibilitySetting(): Promise<{
  value: StorefrontVisibilitySettings;
  version: number;
}> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('store_settings')
    .select('value, version')
    .eq('key', 'storefront_visibility')
    .maybeSingle();

  if (error) {
    console.error('[STOREFRONT_VISIBILITY_READ_ERROR]', error.message);
    return {
      value: DEFAULT_STOREFRONT_VISIBILITY,
      version: 0,
    };
  }

  return {
    value: data
      ? parseStorefrontVisibility(data.value)
      : DEFAULT_STOREFRONT_VISIBILITY,
    version: Number(data?.version || 0),
  };
}
