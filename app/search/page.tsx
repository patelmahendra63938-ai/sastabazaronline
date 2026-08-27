import type { Metadata } from 'next';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search Products',
  robots: {
    index: false,
    follow: true,
  },
};

import { supabase } from '@/lib/supabase';
import ProductCard, { Product } from '@/components/ProductCard';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

const SEARCH_PAGE_SIZE = 16;

function parsePage(value?: string) {
  if (!value) return 1;
  if (!/^\d+$/.test(value)) return 1;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

async function getSearchResults(
  query: string,
  isVisual: boolean,
  page: number
): Promise<{
  products: Product[];
  count: number;
  paginated: boolean;
}> {
  try {
    // 📸 ૧. Visual / Photo Search
    if (isVisual) {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, price, mrp, category, images, stock')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error('Visual search query failed:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        return {
          products: [],
          count: 0,
          paginated: false,
        };
      }

      return {
        products: data || [],
        count: data?.length || 0,
        paginated: false,
      };
    }

    // 🔍 ૨. Empty normal search
    if (!query || query.trim() === '') {
      const { data } = await supabase
        .from('products')
        .select('id, title, price, mrp, category, images, stock')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);

      return {
        products: data || [],
        count: data?.length || 0,
        paginated: false,
      };
    }

    // 🔤 ૩. Text search
    const keywords = query
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    if (keywords.length === 0) {
      return {
        products: [],
        count: 0,
        paginated: true,
      };
    }

    const conditions = keywords
      .map(
        (word) =>
          `title.ilike.%${word}%,category.ilike.%${word}%,description.ilike.%${word}%`
      )
      .join(',');

    const from = (page - 1) * SEARCH_PAGE_SIZE;

    const { data, error, count } = await supabase
      .from('products')
      .select(
        'id, title, price, mrp, category, images, stock',
        { count: 'exact' }
      )
      .eq('is_active', true)
      .or(conditions)
      .order('created_at', { ascending: false })
      .range(from, from + SEARCH_PAGE_SIZE - 1);

    if (error || !data) {
      if (error) {
        console.error('Search product query failed:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      }

      return {
        products: [],
        count: 0,
        paginated: true,
      };
    }

    return {
      products: data,
      count: count || 0,
      paginated: true,
    };
  } catch (err) {
    console.error('Search execution error:', err);

    return {
      products: [],
      count: 0,
      paginated: Boolean(query.trim()) && !isVisual,
    };
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams:
    | Promise<{
        q?: string;
        visual?: string;
        page?: string;
      }>
    | {
        q?: string;
        visual?: string;
        page?: string;
      };
}) {
  const resolvedParams = await searchParams;

  const query = resolvedParams?.q || '';
  const isVisual = resolvedParams?.visual === 'true';
  const currentPage = parsePage(resolvedParams?.page);

  const {
    products,
    count,
    paginated,
  } = await getSearchResults(
    query,
    isVisual,
    currentPage
  );

  return (
    <main className="min-h-screen bg-[#fffaf5] pb-16">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-5 rounded-2xl border border-[#ead8b8] bg-[#741f23] p-6 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-block rounded-md bg-[#d7aa5b] px-2.5 py-1 text-xs font-bold uppercase text-[#5e171b]">
              {isVisual
                ? 'Visual Search'
                : 'Search Results'}
            </span>

            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              {isVisual
                ? 'Matched Products from Photo 📸'
                : query
                  ? `Search results for "${query}"`
                  : 'All Products'}
            </h1>

            <p className="mt-1 text-xs text-[#f4dfbf]">
              Found{' '}
              {paginated
                ? count
                : products.length}{' '}
              products
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#d7aa5b] bg-[#5e171b] px-4 py-2 text-xs font-bold text-[#f0c987] transition hover:bg-[#741f23] hover:text-white"
          >
            ← Back to Home
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-12 text-center shadow-sm">
            <h3 className="text-lg font-bold text-[#741f23]">
              No products found matching your search
            </h3>

            <p className="mt-1 text-sm text-stone-500">
              Please try searching by another keyword
              or explore our store products.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-[#741f23] px-6 py-2.5 font-bold text-white transition hover:bg-[#5e171b]"
            >
              Explore All Store Products
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>

            {paginated && (
              <Pagination
                pathname="/search"
                searchParams={resolvedParams}
                currentPage={currentPage}
                pageSize={SEARCH_PAGE_SIZE}
                totalCount={count}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}