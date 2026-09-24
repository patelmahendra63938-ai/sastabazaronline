'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Package, Loader2, Calendar } from 'lucide-react';
import { isCancelledOrderStatus } from '@/lib/orders/admin-order-status';

export default function AdminReportsPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    grossSales: 0,
    totalItems: 0,
    deliveredOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    cancelledAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('ALL');
  const [abandoned, setAbandoned] = useState<any[]>([]);
  const [commerce, setCommerce] = useState({
    cartEvents: 0,
    cartVisitors: 0,
    cartSessions: 0,
    checkoutVisitors: 0,
    purchaseVisitors: 0,
    checkoutRateFromCart: 0,
    purchaseRateFromCart: 0,
    trackedPurchaseValue: 0
  });

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      const [ordersResult, commerceResponse, abandonedResponse] = await Promise.all([
        supabase.from('orders').select('*, order_items(quantity)'),
        fetch('/api/admin/commerce-summary?range=' + encodeURIComponent(timeRange), { cache: 'no-store' }),
        fetch('/api/admin/abandoned-checkouts?range=' + encodeURIComponent(timeRange), { cache: 'no-store' })
      ]);
      const { data: orders, error } = ordersResult;

      if (commerceResponse.ok) {
        const commerceData = await commerceResponse.json();
        setCommerce(commerceData);
      }

      if (abandonedResponse.ok) {
        const abandonedData = await abandonedResponse.json();
        setAbandoned(Array.isArray(abandonedData.rows) ? abandonedData.rows : []);
      }

      if (!error && orders) {
        const gross = orders.filter(o => !isCancelledOrderStatus(o.order_status)).reduce((sum, o) => sum + Number(o.grand_total || o.total_amount || 0), 0);
        const activeOrders = orders.filter(o => !isCancelledOrderStatus(o.order_status));
        const totalQty = activeOrders.reduce((sum, order) => sum + (order.order_items || []).reduce((itemSum: number, item: any) => itemSum + Number(item.quantity || 1), 0), 0);
        const cancelledOrders = orders.filter(o => isCancelledOrderStatus(o.order_status));
        const cancelledAmount = cancelledOrders.reduce((sum, o) => sum + Number(o.grand_total || o.total_amount || 0), 0);
        const delivered = orders.filter(o => o.order_status === 'DELIVERED').length;
        const pending = orders.filter(o => o.order_status === 'PENDING' || !o.order_status).length;

        setStats({
          totalOrders: orders.length,
          grossSales: gross,
          totalItems: totalQty,
          deliveredOrders: delivered,
          pendingOrders: pending,
          cancelledOrders: cancelledOrders.length,
          cancelledAmount
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
            <p className="text-[10px] text-green-600 font-bold">Revenue excluding cancelled orders</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-bold uppercase">Total Bookings</span>
              <ShoppingCart size={20} className="text-blue-600" />
            </div>
            <p className="text-2xl font-black text-indigo-950">{stats.totalOrders}</p>
            <p className="text-[10px] text-blue-600 font-bold">All customer orders</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-bold uppercase">Items Dispatched</span>
              <Package size={20} className="text-orange-600" />
            </div>
            <p className="text-2xl font-black text-indigo-950">{stats.totalItems}</p>
            <p className="text-[10px] text-orange-600 font-bold">Units excluding cancelled orders</p>
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


      {!loading && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-indigo-950">Cart & Conversion Funnel</h2>
            <p className="mt-1 text-xs text-gray-500">
              First-party website data stored in Supabase. Unique visitors are browser-based visitor IDs, not personally identified customers.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase text-gray-500">People Added to Cart</p>
              <p className="mt-2 text-3xl font-black text-indigo-950">{commerce.cartVisitors}</p>
              <p className="mt-1 text-[10px] font-bold text-blue-600">{commerce.cartEvents} add-to-cart events • {commerce.cartSessions} sessions</p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase text-gray-500">Reached Checkout</p>
              <p className="mt-2 text-3xl font-black text-indigo-950">{commerce.checkoutVisitors}</p>
              <p className="mt-1 text-[10px] font-bold text-purple-600">{commerce.checkoutRateFromCart.toFixed(1)}% of cart visitors</p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase text-gray-500">Purchased</p>
              <p className="mt-2 text-3xl font-black text-indigo-950">{commerce.purchaseVisitors}</p>
              <p className="mt-1 text-[10px] font-bold text-green-600">{commerce.purchaseRateFromCart.toFixed(1)}% of cart visitors</p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase text-gray-500">Tracked Purchase Value</p>
              <p className="mt-2 text-3xl font-black text-indigo-950">₹{Number(commerce.trackedPurchaseValue || 0).toLocaleString()}</p>
              <p className="mt-1 text-[10px] font-bold text-gray-500">From first-party purchase events</p>
            </div>
          </div>
        </div>
      )}


      {!loading && (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-black text-indigo-950">Abandoned Checkouts</h2>
            <p className="mt-1 text-xs text-gray-500">
              Customers who entered a valid phone number or email at checkout but have not completed an order yet.
            </p>
          </div>
          {abandoned.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs font-medium text-gray-500">
              No abandoned checkout customer details captured in this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Phone / Email</th>
                    <th className="px-4 py-3">Delivery Address</th>
                    <th className="px-4 py-3">Cart</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {abandoned.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="px-4 py-3 font-bold text-gray-900">{row.full_name || 'Name not entered'}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{row.phone || '—'}</div>
                        <div className="mt-1 text-gray-500">{row.email || '—'}</div>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-gray-600">
                        {[row.address, row.city, row.state, row.pincode].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {Array.isArray(row.cart) && row.cart.length
                          ? row.cart.map((item: any) => `${item.title || 'Product'} × ${item.quantity || 1}`).join(', ')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-black text-indigo-950">₹{Number(row.cart_value || 0).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                        {row.last_activity_at ? new Date(row.last_activity_at).toLocaleString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-xs font-black uppercase text-red-700">Cancelled Orders</p>
          <p className="mt-1 text-2xl font-black text-red-800">{stats.cancelledOrders}</p>
          <p className="text-xs font-bold text-red-600">₹{stats.cancelledAmount.toLocaleString()} excluded from revenue and dispatched units</p>
        </div>
      )}
    </div>
  );
}