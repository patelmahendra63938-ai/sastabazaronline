import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';

import { resolveStorefrontImageSrc } from '@/lib/storefront-image';
import { classifyStorefrontCategory } from '@/lib/catalog/storefront-categories';

const SITE_URL = 'https://www.adhyeybrothers.in';

interface ProductSeoRecord {
  id: string;
  title: string;
  description?: string | null;
  price?: number | string | null;
  is_active?: boolean | null;
  category?: string | null;
  images?: string[] | null;
  brand?: string | null;
  style_code?: string | null;
}

interface InventoryRow {
  available_quantity?: number | null;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const getProduct = cache(async (id: string): Promise<ProductSeoRecord | null> => {
  if (!id) return null;

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Product SEO: Supabase environment variables missing');
    return null;
  }

  const { data, error } = await supabase
    .from('products')
    .select('id,title,description,price,is_active,category,images,brand,style_code')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Product SEO fetch failed:', {
      message: error.message,
      code: error.code,
      productId: id,
    });
    return null;
  }

  return (data as ProductSeoRecord | null) || null;
});

function getProductImage(product?: ProductSeoRecord | null): string | undefined {
  const candidate =
    Array.isArray(product?.images) && product.images.length > 0
      ? product.images[0]
      : undefined;

  if (!candidate || typeof candidate !== 'string') return undefined;

  const resolved = resolveStorefrontImageSrc(candidate);
  if (!resolved || resolved.includes('product-placeholder')) return undefined;
  if (/^https?:\/\//i.test(resolved)) return resolved;

  return `${SITE_URL}${resolved.startsWith('/') ? resolved : `/${resolved}`}`;
}

async function getProductAvailability(productId: string): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) return 'https://schema.org/InStock';

  const { data, error } = await supabase
    .from('inventory')
    .select('available_quantity')
    .eq('product_id', productId);

  if (error) {
    console.error('Product inventory SEO fetch failed:', {
      message: error.message,
      productId,
    });
    return 'https://schema.org/InStock';
  }

  const rows = (data ?? []) as InventoryRow[];
  if (rows.length === 0) return 'https://schema.org/InStock';

  const totalAvailable = rows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.available_quantity ?? 0)),
    0
  );

  return totalAvailable > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}

function cleanDescription(value?: string | null): string {
  const text = (value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text || 'Shop this product online at ADHYEY BROTHERS with Pan India delivery.';
}

function seoDescription(value?: string | null, maxLength = 155): string {
  const text = cleanDescription(value);
  if (text.length <= maxLength) return text;

  const withinLimit = text.slice(0, maxLength + 1);
  const lastSpace = withinLimit.lastIndexOf(' ');
  const cutAt = lastSpace >= 80 ? lastSpace : maxLength;

  return `${withinLimit
    .slice(0, cutAt)
    .replace(/[,:;\s]+$/, '')
    .trim()}…`;
}

function productCanonical(id: string): string {
  return `${SITE_URL}/product/${encodeURIComponent(id)}`;
}

function storefrontCategory(product: ProductSeoRecord): string | undefined {
  return (
    classifyStorefrontCategory({
      id: product.id,
      title: product.title,
      description: product.description || null,
      category: product.category || null,
    }) ||
    product.category?.trim() ||
    undefined
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const canonical = productCanonical(id);
  const product = await getProduct(id);

  if (!product || product.is_active === false) {
    return {
      title: 'Product Not Available',
      description: 'This product is currently unavailable on ADHYEY BROTHERS.',
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }

  const title = product.title.trim();
  const description = seoDescription(product.description);
  const image = getProductImage(product);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
      },
    },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: 'ADHYEY BROTHERS',
      title: `${title} | ADHYEY BROTHERS`,
      description,
      images: image
        ? [{ url: image, alt: title }]
        : [
            {
              url: '/opengraph-image',
              width: 1200,
              height: 630,
              alt: 'ADHYEY BROTHERS online fashion store',
            },
          ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ADHYEY BROTHERS`,
      description,
      images: [image || '/opengraph-image'],
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product || product.is_active === false) return children;

  const canonical = productCanonical(product.id);
  const description = cleanDescription(product.description);
  const price = Number(product.price ?? 0);
  const availability = await getProductAvailability(product.id);
  const category = storefrontCategory(product);
  const image = getProductImage(product);
  const sku = product.style_code?.trim() || product.id;
  const brand = product.brand?.trim();

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name: product.title,
    description,
    sku,
    url: canonical,
    ...(image ? { image: [image] } : {}),
    ...(brand
      ? {
          brand: {
            '@type': 'Brand',
            name: brand,
          },
        }
      : {}),
    ...(category ? { category } : {}),
    ...(price > 0
      ? {
          offers: {
            '@type': 'Offer',
            url: canonical,
            priceCurrency: 'INR',
            price: price.toFixed(2),
            availability,
            itemCondition: 'https://schema.org/NewCondition',
            seller: {
              '@type': 'Organization',
              '@id': `${SITE_URL}/#organization`,
              name: 'ADHYEY BROTHERS',
            },
            hasMerchantReturnPolicy: {
              '@type': 'MerchantReturnPolicy',
              applicableCountry: 'IN',
              returnPolicyCategory:
                'https://schema.org/MerchantReturnFiniteReturnWindow',
              merchantReturnDays: 7,
              merchantReturnLink: `${SITE_URL}/return-policy`,
            },
          },
        }
      : {}),
  };

  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: SITE_URL,
    },
    ...(category
      ? [
          {
            '@type': 'ListItem',
            position: 2,
            name: category,
            item: `${SITE_URL}/category/${encodeURIComponent(category)}`,
          },
        ]
      : []),
    {
      '@type': 'ListItem',
      position: category ? 3 : 2,
      name: product.title,
      item: canonical,
    },
  ];

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  const productJson = JSON.stringify(productJsonLd).replace(/</g, '\\u003c');
  const breadcrumbJson = JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productJson }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJson }}
      />
      {children}
    </>
  );
}
