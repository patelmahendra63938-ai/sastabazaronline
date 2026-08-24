import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://www.sastabazaronline.in';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/refund-policy`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return staticRoutes;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: products, error } = await supabase
    .from('products')
    .select('id')
    .eq('is_active', true)
    .order('id', { ascending: true });

  if (error || !products) {
    console.error('Sitemap product fetch failed:', error?.message ?? 'Unknown error');
    return staticRoutes;
  }

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/product/${encodeURIComponent(String(product.id))}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
