'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Package, Loader2, Calendar } from 'lucide-react';

export default function AdminReportsPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    grossSales: 0,
    totalItems: 0,
    deliveredOrders: 0,
    pendingOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('ALL');

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      const { data: orders, error } = await supabase.from('orders').select('*');
      const { data: items } = await supabase.from('order_items').select('quantity');

      if (!error && orders) {
        const gross = orders.reduce((sum, o) => sum + Number(o.grand_total || o.total_amount || 0), 0);
        const totalQty = items ? items.reduce((sum, i) => sum + Number(i.quantity || 1), 0) : 0;
        const delivered = orders.filter(o => o.order_status === 'DELIVERED').length;
        const pending = orders.filter(o => o.order_status === 'PENDING' || !o.order_status).length;

        setStats({
          totalOrders: orders.length,
          grossSales: gross,
          totalItems: totalQty,
          deliveredOrders: delivered,
          pendingOrders: pending
        });
      }
      setLoading(false);
    };
    fetchReportData();
  }, [timeRange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-950">Business Reports & Financial Summary</h1>
          <p className="text-xs text-gray-500 mt-1">Live analytics derived directly from verified database records.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-xl shadow-sm text-xs font-bold text-gray-700">
          <Calendar size={14} className="text-indigo-600" />
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="bg-transparent outline-none">
            <option value="ALL">All Time Data</option>
            <option value="30D">Last 30 Days</option>
            <option value="7D">Last 7 Days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Calculating live analytics...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-bold uppercase">Gross Revenue</span>
              <DollarSign size={20} className="text-green-600" />
            </div>
            <p className="text-2xl font-black text-indigo-950">₹{stats.grossSales.toLocaleString()}</p>
            <p className="text-[10px] text-green-600 font-bold">Total revenue across all orders</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-bold uppercase">Total Bookings</span>
              <ShoppingCart size={20} className="text-blue-600" />
            </div>
            <p className="text-2xl font-black text-indigo-950">{stats.totalOrders}</p>
            <p className="text-[10px] text-blue-600 font-bold">Successful customer orders</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-bold uppercase">Items Dispatched</span>
              <Package size={20} className="text-orange-600" />
            </div>
            <p className="text-2xl font-black text-indigo-950">{stats.totalItems}</p>
            <p className="text-[10px] text-orange-600 font-bold">Total product units sold</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-bold uppercase">Delivered / Pending</span>
              <TrendingUp size={20} className="text-purple-600" />
            </div>
            <p className="text-2xl font-black text-indigo-950">{stats.deliveredOrders} <span className="text-xs text-gray-400 font-normal">/ {stats.pendingOrders}</span></p>
            <p className="text-[10px] text-purple-600 font-bold">Fulfillment ratio</p>
          </div>
        </div>
      )}
    </div>
  );
}