'use client';

import { useActionState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { saveShippingRules } from './actions';
import { ShippingActionState, ShippingRules } from '@/lib/settings/shipping-rules';

const INITIAL_STATE: ShippingActionState = { status: 'idle', message: '' };

function ToggleField({ name, label, description, defaultChecked }: { name: string; label: string; description: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <span>
        <span className="block text-sm font-bold text-gray-900">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-gray-500">{description}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-5 shrink-0 accent-indigo-950" />
    </label>
  );
}

function NumberField({ name, label, defaultValue, suffix }: { name: string; label: string; defaultValue: number; suffix: string }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-bold text-gray-700">{label}</span>
      <span className="flex overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-indigo-600">
        <input type="number" name={name} min={0} step="0.01" required defaultValue={defaultValue} className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none" />
        <span className="flex items-center border-l border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-500">{suffix}</span>
      </span>
    </label>
  );
}

export default function ShippingSettingsForm({ rules }: { rules: ShippingRules }) {
  const [state, formAction, pending] = useActionState(saveShippingRules, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-900">Temporary slab pricing is active until verified NimbusPost v2 live pricing is connected.</div>
      <label className="block space-y-1.5"><span className="block text-xs font-bold text-gray-700">Pricing Mode</span><input name="pricing_mode" value="temporary_slabs" readOnly className="w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm" /></label>
      <div className="grid gap-4 lg:grid-cols-2">
        <ToggleField name="free_shipping_enabled" label="Free Shipping Enabled" description="Store the free-shipping policy for the upcoming unified pricing engine." defaultChecked={rules.free_shipping_enabled} />
        <ToggleField name="apply_courier_charge" label="Apply Courier Charge" description="Controls whether the unified pricing engine should charge customers for courier delivery." defaultChecked={rules.apply_courier_charge} />
      </div>

      <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField name="free_shipping_threshold" label="Free Shipping Threshold" defaultValue={rules.free_shipping_threshold} suffix="₹" />
        <NumberField name="courier_markup_pct" label="Courier Markup" defaultValue={rules.courier_markup_pct} suffix="%" />
        <NumberField name="weight_buffer_pct" label="Weight Buffer" defaultValue={rules.weight_buffer_pct} suffix="%" />
      </div>

      <fieldset className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
        <legend className="px-1 text-sm font-black text-indigo-950">Temporary shipping slabs</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField name="shipping_slab_500g" label="Up to 500 g charge" defaultValue={rules.shipping_slab_500g} suffix="₹" />
          <NumberField name="shipping_slab_1000g" label="Up to 1 kg charge" defaultValue={rules.shipping_slab_1000g} suffix="₹" />
          <NumberField name="shipping_slab_2000g" label="Up to 2 kg charge" defaultValue={rules.shipping_slab_2000g} suffix="₹" />
          <NumberField name="temporary_max_weight_grams" label="Temporary maximum weight" defaultValue={rules.temporary_max_weight_grams} suffix="g" />
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
        <legend className="px-1 text-sm font-black text-indigo-950">COD fee rules</legend>
        <label className="block space-y-1.5">
          <span className="block text-xs font-bold text-gray-700">COD Fee Type</span>
          <select name="cod_fee_type" defaultValue={rules.cod_fee_type} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600 sm:max-w-xs">
            <option value="tiered">Tiered</option>
            <option value="flat">Flat</option>
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField name="cod_fee_flat" label="COD Flat Fee" defaultValue={rules.cod_fee_flat} suffix="₹" />
          <NumberField name="cod_fee_threshold" label="COD Threshold" defaultValue={rules.cod_fee_threshold} suffix="₹" />
          <NumberField name="cod_fee_above_threshold" label="COD Fee Above Threshold" defaultValue={rules.cod_fee_above_threshold} suffix="₹" />
        </div>
      </fieldset>

      {state.message && (
        <div role="status" className={`flex items-start gap-2 rounded-xl border p-3.5 text-xs font-semibold ${state.status === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {state.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{state.message}</span>
        </div>
      )}

      <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-950 px-5 py-3 text-xs font-bold text-white transition hover:bg-indigo-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {pending ? 'Saving settings…' : 'Save Shipping Settings'}
      </button>
    </form>
  );
}
