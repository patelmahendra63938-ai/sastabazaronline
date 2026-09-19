import Link from 'next/link';
import type { ComponentType } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Camera,
  Globe2,
  LineChart,
  Megaphone,
  MousePointerClick,
  Search,
  ShoppingBag,
  Target,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type Connection = {
  name: string;
  subtitle: string;
  connected: boolean;
  detail: string;
  category: 'Meta' | 'Google' | 'Website';
  icon: ComponentType<{ size?: number; className?: string }>;
};

function hasAny(...names: string[]) {
  return names.some((name) => Boolean(process.env[name]));
}

export default function AdsConnectionsPage() {
  const metaToken = hasAny(
    'META_ACCESS_TOKEN',
    'META_GRAPH_ACCESS_TOKEN',
    'FACEBOOK_ACCESS_TOKEN'
  );

  const metaAdAccount = hasAny(
    'META_AD_ACCOUNT_ID',
    'FACEBOOK_AD_ACCOUNT_ID'
  );

  const metaPage = hasAny(
    'META_PAGE_ID',
    'FACEBOOK_PAGE_ID'
  );

  const instagram = hasAny(
    'INSTAGRAM_BUSINESS_ACCOUNT_ID',
    'INSTAGRAM_ACCOUNT_ID',
    'META_INSTAGRAM_ACCOUNT_ID'
  );

  const metaPixel = hasAny(
    'NEXT_PUBLIC_META_PIXEL_ID',
    'META_PIXEL_ID',
    'FACEBOOK_PIXEL_ID'
  );

  const googleOauth = hasAny(
    'GOOGLE_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_ID'
  ) && hasAny(
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_OAUTH_CLIENT_SECRET'
  );

  const googleAds = googleOauth && hasAny(
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
    'GOOGLE_ADS_LOGIN_CUSTOMER_ID'
  );

  const ga4 = hasAny(
    'NEXT_PUBLIC_GA_MEASUREMENT_ID',
    'NEXT_PUBLIC_GA4_MEASUREMENT_ID',
    'GA4_PROPERTY_ID',
    'GOOGLE_ANALYTICS_PROPERTY_ID'
  );

  const merchant = true; // Product feed is already active in this project.

  const connections: Connection[] = [
    {
      name: 'Meta Ads',
      subtitle: 'Campaigns, ad sets, ads, spend, purchases and ROAS',
      connected: metaToken && metaAdAccount,
      detail: metaToken && metaAdAccount
        ? 'Meta token and ad account configuration detected.'
        : 'Needs Meta access token and ad account ID.',
      category: 'Meta',
      icon: Megaphone,
    },
    {
      name: 'Facebook Page',
      subtitle: 'Page identity and Meta business connection',
      connected: metaToken && metaPage,
      detail: metaToken && metaPage
        ? 'Facebook Page connection configuration detected.'
        : 'Needs Facebook/Meta Page ID.',
      category: 'Meta',
      icon: Globe2,
    },
    {
      name: 'Instagram Business',
      subtitle: 'Instagram professional account linked through Meta',
      connected: metaToken && instagram,
      detail: metaToken && instagram
        ? 'Instagram business account configuration detected.'
        : 'Needs Instagram Business Account ID.',
      category: 'Meta',
      icon: Camera,
    },
    {
      name: 'Meta Pixel / CAPI',
      subtitle: 'Website events: view, cart, checkout and purchase',
      connected: metaPixel,
      detail: metaPixel
        ? 'Meta Pixel configuration detected.'
        : 'Pixel ID is not detected in the server environment.',
      category: 'Website',
      icon: MousePointerClick,
    },
    {
      name: 'Google Ads',
      subtitle: 'Campaigns, keywords, spend, conversions and ROAS',
      connected: googleAds,
      detail: googleAds
        ? 'Google Ads API/OAuth configuration detected.'
        : 'Needs Google OAuth plus Google Ads API credentials.',
      category: 'Google',
      icon: Target,
    },
    {
      name: 'Google Analytics 4',
      subtitle: 'Traffic, sessions, ecommerce and conversion events',
      connected: ga4,
      detail: ga4
        ? 'GA4 configuration detected.'
        : 'GA4 measurement/property configuration not detected.',
      category: 'Google',
      icon: LineChart,
    },
    {
      name: 'Google Merchant Center',
      subtitle: 'Product feed used by Shopping and free listings',
      connected: merchant,
      detail: 'Dynamic product feed is available from the website.',
      category: 'Google',
      icon: ShoppingBag,
    },
    {
      name: 'Search Console',
      subtitle: 'Organic search clicks, impressions and indexing',
      connected: googleOauth && hasAny(
        'GOOGLE_SEARCH_CONSOLE_SITE_URL',
        'SEARCH_CONSOLE_SITE_URL'
      ),
      detail: googleOauth
        ? 'Google OAuth is available; site property can be linked.'
        : 'Needs Google OAuth credentials before API access.',
      category: 'Google',
      icon: Search,
    },
  ];

  const connectedCount = connections.filter((item) => item.connected).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#fff7e8] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#8a5a20]">
            <Activity size={13} />
            Advertising Control Centre
          </div>
          <h1 className="text-2xl font-black text-[#5e171b] md:text-3xl">
            Ads & Connections
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500">
            One place for website advertising data, Meta Ads, Facebook, Instagram,
            Google Ads, Analytics, Merchant Center and Search Console.
          </p>
        </div>

        <div className="rounded-2xl border border-[#ead8b8] bg-[#fffdf9] px-5 py-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">
            Connection status
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#741f23]">{connectedCount}</span>
            <span className="text-xs font-bold text-stone-500">of {connections.length} ready</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Ad Spend', '₹0', 'Connect ad APIs to populate'],
          ['Revenue from Ads', '₹0', 'Website attribution'],
          ['Cost / Order', '—', 'Spend ÷ attributed orders'],
          ['ROAS', '—', 'Revenue ÷ ad spend'],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">
              {label}
            </div>
            <div className="mt-2 text-2xl font-black text-[#5e171b]">{value}</div>
            <div className="mt-1 text-[11px] text-stone-500">{note}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-[#741f23]" />
          <div>
            <h2 className="text-sm font-black text-[#5e171b]">Connected Platforms</h2>
            <p className="text-[11px] text-stone-500">
              Secrets are never displayed here. This page only reports whether required configuration is present.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {connections.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff7e8] text-[#741f23]">
                      <Icon size={19} />
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 text-[9px] font-black uppercase tracking-[0.15em] text-stone-400">
                        {item.category}
                      </div>
                      <h3 className="text-sm font-black text-stone-900">{item.name}</h3>
                      <p className="mt-1 text-[11px] leading-5 text-stone-500">{item.subtitle}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black ${
                      item.connected
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {item.connected ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <CircleAlert size={13} />
                    )}
                    {item.connected ? 'Connected' : 'Setup needed'}
                  </span>
                </div>

                <div className="mt-4 border-t border-stone-100 pt-3 text-[11px] text-stone-500">
                  {item.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#5e171b]">What this page will show next</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            {[
              'Campaign spend',
              'Impressions',
              'Clicks & CTR',
              'CPC / CPM',
              'Website purchases',
              'Cost per purchase',
              'Revenue by channel',
              'ROAS by campaign',
            ].map((item) => (
              <div key={item} className="rounded-xl bg-stone-50 px-3 py-2.5 font-semibold text-stone-600">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#ead8b8] bg-[#5e171b] p-5 text-white shadow-sm">
          <h2 className="text-sm font-black">Connection principle</h2>
          <p className="mt-2 text-xs leading-5 text-[#f5e8d6]">
            Ad account credentials stay server-side. The admin dashboard reads
            platform data through secure API routes and combines it with website
            orders to calculate real cost per order and ROAS.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/integrations"
              className="rounded-xl bg-[#d7aa5b] px-4 py-2 text-xs font-black text-[#5e171b]"
            >
              General Integrations
            </Link>
            <Link
              href="/admin/dashboard"
              className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold text-white"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
