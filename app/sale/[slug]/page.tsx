import React from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CampaignBanner from '@/components/promotions/CampaignBanner';
import { getActiveCampaigns, Campaign } from '@/lib/promotions';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Tag, ShoppingBag } from 'lucide-react';
import { Metadata } from 'next';

// Forces runtime server-rendering and bypasses static build-time prerendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const { data: campaign } = await supabase
    .from('promotions')
    .select(
      'name, seo_title, seo_description, discount_value, discount_type'
    )
    .eq('slug', slug)
    .maybeSingle();

  if (!campaign) {
    return {
      title: 'Offer Expired | ADHYEY BROTHERS',
    };
  }

  const discountText =
    campaign.discount_type === 'PERCENTAGE'
      ? `${campaign.discount_value}% OFF`
      : `₹${campaign.discount_value} OFF`;

  return {
    title:
      campaign.seo_title ||
      `${campaign.name} (${discountText}) – ADHYEY BROTHERS`,

    description:
      campaign.seo_description ||
      `Shop the official ${campaign.name} with up to ${discountText} at ADHYEY BROTHERS.`,
  };
}

export default async function SaleLandingPage({
  params,
}: PageProps) {
  const { slug } = await params;

  // 1. Fetch promotion record from Supabase
  const { data: rawCampaign } = await supabase
    .from('promotions')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  const campaign = rawCampaign as Campaign | null;

  const now = new Date().getTime();

  const isLive = Boolean(
    campaign &&
      campaign.is_enabled &&
      new Date(campaign.start_at).getTime() <= now &&
      new Date(campaign.end_at).getTime() > now
  );

  // 2. Expired / Inactive Fallback View
  if (!campaign || !isLive) {
    return (
      <main className="flex min-h-screen flex-col justify-between bg-[#fffaf5] font-sans">
        <Header />

        <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center space-y-6 px-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[#ead8b8] bg-[#fff7e8] text-[#b5843d] shadow-sm">
            <Sparkles size={32} />
          </div>

          <h1 className="text-2xl font-black uppercase tracking-wide text-[#741f23] sm:text-3xl">
            Promotion Has Ended
          </h1>

          <p className="mx-auto max-w-md text-xs leading-relaxed text-gray-500 sm:text-sm">
            This sale campaign is no longer active. You can browse our
            current catalog or check other ongoing seasonal offers on
            ADHYEY BROTHERS.
          </p>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#741f23] px-8 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-[#5e171b]"
            >
              <ArrowLeft size={16} />
              Return to Storefront
            </Link>
          </div>
        </div>

        <Footer />
      </main>
    );
  }

  // 3. Query participating products based on campaign targeting rules
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_active', true);

  if (
    campaign.target_category &&
    campaign.target_category.toUpperCase() !== 'ALL'
  ) {
    query = query.eq(
      'category',
      campaign.target_category
    );
  }

  if (campaign.target_product_id) {
    query = query.eq(
      'id',
      campaign.target_product_id
    );
  }

  const { data: products } = await query.order(
    'created_at',
    {
      ascending: false,
    }
  );

  const activeCampaigns =
    getActiveCampaigns([campaign]);

  return (
    <main className="flex min-h-screen flex-col justify-between bg-[#fffaf5] font-sans">
      <div>
        <Header />

        <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
          {/* Breadcrumbs Navigation */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-gray-500"
          >
            <Link
              href="/"
              className="font-bold transition hover:text-[#741f23]"
            >
              Home
            </Link>

            <span>/</span>
            <span className="text-gray-400">
              Promotions
            </span>

            <span>/</span>

            <span className="font-bold text-gray-800">
              {campaign.name}
            </span>
          </nav>

          {/* Clickable Promotional Banner with Countdown */}
          <CampaignBanner campaign={campaign} />

          {/* Catalog Header & Filter Badge */}
          <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 border-b border-[#ead8b8] pb-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-black uppercase tracking-wider text-[#741f23] sm:text-2xl">
                  <ShoppingBag
                    size={22}
                    className="text-[#b5843d]"
                  />
                  {campaign.name} Catalog
                </h1>

                <p className="mt-1 text-xs text-gray-500">
                  {campaign.target_category &&
                  campaign.target_category.toUpperCase() !== 'ALL'
                    ? `Exclusive prices for ${campaign.target_category} items`
                    : 'Store-wide promotional discounts applied automatically'}
                </p>
              </div>

              <span className="flex self-start items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3.5 py-1.5 text-xs font-black text-green-700 shadow-2xs sm:self-auto">
                <Tag size={13} />

                {campaign.discount_type === 'PERCENTAGE'
                  ? `${campaign.discount_value}% OFF ACTIVE`
                  : `₹${campaign.discount_value} OFF ACTIVE`}
              </span>
            </div>

            {/* Product Grid */}
            {!products || products.length === 0 ? (
              <div className="rounded-3xl border border-[#ead8b8] bg-white p-16 text-center text-xs text-gray-500 shadow-sm">
                No active products currently found for this promotion.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    activeCampaigns={
                      activeCampaigns
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}