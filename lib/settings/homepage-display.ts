import 'server-only';

import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

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

const getCachedHomepageDisplaySettings = unstable_cache(
  async (): Promise<HomepageDisplaySettings> => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Homepage display settings: Supabase environment variables missing');
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'homepage_display')
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? parseHomepageDisplay(data.value) : DEFAULT_HOMEPAGE_DISPLAY;
  },
  ['homepage-display-settings-v1'],
  {
    revalidate: 300,
    tags: ['homepage-display-settings'],
  }
);

export async function getHomepageDisplaySettings(): Promise<HomepageDisplaySettings> {
  try {
    return await getCachedHomepageDisplaySettings();
  } catch (error) {
    console.error('[HOMEPAGE_DISPLAY_READ_ERROR]', error);
    return DEFAULT_HOMEPAGE_DISPLAY;
  }
}
