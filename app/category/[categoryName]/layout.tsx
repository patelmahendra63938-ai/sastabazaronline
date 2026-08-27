import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';

const SITE_URL = 'https://www.adhyeybrothers.in';

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

function cleanCategoryName(
  value: string
): string {
  try {
    return decodeURIComponent(value)
      .replace(/\+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return value
      .replace(/\+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

function categoryCanonical(
  categoryName: string
): string {
  return `${SITE_URL}/category/${encodeURIComponent(
    categoryName
  )}`;
}

const getCategoryProductCount = cache(
  async (
    categoryName: string
  ): Promise<number | null> => {
    const supabase =
      getSupabaseClient();

    if (!supabase) {
      return null;
    }

    const {
      count,
      error,
    } = await supabase
      .from('products')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('is_active', true)
      .ilike(
        'category',
        `%${categoryName}%`
      );

    if (error) {
      console.error(
        'Category SEO count failed:',
        {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          categoryName,
        }
      );

      return null;
    }

    return count ?? 0;
  }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    categoryName: string;
  }>;
}): Promise<Metadata> {
  const {
    categoryName,
  } = await params;

  const decodedCategory =
    cleanCategoryName(
      categoryName
    );

  const canonical =
    categoryCanonical(
      decodedCategory
    );

  const count =
    await getCategoryProductCount(
      decodedCategory
    );

  const hasProducts =
    count === null
      ? true
      : count > 0;

  const title =
    `${decodedCategory} Online Shopping`;

  const description =
    count && count > 0
      ? `Shop ${count} active ${decodedCategory} products online at ADHYEY BROTHERS. Explore quality products with secure shopping and Pan India delivery.`
      : `Shop ${decodedCategory} online at ADHYEY BROTHERS. Explore quality products with secure shopping and Pan India delivery.`;

  return {
    title,

    description,

    alternates: {
      canonical,
    },

    robots: {
      index: hasProducts,
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

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    categoryName: string;
  }>;
}) {
  const {
    categoryName,
  } = await params;

  const decodedCategory =
    cleanCategoryName(
      categoryName
    );

  const canonical =
    categoryCanonical(
      decodedCategory
    );

  const count =
    await getCategoryProductCount(
      decodedCategory
    );

  const collectionPageJsonLd = {
    '@context':
      'https://schema.org',

    '@type':
      'CollectionPage',

    name:
      `${decodedCategory} Online Shopping`,

    url:
      canonical,

    description:
      `Shop ${decodedCategory} products online at ADHYEY BROTHERS.`,

    ...(typeof count === 'number'
      ? {
          numberOfItems:
            count,
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    '@context':
      'https://schema.org',

    '@type':
      'BreadcrumbList',

    itemListElement: [
      {
        '@type':
          'ListItem',

        position:
          1,

        name:
          'Home',

        item:
          SITE_URL,
      },
      {
        '@type':
          'ListItem',

        position:
          2,

        name:
          decodedCategory,

        item:
          canonical,
      },
    ],
  };

  const collectionJson =
    JSON.stringify(
      collectionPageJsonLd
    ).replace(
      /</g,
      '\\u003c'
    );

  const breadcrumbJson =
    JSON.stringify(
      breadcrumbJsonLd
    ).replace(
      /</g,
      '\\u003c'
    );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            collectionJson,
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            breadcrumbJson,
        }}
      />

      {children}
    </>
  );
}