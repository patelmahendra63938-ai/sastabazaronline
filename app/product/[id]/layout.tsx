import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';

const SITE_URL = 'https://www.adhyeybrothers.in';

type ProductSeoRecord = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | string | null;
  category?: string | null;
  images?: string[] | null;
  image?: string | null;
  is_active?: boolean | null;
  stock?: number | null;
};

type InventoryRow = {
  available_quantity?: number | null;
};

function getSupabaseClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  return createClient(
    supabaseUrl,
    anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

const getProduct = cache(
  async (
    id: string
  ): Promise<ProductSeoRecord | null> => {
    if (!id) {
      return null;
    }

    const supabase =
      getSupabaseClient();

    if (!supabase) {
      console.error(
        'Product SEO: Supabase environment variables missing'
      );

      return null;
    }

    const {
      data,
      error,
    } = await supabase
      .from('products')
      .select(
        'id,title,description,price,category,images,image,is_active,stock'
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(
        'Product SEO fetch failed:',
        error.message
      );

      return null;
    }

    if (!data) {
      return null;
    }

    return data as ProductSeoRecord;
  }
);

async function getProductAvailability(
  product: ProductSeoRecord
): Promise<string> {
  const fallbackAvailability =
    Number(product.stock ?? 99) > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';

  const supabase =
    getSupabaseClient();

  if (!supabase) {
    return fallbackAvailability;
  }

  const {
    data,
    error,
  } = await supabase
    .from('inventory')
    .select('available_quantity')
    .eq(
      'product_id',
      product.id
    );

  if (error) {
    console.error(
      'Product inventory SEO fetch failed:',
      error.message
    );

    return fallbackAvailability;
  }

  const rows =
    (data ?? []) as InventoryRow[];

  if (rows.length === 0) {
    return fallbackAvailability;
  }

  const totalAvailable =
    rows.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          Number(
            row.available_quantity ?? 0
          )
        ),
      0
    );

  return totalAvailable > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}

function cleanDescription(
  value?: string | null
): string {
  const text = (value || '')
    .replace(/<[^>]*>/g, ' ')
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
): string {
  const text =
    cleanDescription(value);

  if (text.length <= maxLength) {
    return text;
  }

  const withinLimit =
    text.slice(
      0,
      maxLength + 1
    );

  const lastSpace =
    withinLimit.lastIndexOf(
      ' '
    );

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
): string | undefined {
  const candidate =
    Array.isArray(product.images) &&
    product.images.length > 0
      ? product.images[0]
      : product.image;

  if (
    !candidate ||
    typeof candidate !== 'string'
  ) {
    return undefined;
  }

  if (
    /^https?:\/\//i.test(
      candidate
    )
  ) {
    return candidate;
  }

  return `${SITE_URL}${
    candidate.startsWith('/')
      ? candidate
      : `/${candidate}`
  }`;
}

function productCanonical(
  id: string
): string {
  return `${SITE_URL}/product/${encodeURIComponent(
    id
  )}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } =
    await params;

  const canonical =
    productCanonical(id);

  const product =
    await getProduct(id);

  if (
    !product ||
    product.is_active === false
  ) {
    return {
      title:
        'Product Not Available',

      description:
        'This product is currently unavailable on ADHYEY BROTHERS.',

      alternates: {
        canonical,
      },

      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title =
    product.title.trim();

  const description =
    seoDescription(
      product.description
    );

  const image =
    productImage(product);

  return {
    title,

    description,

    alternates: {
      canonical,
    },

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      type: 'website',

      url: canonical,

      siteName:
        'ADHYEY BROTHERS',

      title:
        `${title} | ADHYEY BROTHERS`,

      description,

      ...(image
        ? {
            images: [
              {
                url: image,
                alt: title,
              },
            ],
          }
        : {}),
    },

    twitter: {
      card:
        'summary_large_image',

      title:
        `${title} | ADHYEY BROTHERS`,

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
  const { id } =
    await params;

  const product =
    await getProduct(id);

  if (
    !product ||
    product.is_active === false
  ) {
    return children;
  }

  const canonical =
    productCanonical(
      product.id
    );

  const image =
    productImage(product);

  const description =
    cleanDescription(
      product.description
    );

  const price =
    Number(
      product.price ?? 0
    );

  const availability =
    await getProductAvailability(
      product
    );

  const productJsonLd = {
    '@context':
      'https://schema.org',

    '@type':
      'Product',

    name:
      product.title,

    description,

    sku:
      product.id,

    url:
      canonical,

    ...(image
      ? {
          image: [image],
        }
      : {}),

    brand: {
      '@type':
        'Brand',

      name:
        'ADHYEY BROTHERS',
    },

    ...(product.category
      ? {
          category:
            product.category,
        }
      : {}),

    ...(price > 0
      ? {
          offers: {
            '@type':
              'Offer',

            url:
              canonical,

            priceCurrency:
              'INR',

            price:
              price.toFixed(2),

            availability,

            itemCondition:
              'https://schema.org/NewCondition',

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

  const jsonLd =
    JSON.stringify(
      productJsonLd
    ).replace(
      /</g,
      '\\u003c'
    );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd,
        }}
      />

      {children}
    </>
  );
}