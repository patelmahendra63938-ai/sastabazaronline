import type { ComponentType } from 'react';
import {
  Activity,
  BarChart3,
  Camera,
  CheckCircle2,
  CircleAlert,
  Globe2,
  LineChart,
  Megaphone,
  MousePointerClick,
  Search,
  ShoppingBag,
  Target,
} from 'lucide-react';
import {
  getGoogleDashboard,
  type IntegrationResult,
} from '@/lib/google/integrations';
import { registerMerchantDeveloperAction } from './actions';

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

function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function compact(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value || 0);
}

function percent(value: number) {
  return (value * 100).toFixed(1) + '%';
}

function resultDetail<T>(result: IntegrationResult<T>, success: string) {
  return result.ok ? success : result.error;
}

export default async function AdsConnectionsPage() {
  const google = await getGoogleDashboard();

  const metaToken = hasAny('META_ACCESS_TOKEN', 'META_GRAPH_ACCESS_TOKEN', 'FACEBOOK_ACCESS_TOKEN');
  const metaAdAccount = hasAny('META_AD_ACCOUNT_ID', 'FACEBOOK_AD_ACCOUNT_ID');
  const metaPage = hasAny('META_PAGE_ID', 'FACEBOOK_PAGE_ID');
  const instagram = hasAny(
    'INSTAGRAM_BUSINESS_ACCOUNT_ID',
    'INSTAGRAM_ACCOUNT_ID',
    'META_INSTAGRAM_ACCOUNT_ID'
  );
  const metaPixel = hasAny('NEXT_PUBLIC_META_PIXEL_ID', 'META_PIXEL_ID', 'FACEBOOK_PIXEL_ID');

  const googleConfigured =
    hasAny('GOOGLE_CLIENT_ID') &&
    hasAny('GOOGLE_CLIENT_SECRET') &&
    hasAny('GOOGLE_ADS_REFRESH_TOKEN');

  const connections: Connection[] = [
    {
      name: 'Meta Ads',
      subtitle: 'Campaigns, ad sets, ads, spend, purchases and ROAS',
      connected: metaToken && metaAdAccount,
      detail: metaToken && metaAdAccount
        ? 'Meta token and ad account configuration detected.'
        : 'Meta setup is pending.',
      category: 'Meta',
      icon: Megaphone,
    },
    {
      name: 'Facebook Page',
      subtitle: 'Page identity and Meta business connection',
      connected: metaToken && metaPage,
      detail: metaToken && metaPage
        ? 'Facebook Page configuration detected.'
        : 'Facebook Page connection is pending.',
      category: 'Meta',
      icon: Globe2,
    },
    {
      name: 'Instagram Business',
      subtitle: 'Instagram professional account linked through Meta',
      connected: metaToken && instagram,
      detail: metaToken && instagram
        ? 'Instagram Business configuration detected.'
        : 'Instagram Business connection is pending.',
      category: 'Meta',
      icon: Camera,
    },
    {
      name: 'Meta Pixel / CAPI',
      subtitle: 'Website events: view, cart, checkout and purchase',
      connected: metaPixel,
      detail: metaPixel
        ? 'Meta Pixel configuration detected.'
        : 'Pixel/CAPI setup is pending.',
      category: 'Website',
      icon: MousePointerClick,
    },
    {
      name: 'Google Ads',
      subtitle: 'Campaigns, spend, clicks, conversions and conversion value',
      connected: google.ads.ok,
      detail: resultDetail(google.ads, 'Live Google Ads API data loaded successfully.'),
      category: 'Google',
      icon: Target,
    },
    {
      name: 'Google Analytics 4',
      subtitle: 'Users, sessions, ecommerce purchases and revenue',
      connected: google.ga4.ok,
      detail: resultDetail(google.ga4, 'Live GA4 Data API report loaded successfully.'),
      category: 'Google',
      icon: LineChart,
    },
    {
      name: 'Google Merchant Center',
      subtitle: 'Processed products and approval health',
      connected: google.merchant.ok,
      detail: resultDetail(
        google.merchant,
        'Live Merchant API product status loaded successfully.'
      ),
      category: 'Google',
      icon: ShoppingBag,
    },
    {
      name: 'Search Console',
      subtitle: 'Organic clicks, impressions, CTR and search queries',
      connected: google.searchConsole.ok,
      detail: resultDetail(
        google.searchConsole,
        'Live Search Console performance data loaded successfully.'
      ),
      category: 'Google',
      icon: Search,
    },
  ];

  const ads = google.ads.ok ? google.ads.data : null;
  const ga4 = google.ga4.ok ? google.ga4.data : null;
  const search = google.searchConsole.ok ? google.searchConsole.data : null;
  const merchant = google.merchant.ok ? google.merchant.data : null;

  const costPerConversion =
    ads && ads.conversions > 0 ? ads.spend / ads.conversions : null;
  const roas = ads && ads.spend > 0 ? ads.conversionValue / ads.spend : null;
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
            Google data below is read live from Google Ads, GA4, Search Console and
            Merchant Center. Meta remains separate until its verification is complete.
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
          <div className="mt-1 text-[10px] text-stone-400">
            OAuth {googleConfigured ? 'configured' : 'incomplete'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Google Ad Spend', ads ? money(ads.spend) : '—', 'Last 30 days'],
          ['Google Conversion Value', ads ? money(ads.conversionValue) : '—', 'Ads attribution'],
          ['Cost / Conversion', costPerConversion !== null ? money(costPerConversion) : '—', 'Spend ÷ conversions'],
          ['Google Ads ROAS', roas !== null ? roas.toFixed(2) + 'x' : '—', 'Conversion value ÷ spend'],
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
            <h2 className="text-sm font-black text-[#5e171b]">Platform health</h2>
            <p className="text-[11px] text-stone-500">
              Connected means a live API call succeeded, not only that an environment variable exists.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {connections.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.name} className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
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
                    className={
                      'inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black ' +
                      (item.connected
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700')
                    }
                  >
                    {item.connected ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
                    {item.connected ? 'Connected' : 'Needs attention'}
                  </span>
                </div>
                <div className="mt-4 break-words border-t border-stone-100 pt-3 text-[11px] text-stone-500">
                  {item.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#5e171b]">Google Analytics 4 — last 30 days</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ['Active users', ga4 ? compact(ga4.activeUsers) : '—'],
              ['Sessions', ga4 ? compact(ga4.sessions) : '—'],
              ['Purchases', ga4 ? compact(ga4.ecommercePurchases) : '—'],
              ['Purchase revenue', ga4 ? money(ga4.purchaseRevenue) : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-stone-50 px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">{label}</div>
                <div className="mt-1 text-lg font-black text-stone-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#5e171b]">Search Console — last 30 days</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ['Clicks', search ? compact(search.clicks) : '—'],
              ['Impressions', search ? compact(search.impressions) : '—'],
              ['CTR', search ? percent(search.ctr) : '—'],
              ['Avg. position', search ? search.position.toFixed(1) : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-stone-50 px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">{label}</div>
                <div className="mt-1 text-lg font-black text-stone-800">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {ads && ads.campaigns.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#ead8b8] bg-white shadow-sm">
          <div className="border-b border-[#ead8b8] px-5 py-4">
            <h2 className="text-sm font-black text-[#5e171b]">Google Ads campaigns — last 30 days</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-400">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">Impressions</th>
                  <th className="px-4 py-3 text-right">Spend</th>
                  <th className="px-4 py-3 text-right">Conversions</th>
                  <th className="px-4 py-3 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {ads.campaigns.map((campaign) => (
                  <tr key={campaign.id || campaign.name} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-bold text-stone-800">{campaign.name}</td>
                    <td className="px-4 py-3 text-stone-500">{campaign.status}</td>
                    <td className="px-4 py-3 text-right">{compact(campaign.clicks)}</td>
                    <td className="px-4 py-3 text-right">{compact(campaign.impressions)}</td>
                    <td className="px-4 py-3 text-right">{money(campaign.cost)}</td>
                    <td className="px-4 py-3 text-right">{compact(campaign.conversions)}</td>
                    <td className="px-4 py-3 text-right">{money(campaign.conversionValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#5e171b]">Top organic Google searches</h2>
          <div className="mt-4 space-y-2">
            {search && search.topQueries.length > 0 ? (
              search.topQueries.map((row) => (
                <div key={row.query} className="flex items-center justify-between gap-4 rounded-xl bg-stone-50 px-3 py-2.5">
                  <span className="truncate text-xs font-semibold text-stone-700">{row.query}</span>
                  <span className="shrink-0 text-[11px] font-bold text-stone-500">
                    {row.clicks} clicks · {row.impressions} impressions
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-stone-500">No query data available yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#5e171b]">Merchant Center</h2>
          {merchant ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ['Processed products', merchant.products],
                ['Approved', merchant.approved],
                ['Pending', merchant.pending],
                ['Disapproved', merchant.disapproved],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-stone-50 px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">{label}</div>
                  <div className="mt-1 text-lg font-black text-stone-800">{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-xs leading-5 text-stone-500">
                Merchant API could not load. If this is the first live call, complete the one-time Google Cloud project registration below.
              </p>
              <form action={registerMerchantDeveloperAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  name="developerEmail"
                  required
                  placeholder="Google account email"
                  className="min-w-0 flex-1 rounded-xl border border-[#ead8b8] px-3 py-2 text-xs outline-none focus:border-[#741f23]"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#741f23] px-4 py-2 text-xs font-black text-white"
                >
                  Register Merchant API
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
