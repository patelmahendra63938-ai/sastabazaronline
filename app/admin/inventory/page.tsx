'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Package, RefreshCw, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { inventoryVariantDisplay } from '@/lib/catalog/inventory-variant';

type ActionType = 'ADD' | 'REMOVE' | 'SET';

type InventoryRow = {
  id: string;
  product_id: string;
  size: string;
  sku: string | null;
  weight_kg: number | null;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  damaged_quantity?: number;
  reorder_level?: number;
  products?: {
    id: string;
    title: string;
    price: number;
    category: string;
    images: string[] | null;
    stock: number | null;
    available_colours: string[] | null;
    colour_selection_mode: string | null;
  } | null;
};

type MovementRow = {
  id: string;
  size: string | null;
  quantity: number;
  movement_type: string;
  previous_quantity: number;
  new_quantity: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedRow, setSelectedRow] = useState<InventoryRow | null>(null);
  const [actionType, setActionType] = useState<ActionType>('ADD');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [historyRow, setHistoryRow] = useState<InventoryRow | null>(null);
  const [history, setHistory] = useState<MovementRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    setMessage('');
    const { data, error } = await supabase
      .from('inventory')
      .select('*, products(id,title,price,category,images,stock,available_colours,colour_selection_mode)')
      .order('available_quantity', { ascending: true });

    if (error) setMessage(`Inventory could not be loaded: ${error.message}`);
    setInventory((data || []) as InventoryRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredInventory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inventory.filter((item) => {
      const variant = inventoryVariantDisplay(item.size, item.products?.available_colours);
      const haystack = [
        item.products?.title,
        item.products?.category,
        item.sku,
        item.size,
        variant.size,
        variant.colour,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const available = Number(item.available_quantity || 0);
      const threshold = Number(item.reorder_level ?? 5);
      const isOut = available === 0;
      const isLow = available > 0 && available <= threshold;
      const statusMatches =
        filterStatus === 'ALL' ||
        (filterStatus === 'OUT' && isOut) ||
        (filterStatus === 'LOW' && isLow) ||
        (filterStatus === 'IN' && !isOut && !isLow);

      return (!q || haystack.includes(q)) && statusMatches;
    });
  }, [inventory, searchQuery, filterStatus]);

  const openAdjust = (row: InventoryRow) => {
    setSelectedRow(row);
    setActionType('ADD');
    setQuantity('');
    setReason('');
    setMessage('');
  };

  const submitAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRow) return;
    const value = Number(quantity);
    if (!Number.isInteger(value) || value < 0 || (actionType !== 'SET' && value === 0)) {
      setMessage('Enter a valid whole-number quantity.');
      return;
    }

    let delta = value;
    if (actionType === 'REMOVE') delta = -value;
    if (actionType === 'SET') delta = value - Number(selectedRow.available_quantity || 0);

    if (delta === 0) {
      setSelectedRow(null);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.rpc('adjust_inventory_stock', {
      p_product_id: selectedRow.product_id,
      p_size: selectedRow.size,
      p_quantity_delta: delta,
      p_movement_type:
        actionType === 'ADD' ? 'PURCHASE' : actionType === 'REMOVE' ? 'DAMAGE' : 'MANUAL_ADJUSTMENT',
      p_notes: reason.trim() || `Admin ${actionType.toLowerCase()} stock adjustment`,
      p_created_by: 'ADMIN',
    });
    setSubmitting(false);

    if (error) {
      setMessage(`Stock update failed: ${error.message}`);
      return;
    }

    setSelectedRow(null);
    setMessage('Stock updated and inventory movement recorded successfully.');
    await fetchInventory();
  };

  const openHistory = async (row: InventoryRow) => {
    setHistoryRow(row);
    setHistory([]);
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('id,size,quantity,movement_type,previous_quantity,new_quantity,notes,created_by,created_at')
      .eq('product_id', row.product_id)
      .eq('size', row.size)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) setMessage(`History could not be loaded: ${error.message}`);
    setHistory((data || []) as MovementRow[]);
    setHistoryLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-indigo-950">Inventory & Stock Ledger</h1>
          <p className="mt-1 text-xs text-gray-500">Variant-safe stock control with SKU, size/option, colour and movement history.</p>
        </div>
        <button onClick={fetchInventory} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {message && <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-950">{message}</div>}

      <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-lg">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product, SKU, size or colour..."
            className="w-full rounded-xl border bg-gray-50 py-2 pl-9 pr-3 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600"
          />
        </div>
        <div className="flex items-center gap-3">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border bg-gray-50 px-3 py-2 text-xs font-semibold">
            <option value="ALL">All Stock Levels</option>
            <option value="IN">In Stock</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Out of Stock</option>
          </select>
          <span className="whitespace-nowrap text-xs font-bold text-gray-500">Rows: {filteredInventory.length}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-16 text-xs text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading inventory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="border-b bg-gray-50 text-[10px] font-black uppercase text-gray-500">
                <tr>
                  <th className="p-3.5">Product</th>
                  <th className="p-3.5">Size / Option</th>
                  <th className="p-3.5">Colour</th>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5 text-center">Available</th>
                  <th className="p-3.5 text-center">Reserved</th>
                  <th className="p-3.5 text-center">Sold</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInventory.map((item) => {
                  const variant = inventoryVariantDisplay(item.size, item.products?.available_colours);
                  const available = Number(item.available_quantity || 0);
                  const threshold = Number(item.reorder_level ?? 5);
                  const isOut = available === 0;
                  const isLow = available > 0 && available <= threshold;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img src={item.products?.images?.[0] || '/placeholder.png'} alt="" className="h-10 w-10 rounded-lg border object-cover" />
                          <div>
                            <p className="max-w-[280px] truncate font-black text-gray-900">{item.products?.title || 'Unknown Product'}</p>
                            <p className="text-[10px] text-gray-400">{item.products?.category || 'General'} • ₹{item.products?.price ?? 0}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-gray-700">{variant.size}</td>
                      <td className="p-3.5"><span className="rounded-full bg-purple-50 px-2 py-1 font-bold text-purple-700">{variant.colour || '—'}</span></td>
                      <td className="p-3.5 font-mono text-[11px] font-bold text-gray-700">{item.sku || '—'}</td>
                      <td className="p-3.5 text-center text-sm font-black text-green-700">{available}</td>
                      <td className="p-3.5 text-center font-bold text-purple-700">{item.reserved_quantity ?? 0}</td>
                      <td className="p-3.5 text-center font-bold text-gray-600">{item.sold_quantity ?? 0}</td>
                      <td className="p-3.5">
                        <span className={`rounded px-2 py-1 text-[10px] font-black ${isOut ? 'bg-red-50 text-red-700' : isLow ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                          {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button onClick={() => openAdjust(item)} className="mr-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 font-bold text-indigo-950 hover:bg-indigo-100">Edit Stock</button>
                        <button onClick={() => openHistory(item)} className="rounded-lg bg-gray-100 px-2.5 py-1.5 font-bold text-gray-700 hover:bg-gray-200">History</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={submitAdjustment} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-black text-indigo-950"><Package size={16} /> Manage Variant Stock</h2>
                <p className="mt-1 text-[11px] text-gray-500">{selectedRow.products?.title} • {inventoryVariantDisplay(selectedRow.size, selectedRow.products?.available_colours).label} • {selectedRow.sku}</p>
              </div>
              <button type="button" onClick={() => setSelectedRow(null)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 text-xs">
              <span>Available: <strong>{selectedRow.available_quantity}</strong></span>
              <span>Reserved: <strong>{selectedRow.reserved_quantity}</strong></span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['ADD', 'REMOVE', 'SET'] as ActionType[]).map((type) => (
                <button key={type} type="button" onClick={() => setActionType(type)} className={`rounded-xl border py-2 text-xs font-black ${actionType === type ? 'bg-indigo-950 text-white' : 'bg-gray-50 text-gray-700'}`}>
                  {type === 'ADD' ? '+ Add' : type === 'REMOVE' ? '- Remove' : '= Set'}
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase text-gray-600">{actionType === 'SET' ? 'Exact new stock' : 'Quantity'}</label>
              <input type="number" min="0" step="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase text-gray-600">Reason / Notes</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Supplier stock, correction, damage..." className="w-full rounded-xl border px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-600" />
            </div>
            <button disabled={submitting} className="w-full rounded-xl bg-orange-500 py-3 text-xs font-black text-white disabled:opacity-50">
              {submitting ? 'Updating...' : 'Save Stock Adjustment'}
            </button>
          </form>
        </div>
      )}

      {historyRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-sm font-black text-indigo-950">Variant Stock History</h2>
                <p className="mt-1 text-[11px] text-gray-500">{historyRow.products?.title} • {inventoryVariantDisplay(historyRow.size, historyRow.products?.available_colours).label} • {historyRow.sku}</p>
              </div>
              <button onClick={() => setHistoryRow(null)}><X size={18} /></button>
            </div>
            <div className="max-h-[65vh] overflow-auto p-5">
              {historyLoading ? <div className="py-12 text-center text-xs text-gray-500">Loading history...</div> : history.length === 0 ? <div className="py-12 text-center text-xs text-gray-500">No movement history for this exact variant.</div> : (
                <div className="space-y-2">
                  {history.map((row) => (
                    <div key={row.id} className="grid grid-cols-[120px_80px_1fr] gap-3 rounded-xl border p-3 text-xs">
                      <div><p className="font-black">{row.movement_type}</p><p className="text-[10px] text-gray-400">{new Date(row.created_at).toLocaleString()}</p></div>
                      <div className={`font-black ${row.quantity >= 0 ? 'text-green-700' : 'text-red-700'}`}>{row.quantity >= 0 ? '+' : ''}{row.quantity}</div>
                      <div><p className="font-bold text-gray-700">{row.previous_quantity} → {row.new_quantity}</p><p className="mt-1 text-[10px] text-gray-500">{row.notes || 'No note'} • {row.created_by || 'SYSTEM'}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
