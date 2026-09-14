'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, Save, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ColourMode = 'none' | 'customer' | 'assorted';

type ProductRow = {
  id: string;
  title: string;
  category: string | null;
  colour_selection_mode: ColourMode | null;
  available_colours: string[] | null;
};

export default function ProductColoursPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState<ColourMode>('none');
  const [colours, setColours] = useState<string[]>([]);
  const [newColour, setNewColour] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id,title,category,colour_selection_mode,available_colours')
      .order('title');

    if (error) {
      setMessage(`Could not load products: ${error.message}`);
      setProducts([]);
    } else {
      const rows = (data || []) as ProductRow[];
      setProducts(rows);
      if (!selectedId && rows.length) setSelectedId(rows[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const product = products.find((item) => item.id === selectedId);
    if (!product) return;
    setMode((product.colour_selection_mode || 'none') as ColourMode);
    setColours(Array.isArray(product.available_colours) ? product.available_colours.filter(Boolean) : []);
    setMessage('');
  }, [selectedId, products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((item) =>
      `${item.title} ${item.category || ''}`.toLowerCase().includes(q),
    );
  }, [products, search]);

  const addColour = () => {
    const value = newColour.trim();
    if (!value) return;
    if (!colours.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setColours((current) => [...current, value]);
    }
    setNewColour('');
  };

  const save = async () => {
    if (!selectedId) return;
    if (mode !== 'none' && colours.length === 0) {
      setMessage('Add at least one colour, or choose Not Applicable.');
      return;
    }

    setSaving(true);
    setMessage('');
    const { error } = await supabase
      .from('products')
      .update({
        colour_selection_mode: mode,
        available_colours: mode === 'none' ? [] : colours,
      })
      .eq('id', selectedId);

    if (error) {
      setMessage(`Save failed: ${error.message}`);
    } else {
      setMessage('Colours saved successfully.');
      await loadProducts();
    }
    setSaving(false);
  };

  const selectedProduct = products.find((item) => item.id === selectedId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/admin/products" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-900">
            <ArrowLeft size={14} /> Back to Products
          </Link>
          <h1 className="text-2xl font-black text-indigo-950">Product Colours</h1>
          <p className="mt-1 text-xs text-gray-500">Add or edit colours for new and old products without changing stock quantity.</p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border bg-white px-4 py-3 text-xs font-bold text-gray-700">{message}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border bg-gray-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-gray-500"><Loader2 size={15} className="animate-spin" /> Loading...</div>
          ) : (
            <div className="max-h-[560px] space-y-1 overflow-y-auto">
              {filtered.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedId(product.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-xs transition ${selectedId === product.id ? 'bg-indigo-950 text-white' : 'hover:bg-gray-50 text-gray-800'}`}
                >
                  <div className="font-bold line-clamp-2">{product.title}</div>
                  <div className={`mt-0.5 text-[10px] ${selectedId === product.id ? 'text-indigo-200' : 'text-gray-400'}`}>{product.category || 'General'}</div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          {!selectedProduct ? (
            <div className="py-16 text-center text-sm text-gray-400">Select a product.</div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-orange-600">Editing Colours</p>
                <h2 className="mt-1 text-lg font-black text-gray-900">{selectedProduct.title}</h2>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-700">Colour Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as ColourMode)}
                  className="w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="none">Not Applicable / No Colour Choice</option>
                  <option value="customer">Customer Selects Colour</option>
                  <option value="assorted">Assorted / Mixed Colours</option>
                </select>
              </div>

              {mode !== 'none' && (
                <div className="space-y-3 rounded-2xl border bg-gray-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    {colours.map((colour) => (
                      <span key={colour} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-bold text-gray-800">
                        {colour}
                        <button type="button" onClick={() => setColours((current) => current.filter((item) => item !== colour))} className="text-gray-400 hover:text-red-500">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={newColour}
                      onChange={(e) => setNewColour(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addColour();
                        }
                      }}
                      placeholder="e.g. Pink, Blue, Beige"
                      className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                    <button type="button" onClick={addColour} className="inline-flex items-center gap-1 rounded-xl bg-indigo-950 px-3 text-xs font-black text-white">
                      <Plus size={13} /> Add Colour
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-xs font-black uppercase tracking-wide text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save Colours
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
