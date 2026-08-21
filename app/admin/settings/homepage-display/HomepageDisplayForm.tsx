'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import type { HomepageDisplaySettings } from '@/lib/settings/homepage-display';
import { saveHomepageDisplaySettings } from './actions';

const controls: Array<{ key: keyof HomepageDisplaySettings; label: string; description: string }> = [
  { key: 'show_filter_panel', label: 'Show Filter Panel', description: 'Show the homepage filter panel and active filter chips, and apply filter URL parameters.' },
  { key: 'show_meesho_link', label: 'Meesho Link', description: 'Show the existing Meesho seller card in the marketplace trust section.' },
  { key: 'show_amazon_link', label: 'Amazon Link', description: 'Show the existing Amazon seller card in the marketplace trust section.' },
  { key: 'show_flipkart_link', label: 'Flipkart Link', description: 'Show the existing Flipkart seller card in the marketplace trust section.' },
];

export default function HomepageDisplayForm({ initialValue }: { initialValue: HomepageDisplaySettings }) {
  const [value, setValue] = useState(initialValue);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const save = () => startTransition(async () => {
    setMessage(''); setError('');
    const result = await saveHomepageDisplaySettings(value);
    if (result.success) setMessage('Homepage display settings saved.');
    else setError(result.error);
  });

  return <div className="space-y-5">
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}
    {message && <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-800"><CheckCircle2 size={15} />{message}</div>}
    <section className="grid gap-4 sm:grid-cols-2">
      {controls.map((control) => <div key={control.key} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-black text-indigo-950">{control.label}</h2><p className="mt-2 text-xs leading-relaxed text-gray-500">{control.description}</p></div>
          <button type="button" role="switch" aria-checked={value[control.key]} aria-label={control.label}
            onClick={() => setValue((current) => ({ ...current, [control.key]: !current[control.key] }))}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${value[control.key] ? 'bg-green-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${value[control.key] ? 'left-6' : 'left-1'}`} />
            <span className="sr-only">{value[control.key] ? 'ON' : 'OFF'}</span>
          </button>
        </div><p className={`mt-4 text-[11px] font-black ${value[control.key] ? 'text-green-700' : 'text-gray-500'}`}>{value[control.key] ? 'ON' : 'OFF'}</p>
      </div>)}
    </section>
    <button type="button" onClick={save} disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-orange-600 disabled:opacity-60"><Save size={16} />{isPending ? 'Saving...' : 'Save Settings'}</button>
  </div>;
}
