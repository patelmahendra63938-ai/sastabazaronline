import { NextResponse } from 'next/server';
import { getActiveStorefrontCategories } from '@/lib/catalog/storefront-categories';

export const dynamic = 'force-dynamic';

export async function GET() {
  const categories = await getActiveStorefrontCategories();
  return NextResponse.json(
    categories.map(category => ({
      name: category.name,
      product_count: category.product_count,
    })),
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
