'use server';

import { getCurrentUser, type UserRole } from '@/lib/auth';
import {
  normalizeProductPackage,
  ProductPackageValidationError,
  type ProductPackageInput,
} from '@/lib/catalog/product-package';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeMarketplaceUrl } from '@/lib/utils';

const ADMIN_ROLES: UserRole[] = ['staff', 'admin', 'super_admin'];

interface ProductInput extends ProductPackageInput {
  title: string;
  description: string;
  category: string;
  brand: string | null;
  price: number;
  mrp: number;
  stock: number;
  hsn_code: string;
  gst_rate: number;
  images: string[];
  is_active: boolean;
  video?: string | null;
  amazon_url?: string | null;
  flipkart_url?: string | null;
  meesho_url?: string | null;
  other_marketplace_url?: string | null;
  other_marketplace_name?: string | null;
}

interface VariantInput {
  size: string;
  sku: string;
  weight_kg: number;
  stock: number;
}

export interface CreateAdminProductInput {
  product: ProductInput;
  variants: VariantInput[];
}

export type CreateAdminProductResult =
  | { success: true; productId: string }
  | { success: false; error: string };

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanOptionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function createAdminProduct(
  input: CreateAdminProductInput
): Promise<CreateAdminProductResult> {
  const { user, role } = await getCurrentUser();
  const roleLookupSuccess = Boolean(role && ADMIN_ROLES.includes(role));

  // Safe session diagnostics: never log identifiers, email, tokens, or user data.
  console.info('[admin-add-product-auth]', {
    loggedIn: Boolean(user),
    userIdPresent: Boolean(user?.id),
    roleLookupSuccess,
  });

  if (!user || !roleLookupSuccess) {
    return {
      success: false,
      error: 'Your admin session is missing or expired. Please sign in again.',
    };
  }

  if (!input || typeof input !== 'object' || !input.product) {
    return { success: false, error: 'Invalid product submission.' };
  }

  const product = input.product;
  const title = typeof product.title === 'string' ? product.title.trim() : '';
  const price = Number(product.price);
  const mrp = Number(product.mrp);
  const stock = Number(product.stock);
  const gstRate = Number(product.gst_rate);

  if (!title) return { success: false, error: 'Product title is required.' };
  if (!Number.isFinite(price) || price <= 0) {
    return { success: false, error: 'Valid selling price is required.' };
  }
  if (!Number.isFinite(mrp) || mrp < price) {
    return { success: false, error: 'MRP must be at least the selling price.' };
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { success: false, error: 'Product stock must be a whole number.' };
  }
  if (!Number.isFinite(gstRate) || gstRate < 0) {
    return { success: false, error: 'GST rate is invalid.' };
  }
  if (
    !Array.isArray(product.images) ||
    product.images.length === 0 ||
    product.images.length > 5 ||
    !product.images.every(isHttpsUrl)
  ) {
    return { success: false, error: 'At least one valid uploaded product image is required.' };
  }

  let packageData;
  try {
    packageData = normalizeProductPackage(product);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ProductPackageValidationError
          ? error.message
          : 'Valid physical weight and package dimensions are required.',
    };
  }

  if (!Array.isArray(input.variants) || input.variants.length === 0) {
    return { success: false, error: 'At least one size variant is required.' };
  }

  const variants = input.variants.map((variant) => ({
    size: typeof variant.size === 'string' ? variant.size.trim() : '',
    sku: typeof variant.sku === 'string' ? variant.sku.trim() : '',
    weight_kg: Number(variant.weight_kg),
    stock: Number(variant.stock),
  }));

  if (
    variants.some(
      (variant) =>
        !variant.size ||
        !Number.isFinite(variant.weight_kg) ||
        variant.weight_kg < 0 ||
        !Number.isInteger(variant.stock) ||
        variant.stock < 0
    )
  ) {
    return { success: false, error: 'Each variant needs a size and valid stock details.' };
  }

  const supabase = await createServerSupabaseClient();
  const productPayload = {
    title,
    description: typeof product.description === 'string' ? product.description.trim() : '',
    category: typeof product.category === 'string' ? product.category.trim() : '',
    brand: cleanOptionalText(product.brand),
    price,
    mrp,
    stock,
    hsn_code: typeof product.hsn_code === 'string' ? product.hsn_code.trim() : '',
    gst_rate: gstRate,
    net_weight_grams: packageData.weight,
    package_length_cm: packageData.length,
    package_width_cm: packageData.width,
    package_height_cm: packageData.height,
    images: product.images,
    is_active: Boolean(product.is_active),
    video: isHttpsUrl(product.video) ? product.video : null,
    amazon_url: sanitizeMarketplaceUrl(product.amazon_url),
    flipkart_url: sanitizeMarketplaceUrl(product.flipkart_url),
    meesho_url: sanitizeMarketplaceUrl(product.meesho_url),
    other_marketplace_url: sanitizeMarketplaceUrl(product.other_marketplace_url),
    other_marketplace_name: product.other_marketplace_url
      ? cleanOptionalText(product.other_marketplace_name) || 'Marketplace'
      : null,
  };

  const { data: productData, error: productError } = await supabase
    .from('products')
    .insert(productPayload)
    .select('id')
    .single();

  if (productError || !productData) {
    console.error('[admin-add-product-insert]', { code: productError?.code ?? 'unknown' });
    return { success: false, error: 'Product creation failed. Please retry.' };
  }

  const inventoryRows = variants.map((variant, index) => ({
    product_id: productData.id,
    size: variant.size,
    sku:
      variant.sku ||
      `${title.slice(0, 3).toUpperCase()}-${variant.size}-${Date.now().toString(36)}-${index + 1}`,
    weight_kg: variant.weight_kg,
    available_quantity: variant.stock,
    reserved_quantity: 0,
    sold_quantity: 0,
    reorder_level: 5,
  }));

  const { error: inventoryError } = await supabase
    .from('inventory')
    .upsert(inventoryRows, { onConflict: 'product_id,size' });

  if (inventoryError) {
    console.error('[admin-add-product-inventory]', { code: inventoryError.code });
    const { error: cleanupError } = await supabase
      .from('products')
      .delete()
      .eq('id', productData.id);

    if (cleanupError) {
      console.error('[admin-add-product-cleanup]', { code: cleanupError.code });
      return {
        success: false,
        error: 'The product was created but its variants failed. Please contact an administrator.',
      };
    }

    return { success: false, error: 'Product variants could not be saved. No product was published.' };
  }

  return { success: true, productId: productData.id };
}
