import Link from 'next/link';
import type { ComponentType } from 'react';
import {
  Activity,
  BarChart3,
  Camera,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Globe2,
  History,
  LineChart,
  Megaphone,
  MousePointerClick,
  PauseCircle,
  PlayCircle,
  Search,
  Settings2,
  ShoppingBag,
  Target,
} from 'lucide-react';
import {
  getGoogleDashboard,
  type IntegrationResult,
} from '@/lib/google/integrations';
import GoogleAdsApprovalPanel from '@/components/admin/GoogleAdsApprovalPanel';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

function statusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'ENABLED' || normalized === 'ACTIVE') return 'bg-emerald-50 text-emerald-700';
  if (normalized === 'PAUSED') return 'bg-amber-50 text-amber-700';
  if (normalized === 'REMOVED' || normalized === 'ENDED') return 'bg-stone-100 text-stone-600';
  return 'bg-stone-100 text-stone-600';
}

export default async function AdsConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const params = await searchParams;
  const platform = params.platform === 'meta' ? 'meta' : 'google';

  const google = await getGoogleDashboard();
  const supabase = await createServerSupabaseClient();

  const { data: auditRows } = await supabase
    .from('google_ads_audit_logs')
    .select('id,action,created_at,before_state,after_state,metadata')
    .order('created_at', { ascending: false })
    .limit(10);

  const metaToken = hasAny('META_SYSTEM_USER_ACCESS_TOKEN', 'META_ACCESS_TOKEN', 'META_GRAPH_ACCESS_TOKEN', 'FACEBOOK_ACCESS_TOKEN');
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

  const googleConnections: Connection[] = [
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
      detail: resultDetail(google.merchant, 'Live Merchant API product status loaded successfully.'),
      category: 'Google',
      icon: ShoppingBag,
    },
    {
      name: 'Search Console',
      subtitle: 'Organic clicks, impressions, CTR and search queries',
      connected: google.searchConsole.ok,
      detail: resultDetail(google.searchConsole, 'Live Search Console performance data loaded successfully.'),
      category: 'Google',
      icon: Search,
    },
  ];

  const metaConnections: Connection[] = [
    {
      name: 'Meta Ads',
      subtitle: 'Facebook and Instagram campaign management',
      connected: metaToken && metaAdAccount,
      detail: metaToken && metaAdAccount ? 'Meta Ads configuration detected.' : 'Meta Ads setup is pending.',
      category: 'Meta',
      icon: Megaphone,
    },
    {
      name: 'Facebook Page',
      subtitle: 'Page identity and Meta business connection',
      connected: metaToken && metaPage,
      detail: metaToken && metaPage ? 'Facebook Page configuration detected.' : 'Facebook Page connection is pending.',
      category: 'Meta',
      icon: Globe2,
    },
    {
      name: 'Instagram Business',
      subtitle: 'Instagram professional account linked through Meta',
      connected: metaToken && instagram,
      detail: metaToken && instagram ? 'Instagram Business configuration detected.' : 'Instagram Business connection is pending.',
      category: 'Meta',
      icon: Camera,
    },
    {
      name: 'Meta Pixel / CAPI',
      subtitle: 'Website events: view, cart, checkout and purchase',
      connected: metaPixel,
      detail: metaPixel ? 'Meta Pixel configuration detected.' : 'Pixel/CAPI setup is pending.',
      category: 'Website',
      icon: MousePointerClick,
    },
  ];

  const ads = google.ads.ok ? google.ads.data : null;
  const ga4 = google.ga4.ok ? google.ga4.data : null;
  const search = google.searchConsole.ok ? google.searchConsole.data : null;
  const merchant = google.merchant.ok ? google.merchant.data : null;
  const costPerConversion = ads && ads.conversions > 0 ? ads.spend / ads.conversions : null;
  const roas = ads && ads.spend > 0 ? ads.conversionValue / ads.spend : null;

  const currentConnections = platform === 'google' ? googleConnections : metaConnections;
  const connectedCount = currentConnections.filter((item) => item.connected).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#fff7e8] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#8a5a20]">
            <Activity size={13} />
            Advertising Control Centre
          </div>
          <h1 className="text-2xl font-black text-[#5e171b] md:text-3xl">Ads Control Center</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500">
            Manage Google and Meta advertising from one admin page. Live spend changes remain approval-gated.
          </p>
        </div>

        <div className="rounded-2xl border border-[#ead8b8] bg-[#fffdf9] px-5 py-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">Selected platform health</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#741f23]">{connectedCount}</span>
            <span className="text-xs font-bold text-stone-500">of {currentConnections.length} ready</span>
          </div>
          {platform === 'google' && (
            <div className="mt-1 text-[10px] text-stone-400">
              Google OAuth {googleConfigured ? 'configured' : 'incomplete'}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-2 shadow-sm">
        <Link
          href="/admin/ads?platform=google"
          className={
            'flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ' +
            (platform === 'google' ? 'bg-[#741f23] text-white shadow-sm' : 'bg-white text-[#741f23]')
          }
        >
          <Target size={17} /> Google Ads
        </Link>
        <Link
          href="/admin/ads?platform=meta"
          className={
            'flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ' +
            (platform === 'meta' ? 'bg-[#741f23] text-white shadow-sm' : 'bg-white text-[#741f23]')
          }
        >
          <Megaphone size={17} /> Meta Ads
        </Link>
      </div>

      {platform === 'google' ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Google Ad Spend', ads ? money(ads.spend) : '—', 'Last 30 days'],
              ['Conversion Value', ads ? money(ads.conversionValue) : '—', 'Google Ads attribution'],
              ['Cost / Conversion', costPerConversion !== null ? money(costPerConversion) : '—', 'Spend ÷ conversions'],
              ['ROAS', roas !== null ? roas.toFixed(2) + 'x' : '—', 'Conversion value ÷ spend'],
            ].map(([label, value, note]) => (
              <div key={label} className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">{label}</div>
                <div className="mt-2 text-2xl font-black text-[#5e171b]">{value}</div>
                <div className="mt-1 text-[11px] text-stone-500">{note}</div>
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-2xl border border-[#ead8b8] bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[#ead8b8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-black text-[#5e171b]">All Google Ads campaigns</h2>
                <p className="text-[11px] text-stone-500">
                  Live campaign status and last-30-day performance. Pause/resume and budget writes will use the approval executor.
                </p>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-black text-stone-600">
                {ads?.campaigns.length ?? 0} campaigns
              </span>
            </div>

            {ads && ads.campaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-400">
                    <tr>
                      <th className="px-4 py-3">Campaign</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Daily budget</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3 text-right">Spend</th>
                      <th className="px-4 py-3 text-right">Clicks</th>
                      <th className="px-4 py-3 text-right">Conv.</th>
                      <th className="px-4 py-3 text-right">CPA</th>
                      <th className="px-4 py-3 text-right">ROAS</th>
                      <th className="px-4 py-3">Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ads.campaigns.map((campaign) => {
                      const campaignCpa = campaign.conversions > 0 ? campaign.cost / campaign.conversions : null;
                      const campaignRoas = campaign.cost > 0 ? campaign.conversionValue / campaign.cost : null;
                      return (
                        <tr key={campaign.id || campaign.name} className="border-t border-stone-100 align-top">
                          <td className="px-4 py-3">
                            <div className="font-bold text-stone-800">{campaign.name}</div>
                            <div className="mt-1 font-mono text-[9px] text-stone-400">ID {campaign.id}</div>
                          </td>
                          <td className="px-4 py-3 text-stone-500">{campaign.channelType.replaceAll('_', ' ')}</td>
                          <td className="px-4 py-3">
                            <span className={'rounded-lg px-2 py-1 text-[10px] font-black ' + statusClass(campaign.status)}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold">{campaign.dailyBudget ? money(campaign.dailyBudget) : '—'}</td>
                          <td className="px-4 py-3 text-[10px] text-stone-500">
                            <div>{campaign.startDate || '—'}</div>
                            <div>to {campaign.endDate || 'No fixed end'}</div>
                          </td>
                          <td className="px-4 py-3 text-right">{money(campaign.cost)}</td>
                          <td className="px-4 py-3 text-right">{compact(campaign.clicks)}</td>
                          <td className="px-4 py-3 text-right">{compact(campaign.conversions)}</td>
                          <td className="px-4 py-3 text-right">{campaignCpa !== null ? money(campaignCpa) : '—'}</td>
                          <td className="px-4 py-3 text-right">{campaignRoas !== null ? campaignRoas.toFixed(2) + 'x' : '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-[150px] flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled
                                title="Write executor is approval-gated and not enabled yet"
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-[10px] font-bold text-stone-400"
                              >
                                {campaign.status.toUpperCase() === 'PAUSED' ? <PlayCircle size={12} /> : <PauseCircle size={12} />}
                                {campaign.status.toUpperCase() === 'PAUSED' ? 'Resume' : 'Pause'}
                              </button>
                              <button
                                type="button"
                                disabled
                                title="Budget editing will use the approval executor"
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-[10px] font-bold text-stone-400"
                              >
                                <Settings2 size={12} /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-xs text-stone-500">
                {google.ads.ok ? 'No campaigns returned by Google Ads.' : google.ads.error}
              </div>
            )}
          </section>

          <div id="google-proposal">
            <GoogleAdsApprovalPanel />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <LineChart size={17} className="text-[#741f23]" />
                <h2 className="text-sm font-black text-[#5e171b]">GA4 + organic search</h2>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  ['Active users', ga4 ? compact(ga4.activeUsers) : '—'],
                  ['Sessions', ga4 ? compact(ga4.sessions) : '—'],
                  ['Purchases', ga4 ? compact(ga4.ecommercePurchases) : '—'],
                  ['Revenue', ga4 ? money(ga4.purchaseRevenue) : '—'],
                  ['Search clicks', search ? compact(search.clicks) : '—'],
                  ['Search impressions', search ? compact(search.impressions) : '—'],
                  ['Search CTR', search ? percent(search.ctr) : '—'],
                  ['Avg. position', search ? search.position.toFixed(1) : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-stone-50 px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-wider text-stone-400">{label}</div>
                    <div className="mt-1 text-base font-black text-stone-800">{value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShoppingBag size={17} className="text-[#741f23]" />
                <h2 className="text-sm font-black text-[#5e171b]">Merchant Center</h2>
              </div>
              {merchant ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    ['Processed', merchant.products],
                    ['Approved', merchant.approved],
                    ['Pending', merchant.pending],
                    ['Disapproved', merchant.disapproved],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl bg-stone-50 px-3 py-3">
                      <div className="text-[9px] font-black uppercase tracking-wider text-stone-400">{label}</div>
                      <div className="mt-1 text-base font-black text-stone-800">{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-stone-500">{google.merchant.ok ? '' : google.merchant.error}</p>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-[#741f23]" />
              <div>
                <h2 className="text-sm font-black text-[#5e171b]">Google connections</h2>
                <p className="text-[11px] text-stone-500">Live API health for the Google advertising stack.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {googleConnections.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.name} className="rounded-2xl border border-[#ead8b8] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff7e8] text-[#741f23]">
                          <Icon size={17} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-stone-900">{item.name}</h3>
                          <p className="mt-1 text-[10px] leading-4 text-stone-500">{item.subtitle}</p>
                        </div>
                      </div>
                      <span className={'rounded-lg px-2 py-1 text-[9px] font-black ' + (item.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                        {item.connected ? 'Connected' : 'Attention'}
                      </span>
                    </div>
                    <div className="mt-3 border-t border-stone-100 pt-2 text-[10px] text-stone-500">{item.detail}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <History size={17} className="text-[#741f23]" />
              <h2 className="text-sm font-black text-[#5e171b]">Google Ads audit log</h2>
            </div>
            <div className="mt-4 space-y-2">
              {(auditRows ?? []).length > 0 ? (
                (auditRows ?? []).map((row) => (
                  <div key={row.id} className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xs font-black capitalize text-stone-700">{row.action.replaceAll('_', ' ')}</span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(row.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-stone-500">
                      {(row.metadata as { live_mutation_executed?: boolean } | null)?.live_mutation_executed
                        ? 'Live Google change executed'
                        : 'No live Google mutation executed'}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-500">No audit entries yet.</p>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              ['Meta Ad Spend', '—', 'Connect Meta Ads'],
              ['Purchases', '—', 'Facebook + Instagram'],
              ['Cost / Purchase', '—', 'Spend ÷ purchases'],
              ['ROAS', '—', 'Revenue ÷ spend'],
            ].map(([label, value, note]) => (
              <div key={label} className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">{label}</div>
                <div className="mt-2 text-2xl font-black text-[#5e171b]">{value}</div>
                <div className="mt-1 text-[11px] text-stone-500">{note}</div>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-[#ead8b8] bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff7e8] text-[#741f23]">
                <Megaphone size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-[#5e171b]">Meta Ads control panel</h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-stone-500">
                  Facebook and Instagram campaign controls will appear here after Meta business, ad account and Pixel/CAPI connection is complete.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                ['Campaigns', 'Running / Paused / Ended'],
                ['Controls', 'Budget · Pause · Resume · Days'],
                ['Creative', 'Facebook / Instagram preview'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-stone-50 p-4">
                  <div className="text-[9px] font-black uppercase tracking-wider text-stone-400">{label}</div>
                  <div className="mt-1 text-xs font-bold text-stone-700">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-5 shadow-sm">
            <h2 className="text-sm font-black text-[#5e171b]">Meta connections</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {metaConnections.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.name} className="rounded-2xl border border-[#ead8b8] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff7e8] text-[#741f23]">
                          <Icon size={17} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-stone-900">{item.name}</h3>
                          <p className="mt-1 text-[10px] leading-4 text-stone-500">{item.subtitle}</p>
                        </div>
                      </div>
                      <span className={'rounded-lg px-2 py-1 text-[9px] font-black ' + (item.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                        {item.connected ? 'Connected' : 'Setup pending'}
                      </span>
                    </div>
                    <div className="mt-3 border-t border-stone-100 pt-2 text-[10px] text-stone-500">{item.detail}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            <Clock3 size={14} className="mr-1 inline" />
            Meta campaign write controls are intentionally unavailable until the Meta account connection is verified.
          </div>
        </>
      )}
    </div>
  );
}
