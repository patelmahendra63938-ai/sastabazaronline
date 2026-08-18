'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SlidersHorizontal, ArrowUp, ArrowDown, Save, CheckCircle2 } from 'lucide-react';

interface FilterSetting {
  id: string;
  filter_key: string;
  display_name: string;
  is_enabled: boolean;
  display_order: number;
}

export default function AdminFilterSettingsPage() {
  const [filters, setFilters] = useState<FilterSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('storefront_filter_settings')
      .select('*')
      .order('display_order', { ascending: true });
    setFilters(data || []);
    setLoading(false);
  };

  const handleToggle = (id: string) => {
    setFilters(prev =>
      prev.map(f => (f.id === id ? { ...f, is_enabled: !f.is_enabled } : f))
    );
  };

  const handleNameChange = (id: string, name: string) => {
    setFilters(prev =>
      prev.map(f => (f.id === id ? { ...f, display_name: name } : f))
    );
  };

  const moveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filters.length) return;

    const newArr = [...filters];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;

    const reordered = newArr.map((item, idx) => ({ ...item, display_order: idx + 1 }));
    setFilters(reordered);
  };

  const handleSave = async () => {
    setLoading(true);
    for (const item of filters) {
      await supabase
        .from('storefront_filter_settings')
        .update({
          display_name: item.display_name,
          is_enabled: item.is_enabled,
          display_order: item.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
    }
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-indigo-950 flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-orange-500" />
            Storefront Filter Configuration
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Enable, disable, rename, and reorder filter groups shown to storefront shoppers.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs"
        >
          {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saved ? 'Saved' : 'Save Filter Order'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase">
              <th className="p-4">Order</th>
              <th className="p-4">Filter Key</th>
              <th className="p-4">Display Label</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Reorder</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {filters.map((f, idx) => (
              <tr key={f.id} className="hover:bg-gray-50/80 transition">
                <td className="p-4 font-mono text-gray-400 font-bold">{f.display_order}</td>
                <td className="p-4 font-mono font-semibold text-indigo-900">{f.filter_key}</td>
                <td className="p-4">
                  <input
                    type="text"
                    value={f.display_name}
                    onChange={e => handleNameChange(f.id, e.target.value)}
                    className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:bg-white w-48 font-semibold text-gray-800"
                  />
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleToggle(f.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                      f.is_enabled
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {f.is_enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => moveOrder(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveOrder(idx, 'down')}
                      disabled={idx === filters.length - 1}
                      className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}