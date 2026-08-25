import type { Metadata } from 'next';
import React from 'react';

const SITE_URL = 'https://www.sastabazaronline.in';

type ProductSeoRecord = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  mrp?: number | null;
  category?: string | null;
  brand?: string | null;
  images?: string[] | null;
  image?: string | null;
  stock?: number | null;
  is_active?: boolean | null;
};

async function getProduct(id: string): Promise<ProductSeoRecord | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey || !id) return null;

  const url = new URL(`${supabaseUrl}/rest/v1/products`);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('select', 'id,title,description,price,mrp,category,brand,images,image,stock,is_active');
  url.searchParams.set('limit', '1');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;
    const rows = (await response.json()) as ProductSeoRecord[];
    return rows[0] || null;
  } catch {
    return null;
  }
}

function cleanDescription(value?: string | null) {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  return text || 'Shop this product online at SASTABAZARONLINE with delivery across India.';
}

function productImage(product: ProductSeoRecord) {
  const candidate = Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : product.image;

  if (!candidate) return undefined;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return `${SITE_URL}${candidate.startsWith('/') ? candidate : `/${candidate}`}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  const canonical = `${SITE_URL}/product/${id}`;

  if (!product) {
    return {
      title: 'Product | SASTABAZARONLINE',
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }

  const description = cleanDescription(product.description).slice(0, 160);
  const image = productImage(product);

  return {
    title: product.title,
    description,
    alternates: { canonical },
    robots: {
      index: product.is_active !== false,
      follow: true,
    },
    openGraph: {
      type: 'website',
      url: canonical,
      title: product.title,
      description,
      siteName: 'SASTABAZARONLINE',
      ...(image ? { images: [{ url: image, alt: product.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      ...(image ? { images: [image] } : {}),
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

  if (!product) return children;

  const image = productImage(product);
  const canonical = `${SITE_URL}/product/${id}`;
  const price = Number(product.price || 0);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: cleanDescription(product.description),
    sku: product.id,
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(product.category ? { category: product.category } : {}),
    ...(image ? { image: [image] } : {}),
    url: canonical,
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'INR',
      price: price.toFixed(2),
      availability: (product.stock ?? 1) > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {children}
    </>
  );
}
