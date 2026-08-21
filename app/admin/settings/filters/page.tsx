'use client';

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Save,
  CheckCircle2,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface FilterSetting {
  id: string;
  filter_key: string;
  display_name: string;
  is_enabled: boolean;
  display_order: number;
}

interface VisibilitySettings {
  filter_panel_enabled: boolean;
  marketplace_links_enabled: boolean;
}

const DEFAULT_VISIBILITY: VisibilitySettings = {
  filter_panel_enabled: true,
  marketplace_links_enabled: true,
};

export default function AdminFilterSettingsPage() {
  const [filters, setFilters] = useState<FilterSetting[]>([]);
  const [visibility, setVisibility] =
    useState<VisibilitySettings>(DEFAULT_VISIBILITY);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');

    const [filtersResult, visibilityResult] = await Promise.all([
      supabase
        .from('storefront_filter_settings')
        .select('*')
        .order('display_order', { ascending: true }),
      fetch('/api/storefront-visibility', { cache: 'no-store' }),
    ]);

    setFilters(filtersResult.data || []);

    if (visibilityResult.ok) {
      const value = (await visibilityResult.json()) as VisibilitySettings;
      setVisibility({
        filter_panel_enabled: value.filter_panel_enabled !== false,
        marketplace_links_enabled: value.marketplace_links_enabled !== false,
      });
    }

    setLoading(false);
  };

  const handleToggle = (id: string) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, is_enabled: !f.is_enabled } : f))
    );
  };

  const handleNameChange = (id: string, name: string) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, display_name: name } : f))
    );
  };

  const moveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filters.length) return;

    const newArr = [...filters];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;

    const reordered = newArr.map((item, idx) => ({
      ...item,
      display_order: idx + 1,
    }));
    setFilters(reordered);
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    setError('');

    try {
      for (const item of filters) {
        const { error: filterError } = await supabase
          .from('storefront_filter_settings')
          .update({
            display_name: item.display_name,
            is_enabled: item.is_enabled,
            display_order: item.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (filterError) throw filterError;
      }

      const response = await fetch('/api/storefront-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visibility),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to save storefront visibility.');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save storefront settings.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-indigo-950 flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-orange-500" />
            Storefront Filter Configuration
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Control the complete main-page filter system, individual filter tabs,
            and external marketplace links.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs"
        >
          {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saved ? 'Saved' : loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-indigo-950">
                <Eye size={17} className="text-indigo-600" />
                Main Page Filter System
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                ON shows enabled filter tabs on the main storefront. OFF completely
                removes the filter panel and active filter chips, and filter URL
                parameters are ignored.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setVisibility((current) => ({
                  ...current,
                  filter_panel_enabled: !current.filter_panel_enabled,
                }))
              }
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-black transition ${
                visibility.filter_panel_enabled
                  ? 'border-green-200 bg-green-100 text-green-800'
                  : 'border-gray-200 bg-gray-100 text-gray-600'
              }`}
            >
              {visibility.filter_panel_enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-indigo-950">
                <ExternalLink size={17} className="text-orange-500" />
                External Marketplace Links
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                ON shows Amazon, Flipkart and Meesho seller links. OFF hides the
                marketplace cards and external seller links from the storefront.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setVisibility((current) => ({
                  ...current,
                  marketplace_links_enabled: !current.marketplace_links_enabled,
                }))
              }
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-black transition ${
                visibility.marketplace_links_enabled
                  ? 'border-green-200 bg-green-100 text-green-800'
                  : 'border-gray-200 bg-gray-100 text-gray-600'
              }`}
            >
              {visibility.marketplace_links_enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
        <strong>Individual filter rule:</strong> when a filter below is DISABLED,
        that filter tab is not shown on the main page and its URL filter parameter
        is ignored. Other enabled filter tabs continue to work normally.
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase">
              <th className="p-4">Order</th>
              <th className="p-4">Filter Key</th>
              <th className="p-4">Display Label</th>
              <th className="p-4">Main Page</th>
              <th className="p-4 text-right">Reorder</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {filters.map((f, idx) => (
              <tr key={f.id} className="hover:bg-gray-50/80 transition">
                <td className="p-4 font-mono text-gray-400 font-bold">
                  {f.display_order}
                </td>
                <td className="p-4 font-mono font-semibold text-indigo-900">
                  {f.filter_key}
                </td>
                <td className="p-4">
                  <input
                    type="text"
                    value={f.display_name}
                    onChange={(e) => handleNameChange(f.id, e.target.value)}
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
                    {f.is_enabled ? 'ON' : 'OFF'}
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
