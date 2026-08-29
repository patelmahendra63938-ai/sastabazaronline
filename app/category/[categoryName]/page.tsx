export const revalidate = 60;

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import ProductCard, { Product } from '@/components/ProductCard';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { getActiveStorefrontCategoryByName } from '@/lib/catalog/storefront-categories';

const PAGE_SIZE = 16;
const EMPTY_PRODUCT_ID = '00000000-0000-0000-0000-000000000000';

function parsePage(value?: string) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

async function getProductsByCategory(
  categoryName: string,
  page: number
): Promise<{ products: Product[]; count: number; canonicalName: string }> {
  const decodedCategory = decodeURIComponent(categoryName);
  const activeCategory = await getActiveStorefrontCategoryByName(decodedCategory);
  const from = (page - 1) * PAGE_SIZE;
  const ids = activeCategory?.product_ids || [];

  if (ids.length === 0) {
    return { products: [], count: 0, canonicalName: activeCategory?.name || decodedCategory };
  }

  const { data, error, count } = await supabase
    .from('products')
    .select(
      'id, title, price, mrp, category, images, stock, inventory(size, available_quantity)',
      { count: 'exact' }
    )
    .eq('is_active', true)
    .in('id', ids.length > 0 ? ids : [EMPTY_PRODUCT_ID])
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error || !data) {
    if (error) console.error('Category product query failed:', error.message);
    return { products: [], count: 0, canonicalName: activeCategory.name };
  }

  return {
    products: data,
    count: count || 0,
    canonicalName: activeCategory.name,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryName: string }> | { categoryName: string };
  searchParams: Promise<{ page?: string }> | { page?: string };
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const currentPage = parsePage(resolvedSearchParams.page);
  const { products, count, canonicalName } = await getProductsByCategory(
    resolvedParams.categoryName,
    currentPage
  );

  const rangeFrom = count > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeTo = count > 0
    ? Math.min((currentPage - 1) * PAGE_SIZE + products.length, count)
    : 0;

  return (
    <main className="min-h-screen bg-[#fffaf5] flex flex-col justify-between">
      <div>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <section className="mb-8 overflow-hidden rounded-3xl border border-[#ead8b8] bg-[#741f23] px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#f0c987]">
                  <ShoppingBag size={13} aria-hidden="true" />
                  Category
                </div>
                <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{canonicalName}</h1>
                <p className="mt-2 text-xs leading-relaxed text-[#f4dfbf] sm:text-sm">
                  Explore {count} active {count === 1 ? 'product' : 'products'} in {canonicalName}.
                </p>
              </div>
              <Link href="/" className="inline-flex min-h-10 items-center justify-center gap-1.5 self-start rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/15 sm:self-auto">
                <ArrowLeft size={14} aria-hidden="true" />
                Back to Home
              </Link>
            </div>
          </section>

          {products.length === 0 ? (
            <section className="rounded-3xl border border-[#ead8b8] bg-white px-5 py-12 text-center shadow-xs sm:px-8">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#fff7e8] text-[#741f23]">
                <ShoppingBag size={24} aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-black text-stone-900">No products are currently available</h2>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-stone-500 sm:text-sm">
                This category does not have active products right now. Please browse another category or return to the main catalog.
              </p>
              <Link href="/" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#741f23] px-5 text-xs font-bold text-white transition hover:bg-[#5e171b]">
                Browse All Products
              </Link>
            </section>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-stone-500">Showing {rangeFrom}–{rangeTo} of {count}</p>
                <span className="rounded-lg border border-[#ead8b8] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#741f23]">Newest first</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {products.map(product => <ProductCard key={product.id} product={product} />)}
              </div>
              <Pagination
                pathname={`/category/${encodeURIComponent(canonicalName)}`}
                searchParams={resolvedSearchParams}
                currentPage={currentPage}
                pageSize={PAGE_SIZE}
                totalCount={count}
              />
            </>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
