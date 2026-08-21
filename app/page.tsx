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
import SellerMarketplaceTrust from '@/components/trust/SellerMarketplaceTrust';
import { getActiveCampaigns, Campaign } from '@/lib/promotions';
import { getStorefrontVisibilitySetting } from '@/lib/settings/storefront-visibility';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Metadata } from 'next';

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
  const visibilitySetting = await getStorefrontVisibilitySetting();
  const visibility = visibilitySetting.value;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  // 1. Fetch active campaigns and promotions from Supabase
  const { data: rawPromotions } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_enabled', true);

  const activeCampaigns: Campaign[] = getActiveCampaigns((rawPromotions as Campaign[]) || []);
  const homepageBannerCampaign = activeCampaigns.find(c => c.is_homepage_visible) || activeCampaigns[0] || null;

  // 2. Fetch filter configurations from admin settings
  const { data: filterConfigsData } = await supabase
    .from('storefront_filter_settings')
    .select('*')
    .order('display_order', { ascending: true });

  const filterConfigs: FilterGroupConfig[] = filterConfigsData || [];

  // A disabled individual filter must be unavailable both visually and through URL parameters.
  // If the master filter switch is OFF, every storefront filter parameter is ignored.
  const isFilterEnabled = (...keys: string[]) => {
    if (!visibility.filter_panel_enabled) return false;

    const matchingConfig = filterConfigs.find(config => keys.includes(config.filter_key));
    return matchingConfig ? matchingConfig.is_enabled !== false : true;
  };

  // 3. Query active categories
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('name')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const activeCategories = (categoriesData || []).map(c => c.name);

  // 4. Build product query
  let query = supabase
    .from('products')
    .select('*, inventory(size, available_quantity)')
    .eq('is_active', true);

  if (activeCategories.length > 0) {
    query = query.in('category', activeCategories);
  }

  // Search remains independent from the filter-panel master switch.
  if (resolvedSearchParams.q) {
    query = query.ilike('title', `%${resolvedSearchParams.q}%`);
  }

  if (resolvedSearchParams.category && isFilterEnabled('category', 'categories')) {
    query = query.in('category', resolvedSearchParams.category.split(','));
  }

  if (resolvedSearchParams.brand && isFilterEnabled('brand', 'brands')) {
    query = query.in('brand', resolvedSearchParams.brand.split(','));
  }

  if (resolvedSearchParams.color && isFilterEnabled('color', 'colors')) {
    query = query.in('color', resolvedSearchParams.color.split(','));
  }

  if (resolvedSearchParams.fabric && isFilterEnabled('fabric', 'fabrics')) {
    query = query.in('fabric', resolvedSearchParams.fabric.split(','));
  }

  if (resolvedSearchParams.gender && isFilterEnabled('gender', 'genders')) {
    query = query.in('gender', resolvedSearchParams.gender.split(','));
  }

  if (resolvedSearchParams.fit && isFilterEnabled('fit', 'fits')) {
    query = query.in('fit', resolvedSearchParams.fit.split(','));
  }

  if (resolvedSearchParams.occasion && isFilterEnabled('occasion', 'occasions')) {
    query = query.in('occasion', resolvedSearchParams.occasion.split(','));
  }

  if (resolvedSearchParams.type && isFilterEnabled('type', 'product_type', 'productType')) {
    query = query.in('product_type', resolvedSearchParams.type.split(','));
  }

  if (resolvedSearchParams.minPrice && isFilterEnabled('price', 'price_range', 'priceRange')) {
    query = query.gte('price', parseFloat(resolvedSearchParams.minPrice));
  }

  if (resolvedSearchParams.maxPrice && isFilterEnabled('price', 'price_range', 'priceRange')) {
    query = query.lte('price', parseFloat(resolvedSearchParams.maxPrice));
  }

  if (resolvedSearchParams.size && isFilterEnabled('size', 'sizes')) {
    query = query
      .in('inventory.size', resolvedSearchParams.size.split(','))
      .gt('inventory.available_quantity', 0);
  }

  // Sorting remains available even when the filter panel is hidden.
  if (resolvedSearchParams.sort === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (resolvedSearchParams.sort === 'price_desc') {
    query = query.order('price', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data: productsData } = await query;
  const products = productsData || [];

  // 5. Derive available filter options dynamically from active products
  const { data: allActiveData } = await supabase
    .from('products')
    .select('brand, color, fabric, gender, fit, occasion, product_type, price, inventory(size, available_quantity)')
    .eq('is_active', true)
    .in('category', activeCategories);

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
            .filter((i: any) => i.available_quantity > 0)
            .map((i: any) => i.size)
        ).filter(Boolean)
      )
    ),
    minPrice: allActive.length ? Math.min(...allActive.map(p => p.price)) : 0,
    maxPrice: allActive.length ? Math.max(...allActive.map(p => p.price)) : 5000
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between font-sans">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {homepageBannerCampaign && (
            <CampaignBanner campaign={homepageBannerCampaign} />
          )}

          <div className="flex flex-col md:flex-row gap-6 pt-2">
            {visibility.filter_panel_enabled && (
              <aside className="w-full md:w-64 shrink-0">
                <ProductFilterPanel
                  availableOptions={availableOptions}
                  filterConfigs={filterConfigs}
                />
              </aside>
            )}

            <div className="flex-1 space-y-4">
              {visibility.filter_panel_enabled && <ActiveFilterChips />}

              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
                <h1 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                  {resolvedSearchParams.category && isFilterEnabled('category', 'categories')
                    ? `${resolvedSearchParams.category} Collection`
                    : 'All Store Products'} ({products.length} Items)
                </h1>
                <span className="text-[11px] text-gray-500 font-semibold">
                  Direct Factory Rates
                </span>
              </div>

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
        </div>

        <SellerMarketplaceTrust
          amazonUrl={visibility.marketplace_links_enabled ? process.env.NEXT_PUBLIC_SELLER_AMAZON_URL || '' : ''}
          flipkartUrl={visibility.marketplace_links_enabled ? process.env.NEXT_PUBLIC_SELLER_FLIPKART_URL || '' : ''}
          meeshoUrl={visibility.marketplace_links_enabled ? process.env.NEXT_PUBLIC_SELLER_MEESHO_URL || '' : ''}
        />
      </div>

      <Footer />
    </main>
  );
}
