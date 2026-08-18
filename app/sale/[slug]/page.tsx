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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: campaign } = await supabase
    .from('promotions')
    .select('name, seo_title, seo_description, discount_value, discount_type')
    .eq('slug', slug)
    .maybeSingle();

  if (!campaign) {
    return { title: 'Offer Expired | SASTABAZARONLINE' };
  }

  const discountText =
    campaign.discount_type === 'PERCENTAGE'
      ? `${campaign.discount_value}% OFF`
      : `₹${campaign.discount_value} OFF`;

  return {
    title: campaign.seo_title || `${campaign.name} (${discountText}) – SASTABAZARONLINE`,
    description:
      campaign.seo_description ||
      `Shop the official ${campaign.name} with up to ${discountText} at SASTABAZARONLINE.`,
  };
}

export default async function SaleLandingPage({ params }: PageProps) {
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
      <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between font-sans">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-24 flex-1 text-center space-y-6">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-3xl mx-auto flex items-center justify-center shadow-sm">
            <Sparkles size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-indigo-950 uppercase tracking-wide">
            Promotion Has Ended
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
            This sale campaign is no longer active. You can browse our current catalog or check other ongoing seasonal offers on SASTABAZARONLINE.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-950 hover:bg-indigo-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg"
            >
              <ArrowLeft size={16} /> Return to Storefront
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // 3. Query participating products based on campaign targeting rules
  let query = supabase.from('products').select('*').eq('is_active', true);

  if (campaign.target_category && campaign.target_category.toUpperCase() !== 'ALL') {
    query = query.eq('category', campaign.target_category);
  }
  if (campaign.target_product_id) {
    query = query.eq('id', campaign.target_product_id);
  }

  const { data: products } = await query.order('created_at', { ascending: false });
  const activeCampaigns = getActiveCampaigns([campaign]);

  return (
    <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between font-sans">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
          {/* Breadcrumbs Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/" className="hover:text-indigo-950 font-bold transition">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-400">Promotions</span>
            <span>/</span>
            <span className="text-gray-800 font-bold">{campaign.name}</span>
          </nav>

          {/* Clickable Promotional Banner with Countdown */}
          <CampaignBanner campaign={campaign} />

          {/* Catalog Header & Filter Badge */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/80 pb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag size={22} className="text-orange-500" />
                  {campaign.name} Catalog
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  {campaign.target_category && campaign.target_category.toUpperCase() !== 'ALL'
                    ? `Exclusive prices for ${campaign.target_category} items`
                    : 'Store-wide promotional discounts applied automatically'}
                </p>
              </div>

              <span className="self-start sm:self-auto bg-green-50 text-green-700 border border-green-200 px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs">
                <Tag size={13} />
                {campaign.discount_type === 'PERCENTAGE'
                  ? `${campaign.discount_value}% OFF ACTIVE`
                  : `₹${campaign.discount_value} OFF ACTIVE`}
              </span>
            </div>

            {/* Product Grid */}
            {!products || products.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-200 p-16 text-center text-gray-500 text-xs shadow-sm">
                No active products currently found for this promotion.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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

      <Footer />
    </main>
  );
}