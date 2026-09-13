import { createClient } from '@supabase/supabase-js';

import MeeshoReviewsPreview from '@/components/MeeshoReviewsPreview';
import ProductDetailPageClient, { type ProductDetailType } from './ProductPageClient';
import SharedPackProductPageClient from './SharedPackProductPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getInitialProduct(productId: string): Promise<(ProductDetailType & { selling_mode?: string | null }) | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Product page SSR: Supabase environment variables are missing');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    console.error('Product page SSR fetch failed:', { productId, message: error.message, code: error.code });
    return null;
  }

  return (data as (ProductDetailType & { selling_mode?: string | null }) | null) || null;
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initialProduct = await getInitialProduct(id);
  const isSharedPackProduct = initialProduct?.selling_mode === 'shared_pack';

  return (
    <>
      {isSharedPackProduct && initialProduct ? (
        <SharedPackProductPageClient productId={id} initialProduct={initialProduct as any} />
      ) : (
        <ProductDetailPageClient productId={id} initialProduct={initialProduct} />
      )}
      <MeeshoReviewsPreview productId={id} />
    </>
  );
}
