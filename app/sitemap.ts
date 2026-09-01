import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getActiveStorefrontCategories } from '@/lib/catalog/storefront-categories';

const BASE_URL = 'https://www.adhyeybrothers.in';

// The catalog changes from the admin panel without a new Next.js build.
// Keep the sitemap request-time fresh so newly activated products are exposed
// to search-engine crawlers immediately instead of being held in a cached route.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/collections/dhoti-choli`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/gst-invoice`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy-policy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/shipping-policy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/return-policy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/refund-policy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/terms-and-conditions`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Sitemap: Supabase environment variables are missing');
    return staticRoutes;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: products, error }, activeCategories] = await Promise.all([
    supabase
      .from('products')
      .select('id')
      .eq('is_active', true)
      .order('id', { ascending: true }),
    getActiveStorefrontCategories(),
  ]);

  if (error || !products) {
    console.error('Sitemap product fetch failed:', error?.message ?? 'Unknown error');
    return staticRoutes;
  }

  const productRoutes: MetadataRoute.Sitemap = products.map(product => ({
    url: `${BASE_URL}/product/${encodeURIComponent(String(product.id))}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = activeCategories.map(category => ({
    url: `${BASE_URL}/category/${encodeURIComponent(category.name)}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
