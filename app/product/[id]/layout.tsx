import type { Metadata } from 'next';
import React from 'react';

const SITE_URL = 'https://www.adhyeybrothers.in';

type ProductSeoRecord = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  category?: string | null;
  brand?: string | null;
  images?: string[] | null;
  image?: string | null;
  is_active?: boolean | null;
  stock?: number | null;
};

type InventoryRow = {
  available_quantity?: number | null;
};

async function getProduct(
  id: string
): Promise<ProductSeoRecord | null> {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey || !id) {
    return null;
  }

  const url = new URL(
    `${supabaseUrl}/rest/v1/products`
  );

  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('select', '*');
  url.searchParams.set('limit', '1');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(
        'Product SEO fetch failed:',
        response.status,
        await response.text()
      );

      return null;
    }

    const rows =
      (await response.json()) as ProductSeoRecord[];

    return rows[0] || null;
  } catch (error) {
    console.error(
      'Product SEO fetch failed:',
      error
    );

    return null;
  }
}

async function getProductAvailability(
  product: ProductSeoRecord
): Promise<string> {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return Number(product.stock ?? 0) > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';
  }

  const url = new URL(
    `${supabaseUrl}/rest/v1/inventory`
  );

  url.searchParams.set(
    'product_id',
    `eq.${product.id}`
  );

  url.searchParams.set(
    'select',
    'available_quantity'
  );

  try {
    const response = await fetch(url.toString(), {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const rows =
        (await response.json()) as InventoryRow[];

      if (rows.length > 0) {
        const totalAvailable = rows.reduce(
          (sum, row) =>
            sum +
            Math.max(
              0,
              Number(row.available_quantity ?? 0)
            ),
          0
        );

        return totalAvailable > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock';
      }
    } else {
      console.error(
        'Product inventory SEO fetch failed:',
        response.status,
        await response.text()
      );
    }
  } catch (error) {
    console.error(
      'Product inventory SEO fetch failed:',
      error
    );
  }

  return Number(product.stock ?? 0) > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}

function cleanDescription(
  value?: string | null
) {
  const text = (value || '')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    text ||
    'Shop this product online at ADHYEY BROTHERS with delivery across India.'
  );
}

function seoDescription(
  value?: string | null,
  maxLength = 155
) {
  const text = cleanDescription(value);

  if (text.length <= maxLength) {
    return text;
  }

  const withinLimit = text.slice(
    0,
    maxLength + 1
  );

  const lastBullet =
    withinLimit.lastIndexOf(' • ');

  if (lastBullet >= 80) {
    return withinLimit
      .slice(0, lastBullet)
      .replace(/[,:;\s]+$/, '')
      .trim();
  }

  const lastSpace =
    withinLimit.lastIndexOf(' ');

  const cutAt =
    lastSpace >= 80
      ? lastSpace
      : maxLength;

  return `${withinLimit
    .slice(0, cutAt)
    .replace(/[,:;\s]+$/, '')
    .trim()}…`;
}

function productImage(
  product: ProductSeoRecord
) {
  const candidate =
    Array.isArray(product.images) &&
    product.images.length > 0
      ? product.images[0]
      : product.image;

  if (!candidate) {
    return undefined;
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  return `${SITE_URL}${
    candidate.startsWith('/')
      ? candidate
      : `/${candidate}`
  }`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const product = await getProduct(id);

  const canonical =
    `${SITE_URL}/product/${encodeURIComponent(id)}`;

  if (!product) {
    return {
      title: 'Product',

      alternates: {
        canonical,
      },

      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const description =
    seoDescription(product.description);

  const image =
    productImage(product);

  return {
    title: product.title,

    description,

    alternates: {
      canonical,
    },

    robots: {
      index:
        product.is_active !== false,
      follow: true,
    },

    openGraph: {
      type: 'website',

      url: canonical,

      title: product.title,

      description,

      siteName: 'ADHYEY BROTHERS',

      ...(image
        ? {
            images: [
              {
                url: image,
                alt: product.title,
              },
            ],
          }
        : {}),
    },

    twitter: {
      card: 'summary_large_image',

      title: product.title,

      description,

      ...(image
        ? {
            images: [image],
          }
        : {}),
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

  if (!product) {
    return children;
  }

  const image =
    productImage(product);

  const canonical =
    `${SITE_URL}/product/${encodeURIComponent(id)}`;

  const price =
    Number(product.price || 0);

  const availability =
    await getProductAvailability(product);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',

    name: product.title,

    description:
      cleanDescription(
        product.description
      ),

    sku: product.id,

    ...(product.brand
      ? {
          brand: {
            '@type': 'Brand',
            name: product.brand,
          },
        }
      : {}),

    ...(product.category
      ? {
          category:
            product.category,
        }
      : {}),

    ...(image
      ? {
          image: [image],
        }
      : {}),

    url: canonical,

    ...(price > 0
      ? {
          offers: {
            '@type': 'Offer',

            url: canonical,

            priceCurrency: 'INR',

            price:
              price.toFixed(2),

            itemCondition:
              'https://schema.org/NewCondition',

            availability,

            hasMerchantReturnPolicy: {
              '@type':
                'MerchantReturnPolicy',

              applicableCountry:
                'IN',

              returnPolicyCategory:
                'https://schema.org/MerchantReturnFiniteReturnWindow',

              merchantReturnDays:
                7,

              merchantReturnLink:
                `${SITE_URL}/return-policy`,
            },
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              productJsonLd
            ),
        }}
      />

      {children}
    </>
  );
}