import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';

const SITE_URL = 'https://www.adhyeybrothers.in';

type ProductSeoRecord = {
  id: string;
  title: string;
  is_active?: boolean | null;
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
        'id,title,is_active'
      )
      .eq(
        'id',
        id
      )
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
    `Shop ${title} online at ADHYEY BROTHERS with delivery across India.`;

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

  const productJsonLd = {
    '@context':
      'https://schema.org',

    '@type':
      'Product',

    name:
      product.title,

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