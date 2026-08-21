import { AlertTriangle, Settings2, Truck } from 'lucide-react';
import ShippingSettingsForm from './ShippingSettingsForm';
import { getShippingRulesSetting } from '@/lib/settings/store-settings';

export const dynamic = 'force-dynamic';

export default async function AdminShippingPage() {
  const setting = await getShippingRulesSetting();
  const hasNimbusV2Configuration = Boolean(
    process.env.NIMBUSPOST_API_KEY &&
    process.env.NIMBUSPOST_API_SECRET &&
    /^\d{6}$/.test(process.env.NIMBUSPOST_PICKUP_PINCODE?.trim() || '')
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">Store settings</p>
        <h1 className="mt-1 text-2xl font-black text-indigo-950">Shipping Configuration</h1>
        <p className="mt-1 text-xs text-gray-500">Manage the normalized, non-secret shipping policy stored in Supabase.</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>Live customer delivery pricing uses the selected NimbusPost V2 non-COD courier cost plus the fixed 30% shipping buffer. There is no fallback when live verification fails.</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-6 flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Settings2 size={20} /></span>
            <div>
              <h2 className="text-base font-black text-indigo-950">Shipping rules</h2>
              <p className="text-[11px] text-gray-500">Version {setting.version || 1}</p>
            </div>
          </div>
          {setting.updated_at && <p className="text-[11px] text-gray-400">Last saved {new Date(setting.updated_at).toLocaleString('en-IN')}</p>}
        </div>
        <ShippingSettingsForm rules={setting.value} />
      </section>

      <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white"><Truck size={20} /></span>
          <div className="space-y-1">
            <h2 className="text-sm font-black text-gray-900">NimbusPost pricing status</h2>
            <p className="text-xs leading-relaxed text-orange-900">
              {hasNimbusV2Configuration ? 'V2 live customer pricing is configured and checkout fails closed when live verification is unavailable.' : 'Required V2 credentials or the validated pickup PIN configuration are missing.'}
            </p>
            <p className="text-[11px] text-orange-800">Shipment/AWB booking is not enabled. No credential, secret, or pickup PIN value is displayed here.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
