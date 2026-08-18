'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Package, Plus, Search, Filter, RefreshCw, AlertTriangle, 
  ShieldCheck, History, ArrowUpDown, X, Loader2, Layers, CheckCircle2 
} from 'lucide-react';

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'ADD' | 'REMOVE' | 'SET'>('ADD');
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // History Modal State
  const [historyProduct, setHistoryProduct] = useState<any | null>(null);
  const [productMovements, setProductMovements] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch Inventory Ledger
  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*, products(id, title, price, category, images, hsn_code, stock)')
      .order('available_quantity', { ascending: true });

    if (!error && data) {
      setInventory(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Handle Stock Adjustment Submit (Add, Remove, Set)
  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity || isNaN(Number(quantity))) {
      alert('Please select a product and enter a valid quantity.');
      return;
    }

    const qtyNum = parseInt(quantity);
    if (qtyNum <= 0 && actionType !== 'SET') {
      alert('Quantity must be greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      let delta = qtyNum;
      if (actionType === 'REMOVE') delta = -qtyNum;

      if (actionType === 'SET') {
        delta = qtyNum - selectedProduct.available_quantity;
      }

      // Call database RPC function for atomic inventory adjustment
      const { error } = await supabase.rpc('adjust_inventory_stock', {
        p_product_id: selectedProduct.product_id,
        p_quantity_delta: delta,
        p_movement_type: actionType === 'ADD' ? 'PURCHASE' : (actionType === 'REMOVE' ? 'DAMAGE' : 'MANUAL_ADJUSTMENT'),
        p_notes: reason || `Admin stock ${actionType.toLowerCase()} operation`,
        p_created_by: 'ADMIN'
      });

      if (error) throw error;

      alert(`Stock successfully updated!`);
      setIsAddModalOpen(false);
      setSelectedProduct(null);
      setQuantity('');
      setReason('');
      fetchInventory();
    } catch (err: any) {
      alert('Error updating stock: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch History for a specific product
  const openHistoryModal = async (item: any) => {
    setHistoryProduct(item);
    setLoadingHistory(true);
    const { data } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', item.product_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setProductMovements(data);
    setLoadingHistory(false);
  };

  // Filter logic
  const filteredInventory = inventory.filter(item => {
    const title = item.products?.title || '';
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    const isLow = item.available_quantity > 0 && item.available_quantity <= (item.reorder_level || 5);
    const isOut = item.available_quantity === 0;

    if (filterStatus === 'LOW') matchesFilter = isLow;
    if (filterStatus === 'OUT') matchesFilter = isOut;
    if (filterStatus === 'IN') matchesFilter = !isLow && !isOut;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header with "+ Add Inventory" Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-950">Inventory & Stock Ledger</h1>
          <p className="text-xs text-gray-500 mt-1">Manage physical stock, reservations, and real-time adjustments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInventory}
            className="bg-white border hover:bg-gray-50 text-gray-700 font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => {
              setSelectedProduct(inventory[0] || null);
              setActionType('ADD');
              setIsAddModalOpen(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow"
          >
            <Plus size={16} /> + Add Inventory / Stock
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl bg-gray-50 focus:bg-white outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border rounded-xl px-3 py-2 bg-gray-50 font-semibold text-gray-700 outline-none"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN">In Stock</option>
            <option value="LOW">Low Stock Alert (≤5)</option>
            <option value="OUT">Out of Stock (0)</option>
          </select>
          <span className="text-xs font-bold text-gray-500 pl-2">Total Items: {filteredInventory.length}</span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading inventory ledger...
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-16 text-center text-xs text-gray-500">No inventory records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-600 font-bold uppercase text-[10px]">
                  <th className="p-3.5">Product</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-center">Available Stock</th>
                  <th className="p-3.5 text-center">Reserved</th>
                  <th className="p-3.5 text-center">Sold Qty</th>
                  <th className="p-3.5">Stock Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInventory.map(item => {
                  const available = item.available_quantity ?? 0;
                  const threshold = item.reorder_level ?? 5;
                  const isOut = available === 0;
                  const isLow = available > 0 && available <= threshold;

                  return (
                    <tr key={item.product_id} className="hover:bg-gray-50 transition">
                      <td className="p-3.5 flex items-center gap-3">
                        <img 
                          src={item.products?.images?.[0] || 'https://via.placeholder.com/60'} 
                          alt="" 
                          className="w-10 h-10 object-cover rounded-lg border shrink-0" 
                        />
                        <div>
                          <p className="font-bold text-gray-900 line-clamp-1">{item.products?.title || 'Unknown Product'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">Price: ₹{item.products?.price}</p>
                        </div>
                      </td>
                      <td className="p-3.5 text-gray-600 font-medium">{item.products?.category || 'General'}</td>
                      <td className="p-3.5 text-center font-mono font-black text-green-700 text-sm">{available}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-purple-600">{item.reserved_quantity ?? 0}</td>
                      <td className="p-3.5 text-center font-mono text-gray-600">{item.sold_quantity ?? 0}</td>
                      <td className="p-3.5">
                        {isOut ? (
                          <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] border border-red-200">OUT OF STOCK</span>
                        ) : isLow ? (
                          <span className="bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded text-[10px] border border-orange-200">LOW STOCK</span>
                        ) : (
                          <span className="bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded text-[10px]">IN STOCK</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedProduct(item);
                            setActionType('ADD');
                            setIsAddModalOpen(true);
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold px-2.5 py-1.5 rounded-lg transition"
                          title="Add / Edit Stock"
                        >
                          Edit Stock
                        </button>
                        <button
                          onClick={() => openHistoryModal(item)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-2.5 py-1.5 rounded-lg transition"
                          title="Stock History"
                        >
                          History
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

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT STOCK (+ ADD INVENTORY)                                 */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleStockSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black text-indigo-950 flex items-center gap-2">
                <Package size={16} className="text-orange-500" /> Manage Inventory Stock
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Select Product</label>
              <select
                value={selectedProduct?.product_id || ''}
                onChange={e => {
                  const found = inventory.find(i => i.product_id === e.target.value);
                  setSelectedProduct(found);
                }}
                className="w-full px-3 py-2.5 border rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {inventory.map(item => (
                  <option key={item.product_id} value={item.product_id}>
                    {item.products?.title} (Current: {item.available_quantity})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="bg-gray-50 p-3 rounded-xl flex justify-between font-mono text-gray-700">
                <span>Current Stock: <strong className="text-indigo-950">{selectedProduct.available_quantity}</strong></span>
                <span>Reserved: <strong className="text-purple-700">{selectedProduct.reserved_quantity}</strong></span>
              </div>
            )}

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Stock Action</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActionType('ADD')}
                  className={`py-2 rounded-xl font-bold transition border ${actionType === 'ADD' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('REMOVE')}
                  className={`py-2 rounded-xl font-bold transition border ${actionType === 'REMOVE' ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                >
                  - Remove
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('SET')}
                  className={`py-2 rounded-xl font-bold transition border ${actionType === 'SET' ? 'bg-indigo-950 text-white border-indigo-950' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                >
                  = Set Stock
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">
                {actionType === 'SET' ? 'New Exact Stock Quantity' : 'Quantity'}
              </label>
              <input
                type="number"
                required
                min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder={actionType === 'SET' ? 'e.g. 50' : 'e.g. 10'}
                className="w-full px-3 py-2.5 border rounded-xl font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Reason / Notes</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. New supplier shipment / Stock correction"
                className="w-full px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-950 hover:bg-indigo-900 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Save Stock</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INVENTORY HISTORY (AUDIT TRAIL)                                    */}
      {/* ========================================================================= */}
      {historyProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-indigo-950">Stock Movement History</h3>
                <p className="text-gray-500 font-medium">{historyProduct.products?.title}</p>
              </div>
              <button onClick={() => setHistoryProduct(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">
                ✕
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-12 text-center text-gray-400">Loading history ledger...</div>
            ) : productMovements.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No recorded movements for this product yet.</div>
            ) : (
              <div className="divide-y overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                      <th className="p-2.5">Date / Time</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Change</th>
                      <th className="p-2.5">Stock Flow</th>
                      <th className="p-2.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    {productMovements.map(mov => (
                      <tr key={mov.id} className="hover:bg-gray-50">
                        <td className="p-2.5 text-gray-500 font-sans text-[11px]">
                          {new Date(mov.created_at).toLocaleString()}
                        </td>
                        <td className="p-2.5">
                          <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            {mov.movement_type}
                          </span>
                        </td>
                        <td className={`p-2.5 font-bold ${mov.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                        </td>
                        <td className="p-2.5 text-gray-600">
                          {mov.previous_quantity} → <strong className="text-gray-900">{mov.new_quantity}</strong>
                        </td>
                        <td className="p-2.5 text-gray-500 font-sans text-[11px]">
                          {mov.notes || mov.reference || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}