import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import ProductFilterPanel, {
  AvailableFilterOptions,
  FilterGroupConfig
} from '@/components/ProductFilterPanel';
import ActiveFilterChips from '@/components/ActiveFilterChips';
import CampaignBanner from '@/components/promotions/CampaignBanner';
import HomepageSellerTrust from '@/components/trust/HomepageSellerTrust';
import { getActiveCampaigns, Campaign } from '@/lib/promotions';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  FileText,
  LockKeyhole,
  MapPinCheck,
  PackageSearch,
  ReceiptText,
  ShoppingBag,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'SASTABAZARONLINE – Festival Offers & Collections',
  description: 'Shop curated collections with seasonal and festival discounts at SASTABAZARONLINE.',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function StorefrontPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  // Fetch independent homepage configuration in parallel.
  const [promotionsResult, filterConfigsResult, categoriesResult, homepageCategoriesResult] = await Promise.all([
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
      .select('id, name, homepage_featured, homepage_display_order, homepage_image_url, display_order')
      .eq('is_active', true)
      .eq('show_on_homepage', true)
      .order('homepage_featured', { ascending: false })
      .order('homepage_display_order', { ascending: true })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
  ]);

  const rawPromotions = promotionsResult.data;

  const activeCampaigns: Campaign[] = getActiveCampaigns((rawPromotions as Campaign[]) || []);
  
  // Determine top homepage banner
  const homepageBannerCampaign = activeCampaigns.find(c => c.is_homepage_visible) || activeCampaigns[0] || null;

  const filterConfigs: FilterGroupConfig[] = filterConfigsResult.data || [];
  const categoriesData = categoriesResult.data;

  const activeCategories = (categoriesData || []).map(c => c.name);
  const homepageCategories = homepageCategoriesResult.data || [];

  // 4. Build product query
  let query = supabase
    .from('products')
    .select('id, title, price, mrp, category, images, image, stock, inventory(size, available_quantity)')
    .eq('is_active', true);

  if (activeCategories.length > 0) {
    query = query.in('category', activeCategories);
  }

  // Apply URL filters safely
  if (resolvedSearchParams.q) {
    query = query.ilike('title', `%${resolvedSearchParams.q}%`);
  }

  if (resolvedSearchParams.category) {
    const cats = resolvedSearchParams.category.split(',');
    query = query.in('category', cats);
  }

  if (resolvedSearchParams.brand) {
    const brands = resolvedSearchParams.brand.split(',');
    query = query.in('brand', brands);
  }

  if (resolvedSearchParams.color) {
    const colors = resolvedSearchParams.color.split(',');
    query = query.in('color', colors);
  }

  if (resolvedSearchParams.fabric) {
    const fabrics = resolvedSearchParams.fabric.split(',');
    query = query.in('fabric', fabrics);
  }

  if (resolvedSearchParams.gender) {
    const genders = resolvedSearchParams.gender.split(',');
    query = query.in('gender', genders);
  }

  if (resolvedSearchParams.fit) {
    const fits = resolvedSearchParams.fit.split(',');
    query = query.in('fit', fits);
  }

  if (resolvedSearchParams.occasion) {
    const occasions = resolvedSearchParams.occasion.split(',');
    query = query.in('occasion', occasions);
  }

  if (resolvedSearchParams.type) {
    const types = resolvedSearchParams.type.split(',');
    query = query.in('product_type', types);
  }

  if (resolvedSearchParams.minPrice) {
    query = query.gte('price', parseFloat(resolvedSearchParams.minPrice));
  }

  if (resolvedSearchParams.maxPrice) {
    query = query.lte('price', parseFloat(resolvedSearchParams.maxPrice));
  }

  if (resolvedSearchParams.size) {
    const sizes = resolvedSearchParams.size.split(',');
    query = query
      .in('inventory.size', sizes)
      .gt('inventory.available_quantity', 0);
  }

  // Apply sorting
  if (resolvedSearchParams.sort === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (resolvedSearchParams.sort === 'price_desc') {
    query = query.order('price', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  let featuredQuery = supabase
    .from('products')
    .select('id, title, price, mrp, category, images, image, stock, inventory(size, available_quantity)')
    .eq('is_active', true);

  if (activeCategories.length > 0) {
    featuredQuery = featuredQuery.in('category', activeCategories);
  }

  if (resolvedSearchParams.q) featuredQuery = featuredQuery.ilike('title', `%${resolvedSearchParams.q}%`);
  if (resolvedSearchParams.category) featuredQuery = featuredQuery.in('category', resolvedSearchParams.category.split(','));
  if (resolvedSearchParams.brand) featuredQuery = featuredQuery.in('brand', resolvedSearchParams.brand.split(','));
  if (resolvedSearchParams.color) featuredQuery = featuredQuery.in('color', resolvedSearchParams.color.split(','));
  if (resolvedSearchParams.fabric) featuredQuery = featuredQuery.in('fabric', resolvedSearchParams.fabric.split(','));
  if (resolvedSearchParams.gender) featuredQuery = featuredQuery.in('gender', resolvedSearchParams.gender.split(','));
  if (resolvedSearchParams.fit) featuredQuery = featuredQuery.in('fit', resolvedSearchParams.fit.split(','));
  if (resolvedSearchParams.occasion) featuredQuery = featuredQuery.in('occasion', resolvedSearchParams.occasion.split(','));
  if (resolvedSearchParams.type) featuredQuery = featuredQuery.in('product_type', resolvedSearchParams.type.split(','));
  if (resolvedSearchParams.minPrice) featuredQuery = featuredQuery.gte('price', parseFloat(resolvedSearchParams.minPrice));
  if (resolvedSearchParams.maxPrice) featuredQuery = featuredQuery.lte('price', parseFloat(resolvedSearchParams.maxPrice));
  if (resolvedSearchParams.size) {
    featuredQuery = featuredQuery
      .in('inventory.size', resolvedSearchParams.size.split(','))
      .gt('inventory.available_quantity', 0);
  }

  if (resolvedSearchParams.sort === 'price_asc') {
    featuredQuery = featuredQuery.order('price', { ascending: true });
  } else if (resolvedSearchParams.sort === 'price_desc') {
    featuredQuery = featuredQuery.order('price', { ascending: false });
  } else {
    featuredQuery = featuredQuery.order('created_at', { ascending: false });
  }
  featuredQuery = featuredQuery.limit(8);

  const allActiveQuery = supabase
    .from('products')
    .select('brand, color, fabric, gender, fit, occasion, product_type, price, inventory(size, available_quantity)')
    .eq('is_active', true)
    .in('category', activeCategories);

  const [{ data: productsData }, { data: featuredData }, { data: allActiveData }] = await Promise.all([
    query,
    featuredQuery,
    allActiveQuery,
  ]);

  const products = productsData || [];
  const featuredProducts = featuredData || [];

  // 5. Derive available filter options dynamically from active products

  const allActive = allActiveData || [];

  const availableOptions: AvailableFilterOptions = {
    categories: activeCategories,
    brands: Array.from(new Set(allActive.map(p => p.brand).filter(Boolean))),
    colors: Array.from(new Set(allActive.map(p => p.color).filter(Boolean))),
    fabrics: Array.from(new Set(allActive.map(p => p.fabric).filter(Boolean))),
    genders: Array.from(new Set(allActive.map(p => p.gender).filter(Boolean))),
    fits: Array.from(new Set(allActive.map(p => p.fit).filter(Boolean))),
    occasions: Array.from(new Set(allActive.map(p => p.occasion).filter(Boolean))),
    types: Array.from(new Set(allActive.map(p => p.product_type).filter(Boolean))),
    sizes: Array.from(
      new Set(
        allActive.flatMap(p =>
          (p.inventory || [])
            .filter((i: { available_quantity: number; size: string | null }) => i.available_quantity > 0)
            .map((i: { available_quantity: number; size: string | null }) => i.size)
        ).filter((size: string | null): size is string => Boolean(size))
      )
    ),
    minPrice: allActive.length ? Math.min(...allActive.map(p => p.price)) : 0,
    maxPrice: allActive.length ? Math.max(...allActive.map(p => p.price)) : 5000
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between font-sans">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-10 sm:space-y-14">
          
          {/* Top Promotional Sale Banner (Redirects to /sale/[slug]) */}
          {homepageBannerCampaign && (
            <CampaignBanner campaign={homepageBannerCampaign} />
          )}

          {/* Active categories only; names come directly from storefront configuration. */}
          {homepageCategories.length > 0 && (
            <section aria-labelledby="shop-by-category-heading" className="space-y-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600">Browse collections</p>
                  <h2 id="shop-by-category-heading" className="mt-1 text-2xl font-black tracking-tight text-indigo-950 sm:text-3xl">
                    Shop by Category
                  </h2>
                </div>
                <a href="#all-products" className="hidden items-center gap-1 text-xs font-bold text-indigo-900 hover:text-orange-600 sm:flex">
                  View catalog <ArrowRight size={14} />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {homepageCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${encodeURIComponent(category.name)}`}
                    className={`group relative flex min-h-28 overflow-hidden rounded-2xl border bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md ${
                      category.homepage_featured
                        ? 'col-span-2 min-h-36 border-orange-200 sm:col-span-2 lg:col-span-2'
                        : 'border-indigo-100'
                    }`}
                  >
                    {category.homepage_image_url && (
                      <Image
                        src={category.homepage_image_url}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 33vw"
                        className="absolute inset-0 size-full object-cover"
                      />
                    )}
                    {category.homepage_image_url && <span className="absolute inset-0 bg-gradient-to-t from-indigo-950/90 via-indigo-950/30 to-transparent" />}
                    <span className="relative z-10 flex size-full flex-col justify-between">
                      <ShoppingBag
                        size={22}
                        className={category.homepage_image_url ? 'text-white' : 'text-orange-500'}
                        aria-hidden="true"
                      />
                      <span className={`flex items-end justify-between gap-2 text-sm font-black ${category.homepage_image_url ? 'text-white' : 'text-indigo-950'}`}>
                        {category.name}
                        <ArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {featuredProducts.length > 0 && (
            <section aria-labelledby="featured-products-heading" className="space-y-5 rounded-3xl bg-indigo-950 px-4 py-7 sm:px-6 sm:py-9">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-400">From our active catalog</p>
                  <h2 id="featured-products-heading" className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                    Featured Products
                  </h2>
                  <p className="mt-1 text-xs text-indigo-200">A selection of recently added active products.</p>
                </div>
                <a href="#all-products" className="inline-flex items-center gap-1 text-xs font-bold text-orange-300 hover:text-white">
                  Browse all products <ArrowRight size={14} />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {featuredProducts.map((product) => (
                  <ProductCard key={`featured-${product.id}`} product={product} activeCampaigns={activeCampaigns} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="why-shop-heading" className="space-y-5">
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600">Clear buying experience</p>
              <h2 id="why-shop-heading" className="mt-1 text-2xl font-black tracking-tight text-indigo-950 sm:text-3xl">Why Shop With Us</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { title: 'Secure Checkout', detail: 'Complete your purchase through the existing checkout flow.', icon: LockKeyhole },
                { title: 'GST Invoice', detail: 'Order records support GST invoice information.', icon: ReceiptText },
                { title: 'PIN-code Check', detail: 'Verify delivery availability for your PIN code.', icon: MapPinCheck },
                { title: 'Clear Summary', detail: 'Review item and order totals before confirmation.', icon: FileText },
                { title: 'Order Tracking', detail: 'View your placed orders from the orders page.', icon: PackageSearch },
              ].map(({ title, detail, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-black text-indigo-950">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">{detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="customer-help-heading" className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600">Customer help</p>
                <h2 id="customer-help-heading" className="mt-1 text-xl font-black text-indigo-950 sm:text-2xl">Orders, policies and support</h2>
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-gray-500">Use these customer pages to view orders and read our store policies.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/orders" className="rounded-xl bg-indigo-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-900">View Orders</Link>
                <Link href="/privacy-policy" className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 transition hover:border-indigo-300">Privacy Policy</Link>
                <Link href="/terms" className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 transition hover:border-indigo-300">Terms</Link>
              </div>
            </div>
          </section>

          <HomepageSellerTrust />

          {/* Main Layout: Left Sidebar Filters + Right Catalog Grid */}
          <section id="all-products" aria-labelledby="all-products-heading" className="scroll-mt-24">
          <div className="flex flex-col md:flex-row gap-6 pt-2">
            
            {/* Desktop & Mobile Left Filter Panel */}
            <aside className="w-full md:w-64 shrink-0">
              <ProductFilterPanel
                availableOptions={availableOptions}
                filterConfigs={filterConfigs}
              />
            </aside>

            {/* Product Catalog Grid Column */}
            <div className="flex-1 space-y-4">
              
              {/* Active Removable Chips */}
              <ActiveFilterChips />

              {/* Toolbar Bar */}
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
                <h2 id="all-products-heading" className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                  {resolvedSearchParams.category ? `${resolvedSearchParams.category} Collection` : 'All Store Products'} ({products.length} Items)
                </h2>
                <span className="text-[11px] text-gray-500 font-semibold">
                  Direct Factory Rates
                </span>
              </div>

              {/* Products Rendering */}
              {products.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-200 p-16 text-center space-y-3 shadow-xs">
                  <h3 className="text-base font-bold text-gray-800">No Products Found</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Try clearing or adjusting your selected filters and search query.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      activeCampaigns={activeCampaigns}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
          </section>
        </div>
      </div>

      <Footer categories={activeCategories} />
    </main>
  );
}
