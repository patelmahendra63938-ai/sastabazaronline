'use server';

import { createClient } from '@supabase/supabase-js';

export interface PublicProductVariant {
  id: string;
  size: string;
  sku: string;
  weight_kg: number;
  available_quantity: number;
}

export async function getPublicProductVariantsAction(productId: string): Promise<{
  success: boolean;
  variants: PublicProductVariant[];
  error?: string;
}> {
  const cleanProductId = String(productId || '').trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanProductId)) {
    return { success: false, variants: [], error: 'Invalid product.' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[PRODUCT_VARIANTS_CONFIG_ERROR] Supabase server configuration is missing.');
    return { success: false, variants: [], error: 'Product options are temporarily unavailable.' };
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: product, error: productError } = await db
    .from('products')
    .select('id,is_active')
    .eq('id', cleanProductId)
    .eq('is_active', true)
    .maybeSingle();

  if (productError) {
    console.error('[PRODUCT_VARIANTS_PRODUCT_ERROR]', productError);
    return { success: false, variants: [], error: 'Product options are temporarily unavailable.' };
  }

  if (!product) {
    return { success: false, variants: [], error: 'Product is unavailable.' };
  }

  const { data, error } = await db
    .from('inventory')
    .select('id,size,sku,weight_kg,available_quantity')
    .eq('product_id', cleanProductId);

  if (error) {
    console.error('[PRODUCT_VARIANTS_INVENTORY_ERROR]', error);
    return { success: false, variants: [], error: 'Product options are temporarily unavailable.' };
  }

  const variants = (data || []).map((row) => ({
    id: String(row.id),
    size: String(row.size || 'Standard'),
    sku: String(row.sku || ''),
    weight_kg: Number(row.weight_kg || 0.5),
    available_quantity: Math.max(0, Number(row.available_quantity || 0)),
  }));

  return { success: true, variants };
}
