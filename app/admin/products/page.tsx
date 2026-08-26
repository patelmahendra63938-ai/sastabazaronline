'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Package, Search, Trash2, Plus, Edit, ShieldCheck, 
  AlertTriangle, Loader2, X, RefreshCw, Eye, Tag, Ruler 
} from 'lucide-react';
import Link from 'next/link';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');

  // ડેટા ફેચિંગ (Products + Variants Inventory)
  const fetchCatalogData = async () => {
    setLoading(true);
    try {
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: invData } = await supabase
        .from('inventory')
        .select('*');

      if (prodData) setProducts(prodData);

      // Map variants by product_id
      if (invData) {
        const mapped: Record<string, any[]> = {};
        invData.forEach(item => {
          if (!mapped[item.product_id]) mapped[item.product_id] = [];
          mapped[item.product_id].push(item);
        });
        setInventoryMap(mapped);
      }
    } catch (err) {
      console.error('Error fetching catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? All variant stock will also be removed.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== id));
    } else {
      alert('Failed to delete product: ' + error.message);
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;

    // Variants Stock Calculation
    const variants = inventoryMap[p.id] || [];
    const totalStock = variants.length > 0 
      ? variants.reduce((sum, v) => sum + (v.available_quantity || 0), 0)
      : (p.stock || 0);

    let matchesStock = true;
    if (stockStatusFilter === 'OUT') matchesStock = totalStock === 0;
    if (stockStatusFilter === 'LOW') matchesStock = totalStock > 0 && totalStock <= 10;
    if (stockStatusFilter === 'IN') matchesStock = totalStock > 10;

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col font-sans" suppressHydrationWarning>
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header with Prominent Add Product Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-indigo-950">Product Catalog & Variant Stock</h1>
            <p className="text-xs text-gray-500 mt-1">Manage active catalog items, clothing sizes, pricing, and live inventory.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchCatalogData}
              className="p-2.5 text-gray-600 bg-white border hover:bg-gray-50 rounded-xl transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <Link
              href="/admin/add-product"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus size={16} /> + Add New Product
            </Link>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-md">
            <input
              type="text"
              placeholder="Search by title or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl bg-gray-50 focus:bg-white"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs border rounded-xl px-3 py-2 bg-gray-50 font-bold text-gray-700"
            >
              <option value="ALL">All Categories</option>
              <option value="Fashion & Apparel">Fashion & Apparel</option>
              <option value="Home & Kitchen">Home & Kitchen</option>
              <option value="Electronics & Gadgets">Electronics & Gadgets</option>
            </select>

            <select
              value={stockStatusFilter}
              onChange={e => setStockStatusFilter(e.target.value)}
              className="text-xs border rounded-xl px-3 py-2 bg-gray-50 font-bold text-gray-700"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN">In Stock</option>
              <option value="LOW">Low Stock (≤10)</option>
              <option value="OUT">Out of Stock (0)</option>
            </select>
          </div>
        </div>

        {/* Catalog Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading catalog & size variants...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-xs text-gray-500">No products found matching your search criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-500 font-bold uppercase text-[10px]">
                    <th className="p-4">Product Info</th>
                    <th className="p-4">Category / HSN</th>
                    <th className="p-4">Price / MRP</th>
                    <th className="p-4">Configured Sizes & Stock</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(p => {
                    const variants = inventoryMap[p.id] || [];
                    const totalAvailable = variants.length > 0
                      ? variants.reduce((sum, v) => sum + (v.available_quantity || 0), 0)
                      : (p.stock || 0);

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition">
                        <td className="p-4 flex items-center gap-3">
                          <img 
                            src={p.images?.[0] || 'https://via.placeholder.com/60'} 
                            alt="" 
                            className="w-12 h-12 object-cover rounded-xl border shrink-0" 
                          />
                          <div>
                            <p className="font-bold text-gray-900 line-clamp-1">{p.title}</p>
                            <p className="text-[10px] text-gray-400 font-mono">ID: {p.id.slice(0, 8)}...</p>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="font-bold text-gray-800">{p.category || 'General'}</span>
                          <p className="text-[10px] font-mono text-gray-500">HSN: {p.hsn_code || '6204'} (GST {p.gst_rate || 5}%)</p>
                        </td>

                        <td className="p-4">
                          <span className="font-black text-indigo-950 text-sm">₹{p.price}</span>
                          {p.mrp > p.price && (
                            <span className="text-[10px] text-gray-400 line-through ml-1.5">₹{p.mrp}</span>
                          )}
                        </td>

                        {/* Sizes & Stock Chips */}
                        <td className="p-4">
                          {variants.length === 0 ? (
                            <span className="font-mono font-bold text-gray-700">{p.stock || 0} Units (Standard)</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {variants.map((v, i) => (
                                <span key={i} className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-900 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                  <span>{v.size}:</span>
                                  <strong className={v.available_quantity === 0 ? 'text-red-600' : 'text-green-700'}>
                                    {v.available_quantity}
                                  </strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          {totalAvailable === 0 ? (
                            <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded">OUT OF STOCK</span>
                          ) : totalAvailable <= 10 ? (
                            <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded">LOW STOCK ({totalAvailable})</span>
                          ) : (
                            <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">IN STOCK ({totalAvailable})</span>
                          )}
                        </td>

                        <td className="p-4 text-right space-x-1">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="inline-block p-2 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
                            title="Edit Product"
                          >
                            <Edit size={16} />
                          </Link>
                          <Link 
                            href="/admin/inventory"
                            className="inline-block p-2 text-indigo-950 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition font-bold text-xs"
                            title="Adjust Stock in Inventory Ledger"
                          >
                            Adjust
                          </Link>
                          <button 
                            onClick={() => handleDelete(p.id)} 
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </main>
  );
}
