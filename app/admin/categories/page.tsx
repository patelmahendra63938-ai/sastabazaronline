'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Tags, Plus, Trash2, Power, Loader2, RefreshCw, AlertCircle, Save } from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  is_active: boolean;
  display_order?: number;
  show_on_homepage: boolean;
  homepage_featured: boolean;
  homepage_display_order: number;
  homepage_image_url: string | null;
  productCount?: number;
  created_at?: string;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'An unexpected error occurred.';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch categories and map associated product counts
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name, is_active, display_order, show_on_homepage, homepage_featured, homepage_display_order, homepage_image_url, created_at')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (catError) throw catError;

      const { data: prodData } = await supabase
        .from('products')
        .select('category');

      const counts: Record<string, number> = {};
      prodData?.forEach((p: { category?: string }) => {
        if (p.category) {
          counts[p.category] = (counts[p.category] || 0) + 1;
        }
      });

      const merged: CategoryItem[] = (catData || []).map((c: CategoryItem) => ({
        ...c,
        productCount: counts[c.name] || 0,
      }));

      setCategories(merged);
    } catch (err: unknown) {
      console.error('Error fetching categories:', err);
      setErrorMessage(getErrorMessage(err) || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void fetchCategories(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchCategories]);

  // 1. ADD NEW CATEGORY
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('categories')
        .insert([
          {
            name: trimmed,
            is_active: true,
            display_order: categories.length + 1,
            homepage_display_order: categories.length + 1,
          },
        ]);

      if (error) throw error;

      setNewCatName('');
      await fetchCategories();
    } catch (err: unknown) {
      console.error('Error adding category:', err);
      setErrorMessage(getErrorMessage(err) || 'Failed to add category. Check database policies.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateCategory = async (
    id: string,
    updates: Partial<Pick<CategoryItem, 'is_active' | 'show_on_homepage' | 'homepage_featured' | 'homepage_display_order' | 'homepage_image_url'>>,
    successMessage: string
  ) => {
    setSavingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase
        .from('categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setCategories((prev) =>
        prev.map((category) => (category.id === id ? { ...category, ...updates } : category))
      );
      setSuccessMessage(successMessage);
    } catch (err: unknown) {
      console.error('Error updating category:', err);
      setErrorMessage(`Failed to update category: ${getErrorMessage(err)}`);
      await fetchCategories();
    } finally {
      setSavingId(null);
    }
  };

  const updateDraft = (id: string, updates: Partial<CategoryItem>) => {
    setCategories((prev) =>
      prev.map((category) => (category.id === id ? { ...category, ...updates } : category))
    );
  };

  const handleSaveMerchandising = async (category: CategoryItem) => {
    const order = Number(category.homepage_display_order);
    if (!Number.isInteger(order) || order < 0) {
      setErrorMessage('Homepage Order must be a whole number of 0 or greater.');
      return;
    }

    await updateCategory(
      category.id,
      {
        homepage_display_order: order,
        homepage_image_url: category.homepage_image_url?.trim() || null,
      },
      `${category.name} homepage settings saved.`
    );
  };

  // 3. DELETE / REMOVE CATEGORY
  const handleDeleteCategory = async (id: string, name: string, productCount: number) => {
    const confirmPrompt = productCount > 0
      ? `Category "${name}" currently has ${productCount} active products. Deleting the category will not delete the products, but they will lose their category association. Are you sure you want to delete it?`
      : `Are you sure you want to permanently delete the category "${name}"?`;

    if (!window.confirm(confirmPrompt)) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      console.error('Error deleting category:', err);
      setErrorMessage(`Failed to delete category: ${getErrorMessage(err)}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#741f23]">Category Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage storefront availability and homepage category merchandising.
          </p>
        </div>
        <button
          onClick={fetchCategories}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition shadow-xs"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs font-medium text-green-700">
          {successMessage}
        </div>
      )}

      <div className="grid gap-2 rounded-2xl border border-[#ead8b8] bg-[#fff7e8] p-4 text-xs text-[#741f23] sm:grid-cols-3">
        <p><strong>Active in Store OFF:</strong> category is hidden from storefront.</p>
        <p><strong>Show on Homepage OFF:</strong> category remains available in store but does not appear in Shop by Category.</p>
        <p><strong>Featured:</strong> category may receive a larger or stronger visual card.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Add Category Form */}
        <div className="lg:col-span-4 h-fit space-y-4 rounded-2xl border border-[#e7ded4] bg-white p-6 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Tags size={16} className="text-[#b5843d]" /> Add New Category
          </h2>

          <form onSubmit={handleAddCategory} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1.5">Category Name</label>
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Sarees & Kurtis, Home Decor"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#741f23] outline-hidden bg-gray-50 focus:bg-white text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#741f23] hover:bg-[#5e171b] text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>{submitting ? 'Adding Category...' : 'Save & Publish Category'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Existing Categories List */}
        <div className="lg:col-span-8 overflow-hidden rounded-2xl border border-[#e7ded4] bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-[#eee7df] bg-[#fbf8f4] p-4 text-xs font-bold uppercase text-gray-700">
            <span>Store Categories ({categories.length})</span>
            <span className="text-[10px] text-gray-400 font-normal">Real-time Supabase Sync</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin text-[#b5843d]" />
              <span>Loading categories...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              No categories found. Use the form on the left to add your first category.
            </div>
          ) : (
            <div className="divide-y divide-[#eee7df] text-xs">
              {categories.map((cat) => (
                <div key={cat.id} className="space-y-4 p-4 transition hover:bg-[#fffaf5] sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                        {cat.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate font-bold text-gray-900">{cat.name}</h4>
                        <p className="text-[10px] text-gray-500">{cat.productCount || 0} products linked</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.name, cat.productCount || 0)}
                      disabled={deletingId === cat.id || savingId === cat.id}
                      className="cursor-pointer rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:opacity-40"
                      title="Delete category"
                    >
                      {deletingId === cat.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => updateCategory(cat.id, { is_active: !cat.is_active }, `${cat.name} storefront status updated.`)}
                      disabled={savingId === cat.id}
                      aria-pressed={cat.is_active}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left font-bold transition disabled:opacity-50 ${cat.is_active ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-gray-100 text-gray-600'}`}
                    >
                      <span>Active in Store</span>
                      <Power size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCategory(cat.id, { show_on_homepage: !cat.show_on_homepage }, `${cat.name} homepage visibility updated.`)}
                      disabled={savingId === cat.id}
                      aria-pressed={cat.show_on_homepage}
                      className={`rounded-xl border px-3 py-2.5 text-left font-bold transition disabled:opacity-50 ${cat.show_on_homepage ? 'border-[#ead8b8] bg-[#fff7e8] text-[#741f23]' : 'border-gray-200 bg-gray-100 text-gray-600'}`}
                    >
                      Show on Homepage: {cat.show_on_homepage ? 'ON' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCategory(cat.id, { homepage_featured: !cat.homepage_featured }, `${cat.name} featured status updated.`)}
                      disabled={savingId === cat.id}
                      aria-pressed={cat.homepage_featured}
                      className={`rounded-xl border px-3 py-2.5 text-left font-bold transition disabled:opacity-50 ${cat.homepage_featured ? 'border-[#ead8b8] bg-[#fff7e8] text-[#8a5b20]' : 'border-gray-200 bg-gray-100 text-gray-600'}`}
                    >
                      Featured: {cat.homepage_featured ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                    <label className="space-y-1.5 font-bold text-gray-700">
                      <span className="block">Homepage Order</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={cat.homepage_display_order}
                        onChange={(event) => updateDraft(cat.id, { homepage_display_order: Number(event.target.value) })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-hidden focus:ring-2 focus:ring-[#741f23]"
                      />
                    </label>
                    <label className="space-y-1.5 font-bold text-gray-700">
                      <span className="block">Homepage Image URL <span className="font-normal text-gray-400">(optional)</span></span>
                      <input
                        type="url"
                        value={cat.homepage_image_url || ''}
                        onChange={(event) => updateDraft(cat.id, { homepage_image_url: event.target.value })}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-hidden focus:ring-2 focus:ring-[#741f23]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSaveMerchandising(cat)}
                      disabled={savingId === cat.id}
                      className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#741f23] px-4 py-2.5 font-bold text-white transition hover:bg-[#5e171b] disabled:opacity-50"
                    >
                      {savingId === cat.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
