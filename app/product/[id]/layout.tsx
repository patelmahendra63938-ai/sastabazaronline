import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';

const SITE_URL = 'https://www.adhyeybrothers.in';

type ProductSeoRecord = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | string | null;
  is_active?: boolean | null;
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
        'id,title,description,price,is_active'
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(
        'Product SEO fetch failed:',
        {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          productId: id,
        }
      );

      return null;
    }

    if (!data) {
      console.error(
        'Product SEO fetch returned no row:',
        id
      );

      return null;
    }

    return data as ProductSeoRecord;
  }
);

async function getProductAvailability(
  productId: string
): Promise<string> {
  const supabase =
    getSupabaseClient();

  if (!supabase) {
    return 'https://schema.org/InStock';
  }

  const {
    data,
    error,
  } = await supabase
    .from('inventory')
    .select('available_quantity')
    .eq(
      'product_id',
      productId
    );

  if (error) {
    console.error(
      'Product inventory SEO fetch failed:',
      {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        productId,
      }
    );

    /*
     * Do not falsely mark a valid product OutOfStock
     * if inventory lookup itself fails.
     */
    return 'https://schema.org/InStock';
  }

  const rows =
    (data ?? []) as InventoryRow[];

  /*
   * Existing storefront can still sell products
   * without inventory variant rows, so use InStock
   * as the safe fallback when no inventory rows exist.
   */
  if (rows.length === 0) {
    return 'https://schema.org/InStock';
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
    },

    twitter: {
      card: 'summary',

      title:
        `${title} | ADHYEY BROTHERS`,

      description,
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
      product.id
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

    brand: {
      '@type':
        'Brand',

      name:
        'ADHYEY BROTHERS',
    },

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