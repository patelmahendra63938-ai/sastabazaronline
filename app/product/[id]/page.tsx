import { createClient } from '@supabase/supabase-js';

import ProductDetailPageClient, { type ProductDetailType } from './ProductPageClient';

// Product records can be changed from the admin panel without a new build.
// Render each request with current catalog data so crawlers receive the real
// product content in the initial HTML instead of a loading-only shell.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getInitialProduct(productId: string): Promise<ProductDetailType | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Product page SSR: Supabase environment variables are missing');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    console.error('Product page SSR fetch failed:', {
      productId,
      message: error.message,
      code: error.code,
    });
    return null;
  }

  return (data as ProductDetailType | null) || null;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialProduct = await getInitialProduct(id);

  return (
    <ProductDetailPageClient
      productId={id}
      initialProduct={initialProduct}
    />
  );
}
