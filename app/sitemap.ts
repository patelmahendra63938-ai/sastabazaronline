import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getActiveStorefrontCategories } from '@/lib/catalog/storefront-categories';
import { getStorefrontFallbackProducts } from '@/lib/storefront/catalog-fallback';

const BASE_URL = 'https://www.adhyeybrothers.in';

// Keep the sitemap request-time fresh for newly activated products, while also
// maintaining a short-lived cached catalog snapshot so a transient Supabase
// outage does not make product URLs disappear from the sitemap.
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

  const [productResult, activeCategories, fallbackProducts] = await Promise.all([
    supabase
      .from('products')
      .select('id')
      .eq('is_active', true)
      .order('id', { ascending: true }),
    getActiveStorefrontCategories(),
    getStorefrontFallbackProducts(),
  ]);

  let products = productResult.data || [];

  if (productResult.error || products.length === 0) {
    console.error(
      'Sitemap product fetch failed; using cached fallback when available:',
      productResult.error?.message ?? 'No products returned'
    );

    if (fallbackProducts.length > 0) {
      products = fallbackProducts.map((product) => ({ id: product.id }));
    }
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
