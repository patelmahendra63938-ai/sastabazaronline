'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Save, SlidersHorizontal } from 'lucide-react';
import type { HomepageDisplaySettings } from '@/lib/settings/homepage-display';
import { saveHomepageDisplaySettings } from './actions';

export interface StorefrontFilterSetting {
  id: string;
  filter_key: string;
  display_name: string;
  is_enabled: boolean;
  display_order: number;
}

const controls: Array<{ key: keyof HomepageDisplaySettings; label: string; description: string }> = [
  { key: 'show_filter_panel', label: 'Main Filter Panel', description: 'OFF hides the complete filter panel. ON shows only the individual filters enabled below.' },
  { key: 'show_meesho_link', label: 'Meesho Link', description: 'Show the existing Meesho seller card.' },
  { key: 'show_amazon_link', label: 'Amazon Link', description: 'Show the existing Amazon seller card.' },
  { key: 'show_flipkart_link', label: 'Flipkart Link', description: 'Show the existing Flipkart seller card.' },
];

export default function HomepageDisplayForm({ initialValue, initialFilters }: { initialValue: HomepageDisplaySettings; initialFilters: StorefrontFilterSetting[] }) {
  const [value, setValue] = useState(initialValue);
  const [filters, setFilters] = useState(initialFilters);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const save = () => startTransition(async () => {
    setMessage(''); setError('');
    const result = await saveHomepageDisplaySettings(value, filters);
    if (result.success) setMessage('Homepage display settings saved.');
    else setError(result.error);
  });

  const toggle = (checked: boolean, label: string, onClick: () => void, disabled = false) => (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${checked ? 'bg-green-500' : 'bg-gray-300'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-6' : 'left-1'}`} />
      <span className="sr-only">{checked ? 'ON' : 'OFF'}</span>
    </button>
  );

  return <div className="space-y-5">
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}
    {message && <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-800"><CheckCircle2 size={15} />{message}</div>}
    <section className="grid gap-4 sm:grid-cols-2">
      {controls.map(control => <div key={control.key} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-black text-indigo-950">{control.label}</h2><p className="mt-2 text-xs leading-relaxed text-gray-500">{control.description}</p></div>
          {toggle(Boolean(value[control.key]), control.label, () => setValue(current => ({ ...current, [control.key]: !current[control.key] })))}
        </div><p className={`mt-4 text-[11px] font-black ${value[control.key] ? 'text-green-700' : 'text-gray-500'}`}>{value[control.key] ? 'ON' : 'OFF'}</p>
      </div>)}
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
      <h2 className="flex items-center gap-2 text-sm font-black text-indigo-950"><SlidersHorizontal size={16} />Individual Storefront Filters</h2>
      <p className="mt-1 text-xs text-gray-500">These switches apply only when Main Filter Panel is ON.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {filters.map(filter => <div key={filter.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div><p className="text-xs font-bold text-gray-900">{filter.display_name}</p><p className="text-[10px] text-gray-500">{filter.filter_key}</p></div>
          {toggle(filter.is_enabled, filter.display_name, () => setFilters(current => current.map(item => item.id === filter.id ? { ...item, is_enabled: !item.is_enabled } : item)), !value.show_filter_panel)}
        </div>)}
      </div>
    </section>

    <button type="button" onClick={save} disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-orange-600 disabled:opacity-60"><Save size={16} />{isPending ? 'Saving...' : 'Save Settings'}</button>
  </div>;
}
