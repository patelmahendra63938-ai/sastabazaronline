'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tags, Plus, Trash2, Power, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  is_active: boolean;
  display_order?: number;
  productCount?: number;
  created_at?: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch categories and map associated product counts
  const fetchCategories = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
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
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setErrorMessage(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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
          },
        ]);

      if (error) throw error;

      setNewCatName('');
      await fetchCategories();
    } catch (err: any) {
      console.error('Error adding category:', err);
      setErrorMessage(err.message || 'Failed to add category. Check database policies.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. TOGGLE CATEGORY STATUS (ON/OFF)
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !currentStatus } : c))
      );
    } catch (err: any) {
      console.error('Error updating category status:', err);
      alert('Failed to update status: ' + err.message);
    }
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
    } catch (err: any) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-950">Category Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Create, toggle visibility, and remove categories for your storefront catalog.
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Add Category Form */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 h-fit">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Tags size={16} className="text-orange-500" /> Add New Category
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-hidden bg-gray-50 focus:bg-white text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-950 hover:bg-indigo-900 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>{submitting ? 'Adding Category...' : 'Save & Publish Category'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Existing Categories List */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-xs text-gray-700 uppercase flex justify-between items-center">
            <span>Store Categories ({categories.length})</span>
            <span className="text-[10px] text-gray-400 font-normal">Real-time Supabase Sync</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin text-orange-500" />
              <span>Loading categories...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              No categories found. Use the form on the left to add your first category.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 text-xs">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-gray-50/80 transition gap-4">
                  {/* Category Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {cat.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-gray-900 truncate">{cat.name}</h4>
                      <p className="text-[10px] text-gray-500">
                        {cat.productCount || 0} active products linked
                      </p>
                    </div>
                  </div>

                  {/* Actions: Toggle & Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        cat.is_active
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {cat.is_active ? 'ACTIVE (ON)' : 'HIDDEN (OFF)'}
                    </span>

                    {/* Toggle Button */}
                    <button
                      onClick={() => handleToggleStatus(cat.id, cat.is_active)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 text-xs cursor-pointer ${
                        cat.is_active
                          ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      title={cat.is_active ? 'Hide from storefront' : 'Show on storefront'}
                    >
                      <Power size={12} />
                      <span className="hidden md:inline">{cat.is_active ? 'Turn OFF' : 'Turn ON'}</span>
                    </button>

                    {/* Delete / Remove Button */}
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name, cat.productCount || 0)}
                      disabled={deletingId === cat.id}
                      className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition border border-red-100 cursor-pointer disabled:opacity-40"
                      title="Delete category"
                    >
                      {deletingId === cat.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
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