import { createClient } from '@supabase/supabase-js';

import { resolveStorefrontImageSrc } from '@/lib/storefront-image';

const SITE_URL = 'https://www.adhyeybrothers.in';
const BRAND = 'ADHYEY BROTHERS';

type ProductRow = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | string | null;
  is_active?: boolean | null;
  category?: string | null;
  images?: string[] | null;
};

type InventoryRow = {
  product_id: string;
  available_quantity?: number | null;
};

function xmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanText(value?: string | null): string {
  return (value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteImageUrl(product: ProductRow): string | null {
  const candidate = Array.isArray(product.images) ? product.images[0] : null;
  if (!candidate || typeof candidate !== 'string') return null;

  const resolved = resolveStorefrontImageSrc(candidate);
  if (!resolved || resolved.includes('product-placeholder')) return null;
  if (/^https?:\/\//i.test(resolved)) return resolved;

  return `${SITE_URL}${resolved.startsWith('/') ? resolved : `/${resolved}`}`;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return new Response('Merchant feed unavailable: Supabase configuration missing.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: products, error: productsError }, { data: inventory, error: inventoryError }] =
    await Promise.all([
      supabase
        .from('products')
        .select('id,title,description,price,is_active,category,images')
        .eq('is_active', true)
        .order('title', { ascending: true }),
      supabase.from('inventory').select('product_id,available_quantity'),
    ]);

  if (productsError) {
    console.error('Google Merchant feed product fetch failed:', productsError.message);
    return new Response('Merchant feed unavailable.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (inventoryError) {
    console.warn('Google Merchant feed inventory fetch failed:', inventoryError.message);
  }

  const stockByProduct = new Map<string, number>();
  for (const row of (inventory || []) as InventoryRow[]) {
    stockByProduct.set(
      row.product_id,
      (stockByProduct.get(row.product_id) || 0) + Math.max(0, Number(row.available_quantity || 0))
    );
  }

  const items = ((products || []) as ProductRow[])
    .map((product) => {
      const price = Number(product.price || 0);
      const image = absoluteImageUrl(product);
      if (!product.id || !product.title?.trim() || price <= 0 || !image) return null;

      const description =
        cleanText(product.description) ||
        `Shop ${product.title.trim()} online at ${BRAND} with Pan India delivery.`;
      const link = `${SITE_URL}/product/${encodeURIComponent(product.id)}`;
      const availability =
        inventoryError || !stockByProduct.has(product.id)
          ? 'in_stock'
          : (stockByProduct.get(product.id) || 0) > 0
            ? 'in_stock'
            : 'out_of_stock';

      return `    <item>
      <g:id>${xmlEscape(product.id)}</g:id>
      <g:title>${xmlEscape(product.title.trim())}</g:title>
      <g:description>${xmlEscape(description)}</g:description>
      <g:link>${xmlEscape(link)}</g:link>
      <g:image_link>${xmlEscape(image)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} INR</g:price>
      <g:condition>new</g:condition>
      <g:brand>${xmlEscape(BRAND)}</g:brand>
      <g:identifier_exists>false</g:identifier_exists>${
        product.category?.trim()
          ? `\n      <g:product_type>${xmlEscape(product.category.trim())}</g:product_type>`
          : ''
      }
    </item>`;
    })
    .filter(Boolean)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(BRAND)} Product Feed</title>
    <link>${SITE_URL}</link>
    <description>Automatic Google Merchant Center product feed for ${xmlEscape(BRAND)}</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
