import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import ProductFilterPanel, {
  AvailableFilterOptions,
  FilterGroupConfig
} from '@/components/ProductFilterPanel';
import ActiveFilterChips from '@/components/ActiveFilterChips';
import CatalogControls from '@/components/CatalogControls';
import CampaignBanner from '@/components/promotions/CampaignBanner';
import HomepageSellerTrust from '@/components/trust/HomepageSellerTrust';
import TopTrustStrip from '@/components/trust/TopTrustStrip';
import BulkWholesaleAdvantage from '@/components/commerce/BulkWholesaleAdvantage';
import { getActiveCampaigns, Campaign } from '@/lib/promotions';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Pagination from '@/components/Pagination';
import { getHomepageDisplaySettings } from '@/lib/settings/homepage-display';
import {
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'ADHYEY BROTHERS – Fashion, Lifestyle & Online Shopping',
  description: 'Shop curated fashion, lifestyle and everyday collections at ADHYEY BROTHERS.',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

interface StorefrontFacets {
  brands?: string[];
  fabrics?: string[];
  patterns?: string[];
  fits?: string[];
  occasions?: string[];
  sizes?: string[];
  minPrice?: number;
  maxPrice?: number;
}

const CATALOG_PAGE_SIZE = 16;

function parsePage(value?: string) {
  if (!value) return 1;
  if (!/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function StorefrontPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const homepageDisplay = await getHomepageDisplaySettings();
  const effectiveSearchParams = homepageDisplay.show_filter_panel
    ? resolvedSearchParams
    : Object.fromEntries(
        Object.entries(resolvedSearchParams).filter(([key]) => ![
          'category', 'brand', 'color', 'fabric', 'pattern', 'gender', 'fit', 'occasion',
          'type', 'minPrice', 'maxPrice', 'size',
        ].includes(key)),
      );

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const [
    promotionsResult,
    filterConfigsResult,
    categoriesResult,
    homepageCategoriesResult
  ] = await Promise.all([
    supabase
      .from('promotions')
      .select('*')
      .eq('is_enabled', true),
    supabase
      .from('storefront_filter_settings')
      .select('*')
      .order('display_order', { ascending: true }),
    supabase
      .from('categories')
      .select('name')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('categories')
      .select(
        'id, name, homepage_featured, homepage_display_order, homepage_image_url, display_order'
      )
      .eq('is_active', true)
      .eq('show_on_homepage', true)
      .order('homepage_featured', { ascending: false })
      .order('homepage_display_order', { ascending: true })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
  ]);

  const rawPromotions = promotionsResult.data;
  const activeCampaigns: Campaign[] = getActiveCampaigns(
    (rawPromotions as Campaign[]) || []
  );

  // Festival / campaign banner only. No active campaign = no hero banner.
  const homepageBannerCampaign =
    activeCampaigns.find(c => c.is_homepage_visible) ||
    activeCampaigns[0] ||
    null;

  const filterConfigs: FilterGroupConfig[] =
    filterConfigsResult.data || [];

  const categoriesData = categoriesResult.data;
  const activeCategories = (categoriesData || []).map(c => c.name);
  const homepageCategories = homepageCategoriesResult.data || [];

  const currentPage = parsePage(effectiveSearchParams.page);
  const rangeFrom = (currentPage - 1) * CATALOG_PAGE_SIZE;
  const rangeTo = rangeFrom + CATALOG_PAGE_SIZE - 1;

  const productSelect = effectiveSearchParams.size
    ? 'id, title, price, mrp, category, images, stock, inventory!inner(size, available_quantity)'
    : 'id, title, price, mrp, category, images, stock, inventory(size, available_quantity)';

  let query = supabase
    .from('products')
    .select(productSelect, { count: 'exact' })
    .eq('is_active', true);

  if (activeCategories.length > 0) {
    query = query.in('category', activeCategories);
  }

  if (effectiveSearchParams.q) {
    query = query.ilike('title', `%${effectiveSearchParams.q}%`);
  }

  if (effectiveSearchParams.category) {
    query = query.in(
      'category',
      effectiveSearchParams.category.split(',')
    );
  }

  if (effectiveSearchParams.brand) {
    query = query.in(
      'brand',
      effectiveSearchParams.brand.split(',')
    );
  }

  if (effectiveSearchParams.fabric) {
    query = query.in(
      'fabric',
      effectiveSearchParams.fabric.split(',')
    );
  }

  if (effectiveSearchParams.pattern) {
    query = query.in(
      'pattern',
      effectiveSearchParams.pattern.split(',')
    );
  }

  if (effectiveSearchParams.fit) {
    query = query.in(
      'fit',
      effectiveSearchParams.fit.split(',')
    );
  }

  if (effectiveSearchParams.occasion) {
    query = query.in(
      'occasion',
      effectiveSearchParams.occasion.split(',')
    );
  }

  if (effectiveSearchParams.minPrice) {
    query = query.gte(
      'price',
      parseFloat(effectiveSearchParams.minPrice)
    );
  }

  if (effectiveSearchParams.maxPrice) {
    query = query.lte(
      'price',
      parseFloat(effectiveSearchParams.maxPrice)
    );
  }

  if (effectiveSearchParams.size) {
    query = query
      .in(
        'inventory.size',
        effectiveSearchParams.size.split(',')
      )
      .gt('inventory.available_quantity', 0);
  }

  if (effectiveSearchParams.sort === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (effectiveSearchParams.sort === 'price_desc') {
    query = query.order('price', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(rangeFrom, rangeTo);

  let featuredQuery = supabase
    .from('products')
    .select(productSelect)
    .eq('is_active', true);

  if (activeCategories.length > 0) {
    featuredQuery = featuredQuery.in('category', activeCategories);
  }

  if (effectiveSearchParams.q) {
    featuredQuery = featuredQuery.ilike(
      'title',
      `%${effectiveSearchParams.q}%`
    );
  }

  if (effectiveSearchParams.category) {
    featuredQuery = featuredQuery.in(
      'category',
      effectiveSearchParams.category.split(',')
    );
  }

  if (effectiveSearchParams.brand) {
    featuredQuery = featuredQuery.in(
      'brand',
      effectiveSearchParams.brand.split(',')
    );
  }

  if (effectiveSearchParams.fabric) {
    featuredQuery = featuredQuery.in(
      'fabric',
      effectiveSearchParams.fabric.split(',')
    );
  }

  if (effectiveSearchParams.pattern) {
    featuredQuery = featuredQuery.in(
      'pattern',
      effectiveSearchParams.pattern.split(',')
    );
  }

  if (effectiveSearchParams.fit) {
    featuredQuery = featuredQuery.in(
      'fit',
      effectiveSearchParams.fit.split(',')
    );
  }

  if (effectiveSearchParams.occasion) {
    featuredQuery = featuredQuery.in(
      'occasion',
      effectiveSearchParams.occasion.split(',')
    );
  }

  if (effectiveSearchParams.minPrice) {
    featuredQuery = featuredQuery.gte(
      'price',
      parseFloat(effectiveSearchParams.minPrice)
    );
  }

  if (effectiveSearchParams.maxPrice) {
    featuredQuery = featuredQuery.lte(
      'price',
      parseFloat(effectiveSearchParams.maxPrice)
    );
  }

  if (effectiveSearchParams.size) {
    featuredQuery = featuredQuery
      .in(
        'inventory.size',
        effectiveSearchParams.size.split(',')
      )
      .gt('inventory.available_quantity', 0);
  }

  if (effectiveSearchParams.sort === 'price_asc') {
    featuredQuery = featuredQuery.order(
      'price',
      { ascending: true }
    );
  } else if (effectiveSearchParams.sort === 'price_desc') {
    featuredQuery = featuredQuery.order(
      'price',
      { ascending: false }
    );
  } else {
    featuredQuery = featuredQuery.order(
      'created_at',
      { ascending: false }
    );
  }

  featuredQuery = featuredQuery.limit(8);

  const facetQuery = supabase.rpc(
    'get_storefront_filter_facets',
    {
      p_categories:
        activeCategories.length > 0
          ? activeCategories
          : null,
    }
  );

  const [
    {
      data: productsData,
      count: productCount,
      error: productError
    },
    {
      data: featuredData,
      error: featuredError
    },
    {
      data: facetData,
      error: facetError
    },
  ] = await Promise.all([
    query,
    featuredQuery,
    facetQuery,
  ]);

  const products = productsData || [];
  const featuredProducts = featuredData || [];
  const totalProducts = productCount || 0;
  const facets = (facetData || {}) as StorefrontFacets;

  if (productError) {
    console.error('Homepage product query failed:', {
      message: productError.message,
      code: productError.code,
      details: productError.details,
      hint: productError.hint,
    });
  }

  if (featuredError) {
    console.error('Homepage featured query failed:', {
      message: featuredError.message,
      code: featuredError.code,
      details: featuredError.details,
      hint: featuredError.hint,
    });
  }

  if (facetError) {
    console.error(
      'Storefront facet lookup failed:',
      facetError.message
    );
  }

  const availableOptions: AvailableFilterOptions = {
    categories: activeCategories,
    brands: facets.brands || [],
    fabrics: facets.fabrics || [],
    patterns: facets.patterns || [],
    fits: facets.fits || [],
    occasions: facets.occasions || [],
    sizes: facets.sizes || [],
    minPrice: Number(facets.minPrice ?? 0),
    maxPrice: Number(facets.maxPrice ?? 5000),
  };

  return (
    <main className="min-h-screen bg-[#fffaf5] flex flex-col justify-between font-sans text-stone-900">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 sm:space-y-10">
          {homepageBannerCampaign && (
            <CampaignBanner campaign={homepageBannerCampaign} />
          )}

          <TopTrustStrip />

          {homepageCategories.length > 0 && (
            <section
              aria-labelledby="shop-by-category-heading"
              className="space-y-5"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b5843d]">
                    Browse collections
                  </p>

                  <h2
                    id="shop-by-category-heading"
                    className="mt-1 text-2xl font-black tracking-tight text-[#741f23] sm:text-3xl"
                  >
                    Shop by Category
                  </h2>
                </div>

                <a
                  href="#all-products"
                  className="hidden items-center gap-1 text-xs font-bold text-[#741f23] hover:text-[#b5843d] sm:flex"
                >
                  View catalog
                  <ArrowRight size={14} />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {homepageCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${encodeURIComponent(
                      category.name
                    )}`}
                    className={`group relative flex min-h-28 overflow-hidden rounded-2xl border bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-[#d7b06a] hover:shadow-md ${
                      category.homepage_featured
                        ? 'col-span-2 min-h-36 border-[#e7c88d] sm:col-span-2 lg:col-span-2'
                        : 'border-stone-200'
                    }`}
                  >
                    {category.homepage_image_url && (
                      <Image
                        src={category.homepage_image_url}
                        alt=""
                        fill
                        sizes={
                          category.homepage_featured
                            ? '(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) 66vw, 33vw'
                            : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw'
                        }
                        className="absolute inset-0 size-full object-cover"
                      />
                    )}

                    {category.homepage_image_url && (
                      <span className="absolute inset-0 bg-gradient-to-t from-[#741f23]/90 via-[#741f23]/30 to-transparent" />
                    )}

                    <span className="relative z-10 flex size-full flex-col justify-between">
                      <ShoppingBag
                        size={22}
                        className={
                          category.homepage_image_url
                            ? 'text-white'
                            : 'text-[#b5843d]'
                        }
                        aria-hidden="true"
                      />

                      <span
                        className={`flex items-end justify-between gap-2 text-sm font-black ${
                          category.homepage_image_url
                            ? 'text-white'
                            : 'text-[#741f23]'
                        }`}
                      >
                        {category.name}

                        <ArrowRight
                          size={14}
                          className="shrink-0 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {featuredProducts.length > 0 && (
            <section
              aria-labelledby="featured-products-heading"
              className="space-y-5 rounded-3xl bg-[#741f23] px-4 py-7 sm:px-6 sm:py-9"
            >
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f0c987]">
                    From our active catalog
                  </p>

                  <h2
                    id="featured-products-heading"
                    className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl"
                  >
                    Featured Products
                  </h2>

                  <p className="mt-1 text-xs text-[#f4dfbf]">
                    A selection of recently added active products.
                  </p>
                </div>

                <a
                  href="#all-products"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#f0c987] hover:text-white"
                >
                  Browse all products
                  <ArrowRight size={14} />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={`featured-${product.id}`}
                    product={product}
                    activeCampaigns={activeCampaigns}
                  />
                ))}
              </div>
            </section>
          )}

          <BulkWholesaleAdvantage />

          <section
            id="all-products"
            aria-labelledby="all-products-heading"
            className="scroll-mt-24"
          >
            <div className="flex flex-col md:flex-row gap-4 pt-2">
              {homepageDisplay.show_filter_panel && (
                <aside className="w-full md:w-64 shrink-0">
                  <ProductFilterPanel
                    availableOptions={availableOptions}
                    filterConfigs={filterConfigs}
                  />
                </aside>
              )}

              <div className="flex-1 space-y-4">
                <CatalogControls
                  showFilters={homepageDisplay.show_filter_panel}
                  availableOptions={availableOptions}
                  filterConfigs={filterConfigs}
                />

                {homepageDisplay.show_filter_panel && (
                  <ActiveFilterChips />
                )}

                <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
                  <h2
                    id="all-products-heading"
                    className="text-xs font-black text-[#741f23] uppercase tracking-wider"
                  >
                    {effectiveSearchParams.category
                      ? `${effectiveSearchParams.category} Collection`
                      : 'All Store Products'}{' '}
                    ({totalProducts} Items)
                  </h2>

                  <span className="text-[11px] text-gray-500 font-semibold">
                    Competitive Online Pricing
                  </span>
                </div>

                {products.length === 0 ? (
                  <div className="rounded-3xl border border-[#ead8b8] bg-white p-8 text-center shadow-xs sm:p-12">
                    <h3 className="text-base font-black text-stone-900">
                      No products match these results
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-stone-500">
                      Try removing one or more filters, changing the price range,
                      or browsing the full catalog.
                    </p>

                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {effectiveSearchParams.q && (
                        <Link
                          href={`/?q=${encodeURIComponent(effectiveSearchParams.q)}`}
                          className="rounded-xl border border-[#d7b06a] bg-[#fff7e8] px-4 py-2.5 text-xs font-bold text-[#741f23] transition hover:bg-[#fff2dc]"
                        >
                          Keep Search, Clear Filters
                        </Link>
                      )}

                      <Link
                        href="/"
                        className="rounded-xl bg-[#741f23] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#5e171b]"
                      >
                        Browse All Products
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] font-semibold text-gray-500">
                      Showing {rangeFrom + 1}–
                      {Math.min(
                        rangeFrom + products.length,
                        totalProducts
                      )}{' '}
                      of {totalProducts}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {products.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          activeCampaigns={activeCampaigns}
                        />
                      ))}
                    </div>

                    <Pagination
                      pathname="/"
                      searchParams={effectiveSearchParams}
                      currentPage={currentPage}
                      pageSize={CATALOG_PAGE_SIZE}
                      totalCount={totalProducts}
                    />
                  </>
                )}
              </div>
            </div>
          </section>

          <HomepageSellerTrust
            showAmazon={homepageDisplay.show_amazon_link}
            showFlipkart={homepageDisplay.show_flipkart_link}
            showMeesho={homepageDisplay.show_meesho_link}
          />

          <section
            aria-labelledby="customer-help-heading"
            className="rounded-3xl border border-[#ead8b8] bg-[#fffdf9] p-6 shadow-xs sm:p-8"
          >
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b5843d]">
                  Customer help
                </p>

                <h2
                  id="customer-help-heading"
                  className="mt-1 text-xl font-black text-[#741f23] sm:text-2xl"
                >
                  Orders, payments, invoices and support
                </h2>

                <p className="mt-2 max-w-xl text-xs leading-relaxed text-gray-500">
                  Find the customer pages you may need after choosing a product,
                  including order tracking, payment information, GST invoice
                  details, returns and support.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/orders"
                  className="rounded-xl bg-[#741f23] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#5e171b]"
                >
                  View Orders
                </Link>

                <Link
                  href="/contact"
                  className="rounded-xl border border-[#d7b06a] bg-white px-4 py-2.5 text-xs font-bold text-[#741f23] transition hover:bg-[#fff7e8]"
                >
                  Contact Support
                </Link>

                <Link
                  href="/payment-information"
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 transition hover:border-[#d7b06a]"
                >
                  Payment Information
                </Link>

                <Link
                  href="/gst-invoice"
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 transition hover:border-[#d7b06a]"
                >
                  GST Invoice
                </Link>

                <Link
                  href="/return-policy"
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 transition hover:border-[#d7b06a]"
                >
                  Return Policy
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
