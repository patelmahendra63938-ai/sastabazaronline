import 'server-only';

import { unstable_rethrow } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface HomepageDisplaySettings {
  show_filter_panel: boolean;
  show_meesho_link: boolean;
  show_amazon_link: boolean;
  show_flipkart_link: boolean;
}

export const DEFAULT_HOMEPAGE_DISPLAY: HomepageDisplaySettings = {
  show_filter_panel: true,
  show_meesho_link: true,
  show_amazon_link: true,
  show_flipkart_link: true,
};

function booleanOrDefault(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

export function parseHomepageDisplay(value: unknown): HomepageDisplaySettings {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    show_filter_panel: booleanOrDefault(raw.show_filter_panel, true),
    show_meesho_link: booleanOrDefault(raw.show_meesho_link, true),
    show_amazon_link: booleanOrDefault(raw.show_amazon_link, true),
    show_flipkart_link: booleanOrDefault(raw.show_flipkart_link, true),
  };
}

export async function getHomepageDisplaySettings(): Promise<HomepageDisplaySettings> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'homepage_display')
      .maybeSingle();

    if (error) {
      console.error('[HOMEPAGE_DISPLAY_READ_ERROR]', error.message);
      return DEFAULT_HOMEPAGE_DISPLAY;
    }

    return data ? parseHomepageDisplay(data.value) : DEFAULT_HOMEPAGE_DISPLAY;
  } catch (error) {
    unstable_rethrow(error);
    console.error('[HOMEPAGE_DISPLAY_READ_ERROR]', error);
    return DEFAULT_HOMEPAGE_DISPLAY;
  }
}
