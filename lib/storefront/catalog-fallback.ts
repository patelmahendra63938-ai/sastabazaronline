import 'server-only';

import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

export interface StorefrontFallbackProduct {
  id: string;
  title: string;
  description?: string | null;
  price: number | string | null;
  mrp?: number | string | null;
  category?: string | null;
  images?: string[] | null;
  video?: string | null;
  is_active?: boolean | null;
  stock?: number | null;
  inventory?: Array<{
    size?: string | null;
    available_quantity?: number | null;
  }> | null;
}

const getCachedStorefrontFallbackProducts = unstable_cache(
  async (): Promise<StorefrontFallbackProduct[]> => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Storefront fallback cache: Supabase environment variables missing');
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from('products')
      .select(
        'id, title, description, price, mrp, category, images, video, is_active, stock, inventory(size, available_quantity)'
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Storefront fallback cache refresh failed: ${error.message}`);
    }

    return (data || []) as StorefrontFallbackProduct[];
  },
  ['storefront-fallback-products-v2'],
  {
    revalidate: 300,
    tags: ['storefront-products'],
  }
);

export async function getStorefrontFallbackProducts(): Promise<StorefrontFallbackProduct[]> {
  try {
    return await getCachedStorefrontFallbackProducts();
  } catch (error) {
    console.error('[STOREFRONT_FALLBACK_CACHE_ERROR]', error);
    return [];
  }
}

export async function getStorefrontFallbackProduct(id: string) {
  if (!id) return null;
  const products = await getStorefrontFallbackProducts();
  return products.find(product => product.id === id) || null;
}
