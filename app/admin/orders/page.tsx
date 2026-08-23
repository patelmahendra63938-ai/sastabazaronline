'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Clock, Package, Printer, RefreshCw, Search, ShoppingCart, XCircle } from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const cancelledCount = useMemo(() => orders.filter(o => o.order_status === 'CANCELLED').length, [orders]);
  const activeCount = useMemo(() => orders.filter(o => o.order_status !== 'CANCELLED' && o.order_status !== 'DELIVERED').length, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      const statusOk = statusFilter === 'ALL' || o.order_status === statusFilter;
      const textOk = !q || [o.order_number, o.customer_name, o.customer_phone, o.customer_email]
        .some(v => String(v || '').toLowerCase().includes(q));
      return statusOk && textOk;
    });
  }, [orders, statusFilter, search]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase.rpc('update_order_status_workflow', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_actor: 'ADMIN_ORDERS',
        p_notes: `Status updated to ${newStatus} from admin orders`,
        p_courier: null,
        p_tracking: null,
      });
      if (error) throw error;
      await fetchOrders();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-indigo-950 flex items-center gap-2"><ShoppingCart className="text-orange-500" size={24}/> Order Management</h1>
          <p className="text-xs text-gray-500 mt-1">All customer orders, including customer cancellations, appear here in real time.</p>
        </div>
        <button onClick={fetchOrders} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-xs font-bold text-gray-700"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button onClick={() => setStatusFilter('ALL')} className="text-left rounded-2xl border bg-white p-4"><p className="text-[10px] font-bold uppercase text-gray-500">All Orders</p><p className="text-xl font-black text-indigo-950">{orders.length}</p></button>
        <button onClick={() => setStatusFilter('CANCELLED')} className="text-left rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-[10px] font-bold uppercase text-red-600">Cancelled</p><p className="text-xl font-black text-red-700">{cancelledCount}</p></button>
        <button onClick={() => setStatusFilter('CONFIRMED')} className="text-left rounded-2xl border bg-orange-50 p-4"><p className="text-[10px] font-bold uppercase text-orange-700">Active / To Process</p><p className="text-xl font-black text-orange-700">{activeCount}</p></button>
        <button onClick={() => setStatusFilter('DELIVERED')} className="text-left rounded-2xl border bg-green-50 p-4"><p className="text-[10px] font-bold uppercase text-green-700">Delivered</p><p className="text-xl font-black text-green-700">{orders.filter(o => o.order_status === 'DELIVERED').length}</p></button>
      </div>

      {cancelledCount > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-800"><AlertCircle size={18}/><div><p className="text-sm font-black">{cancelledCount} customer-cancelled order{cancelledCount === 1 ? '' : 's'}</p><p className="text-xs">Click “Cancelled” above to review them separately.</p></div></div>
          <button onClick={() => setStatusFilter('CANCELLED')} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white">View Cancelled</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border bg-white p-4">
        <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order, customer, phone or email" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-xs"/></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border px-3 py-2.5 text-xs font-bold">
          <option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option><option value="PACKED">Packed</option><option value="SHIPPED">Shipped</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {errorMsg && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{errorMsg}</div>}

      {loading ? (
        <div className="p-16 text-center text-xs text-gray-400">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-3xl border bg-white p-12 text-center text-sm text-gray-500">No matching orders found.</div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(ord => {
            const cancelled = ord.order_status === 'CANCELLED';
            const delivered = ord.order_status === 'DELIVERED';
            return (
              <div key={ord.id} className={`rounded-2xl border p-5 shadow-xs ${cancelled ? 'border-red-300 bg-red-50/50' : 'border-gray-200 bg-white'}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-sm font-black text-indigo-950">{ord.order_number}</span>{cancelled && <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black text-white"><XCircle size={12}/> CUSTOMER CANCELLED</span>}{delivered && <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-black text-green-800"><CheckCircle2 size={12}/> DELIVERED</span>}</div>
                    <p className="text-[11px] text-gray-500 mt-1">{new Date(ord.created_at).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={ord.order_status || 'CONFIRMED'} onChange={e => handleUpdateStatus(ord.id, e.target.value)} disabled={cancelled} className={`rounded-lg border px-3 py-2 text-xs font-bold ${cancelled ? 'bg-red-100 text-red-700 cursor-not-allowed' : 'bg-gray-50'}`}>
                      <option value="PENDING">PENDING</option><option value="CONFIRMED">CONFIRMED</option><option value="PACKED">PACKED</option><option value="SHIPPED">SHIPPED</option><option value="DELIVERED">DELIVERED</option><option value="CANCELLED">CANCELLED</option>
                    </select>
                    {!cancelled && <Link href={`/admin/orders/${ord.id}/label`} target="_blank" className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700"><Printer size={13}/> Label</Link>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 py-4 text-xs">
                  <div><p className="text-[10px] uppercase font-bold text-gray-400">Customer</p><p className="font-bold text-gray-900">{ord.customer_name || 'Guest'}</p><p className="text-gray-600">{ord.customer_phone}</p><p className="text-gray-500">{ord.customer_email}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-gray-400">Payment</p><p className="font-bold">{ord.payment_method} • {ord.payment_status}</p><p className="text-lg font-black text-indigo-950 mt-1">₹{ord.grand_total}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-gray-400">Items</p><p className="font-bold flex items-center gap-1"><Package size={13}/>{ord.order_items?.length || ord.item_count || 0} line item(s)</p>{cancelled && <p className="mt-2 text-red-700 font-bold">Do not pack or dispatch this order.</p>}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
