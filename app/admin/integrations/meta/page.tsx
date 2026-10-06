import Link from 'next/link';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

import { getMetaAdAccountSummary, getMetaWhatsAppPhones } from '@/lib/meta/ads';
import { getMetaConfigStatus } from '@/lib/meta/client';

export const dynamic = 'force-dynamic';

type ProbeResult = {
  adAccount: Awaited<ReturnType<typeof getMetaAdAccountSummary>> | null;
  phones: Awaited<ReturnType<typeof getMetaWhatsAppPhones>> | null;
  error: string | null;
};

async function probeMeta(): Promise<ProbeResult> {
  const config = getMetaConfigStatus();
  if (!config.configured) {
    return { adAccount: null, phones: null, error: null };
  }

  try {
    const [adAccount, phones] = await Promise.all([
      getMetaAdAccountSummary(),
      getMetaWhatsAppPhones(),
    ]);

    return { adAccount, phones, error: null };
  } catch (error) {
    return {
      adAccount: null,
      phones: null,
      error: error instanceof Error ? error.message : 'Meta API connection failed.',
    };
  }
}

export default async function MetaIntegrationPage() {
  const config = getMetaConfigStatus();
  const result = await probeMeta();
  const connected = config.configured && !result.error && !!result.adAccount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-[#741f23]">Direct API</p>
          <h1 className="mt-1 text-2xl font-black text-indigo-950">Meta Ads & WhatsApp</h1>
          <p className="mt-1 max-w-2xl text-xs text-gray-500">
            Server-only connection to Meta Graph API. Access tokens are read only from Vercel environment variables and are never exposed to the browser.
          </p>
        </div>
        <Link
          href="/admin/integrations"
          className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
        >
          Back to integrations
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-gray-500">Configuration</span>
            {config.configured ? <CheckCircle2 className="text-green-700" size={18} /> : <AlertCircle className="text-orange-700" size={18} />}
          </div>
          <p className="mt-3 text-lg font-black text-gray-900">
            {config.configured ? 'Ready' : 'Incomplete'}
          </p>
          {!config.configured && (
            <p className="mt-2 text-xs text-gray-500">Missing: {config.missing.join(', ')}</p>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-gray-500">Live API probe</span>
            {connected ? <CheckCircle2 className="text-green-700" size={18} /> : <AlertCircle className="text-orange-700" size={18} />}
          </div>
          <p className="mt-3 text-lg font-black text-gray-900">
            {connected ? 'Connected' : config.configured ? 'Needs attention' : 'Waiting for credentials'}
          </p>
          {result.error && <p className="mt-2 break-words text-xs text-red-700">{result.error}</p>}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-gray-500">Security boundary</span>
            <ShieldCheck className="text-indigo-700" size={18} />
          </div>
          <p className="mt-3 text-lg font-black text-gray-900">Server only</p>
          <p className="mt-2 text-xs text-gray-500">No Meta token is sent to client components or stored in Supabase.</p>
        </div>
      </div>

      {result.adAccount && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-black text-indigo-950">Meta Ad Account</h2>
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-gray-400">Name</p><p className="font-bold text-gray-900">{result.adAccount.name}</p></div>
            <div><p className="text-xs text-gray-400">Account ID</p><p className="font-mono text-xs text-gray-900">{result.adAccount.id}</p></div>
            <div><p className="text-xs text-gray-400">Currency</p><p className="font-bold text-gray-900">{result.adAccount.currency}</p></div>
            <div><p className="text-xs text-gray-400">Meta status code</p><p className="font-bold text-gray-900">{result.adAccount.account_status}</p></div>
          </div>
        </div>
      )}

      {result.phones && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-black text-indigo-950">WhatsApp Business numbers</h2>
          {result.phones.data.length === 0 ? (
            <p className="mt-3 text-xs text-gray-500">No phone numbers returned for the configured WABA.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {result.phones.data.map((phone) => (
                <div key={phone.id} className="rounded-xl border border-stone-100 bg-stone-50 p-4 text-sm">
                  <p className="font-bold text-gray-900">{phone.verified_name || 'WhatsApp Business'}</p>
                  <p className="mt-1 text-xs text-gray-600">{phone.display_phone_number || 'Phone number hidden by API response'}</p>
                  <p className="mt-1 font-mono text-[11px] text-gray-400">Phone Number ID: {phone.id}</p>
                  {phone.quality_rating && <p className="mt-1 text-xs text-gray-500">Quality: {phone.quality_rating}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-900">
        Required first: META_GRAPH_API_VERSION, META_ACCESS_TOKEN and META_AD_ACCOUNT_ID. Optional WhatsApp verification uses META_WABA_ID and META_PHONE_NUMBER_ID. Do not paste access tokens into GitHub or client-side code.
      </div>
    </div>
  );
}
