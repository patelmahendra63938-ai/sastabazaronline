'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, Filter, ShoppingBag, Package, Truck, 
  CheckCircle2, Clock, RotateCcw, AlertCircle, Eye, Download 
} from 'lucide-react';

interface Props {
  initialOrders: any[];
  initialProducts: any[];
}

export default function AdminDashboardClient({ initialOrders, initialProducts }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Filter & Search Logic across Email, ID, Name, and Phone
  const filteredOrders = useMemo(() => {
    return initialOrders.filter((order) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = 
        !q ||
        order.order_number?.toLowerCase().includes(q) ||
        order.customer_email?.toLowerCase().includes(q) ||
        order.customer_name?.toLowerCase().includes(q) ||
        order.customer_phone?.toLowerCase().includes(q) ||
        order.id?.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || order.order_status === statusFilter;
      const matchPayment = paymentFilter === 'ALL' || order.payment_method === paymentFilter;

      return matchSearch && matchStatus && matchPayment;
    });
  }, [initialOrders, searchTerm, statusFilter, paymentFilter]);

  const totalRevenue = initialOrders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
  const totalUnitsSold = initialOrders.reduce((sum, o) => sum + Number(o.item_count || 1), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">DELIVERED</span>;
      case 'SHIPPED':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">SHIPPED</span>;
      case 'PACKED':
        return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">PACKED</span>;
      case 'RETURN_REQUESTED':
      case 'RETURNED':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">RETURN</span>;
      default:
        return <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">CONFIRMED</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <p className="text-xs text-gray-500 font-bold uppercase">Total Bookings</p>
          <p className="text-2xl font-black text-indigo-950 mt-1">{initialOrders.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <p className="text-xs text-gray-500 font-bold uppercase">Gross Revenue</p>
          <p className="text-2xl font-black text-indigo-950 mt-1">₹{totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <p className="text-xs text-gray-500 font-bold uppercase">Items Ordered</p>
          <p className="text-2xl font-black text-indigo-950 mt-1">{totalUnitsSold}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <p className="text-xs text-gray-500 font-bold uppercase">Catalogue SKUs</p>
          <p className="text-2xl font-black text-indigo-950 mt-1">{initialProducts.length}</p>
        </div>
      </div>

      {/* Search & Filter Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        
        {/* Multi-Field Search Bar */}
        <div className="relative flex-1 min-w-[280px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer email, name, phone, or order #..."
            className="w-full pl-10 pr-4 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold"
          >
            <option value="ALL">All Order Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PACKED">Packed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="RETURN_REQUESTED">Return Requested</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold"
          >
            <option value="ALL">All Payments</option>
            <option value="COD">COD</option>
            <option value="QR">UPI / QR</option>
          </select>
        </div>
      </div>

      {/* Orders Table with Customer Email Column */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-sm font-black text-indigo-950 uppercase tracking-wider">
            Live Order Book ({filteredOrders.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] border-b">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer Information</th>
                <th className="px-4 py-3">Products & Qty</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 font-semibold">
                    No orders matching the specified filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-4 py-3.5">
                      <p className="font-mono font-bold text-indigo-950">{ord.order_number}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>

                    {/* Customer Email & Phone Details */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-gray-900">{ord.customer_name || 'Guest User'}</p>
                      <p className="text-[11px] font-mono text-indigo-600 select-all">
                        {ord.customer_email || <span className="text-gray-400 italic">Email not available</span>}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">📱 {ord.customer_phone}</p>
                    </td>

                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="font-semibold text-gray-800 line-clamp-1">
                        {ord.order_items?.[0]?.product_title || 'Item'}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {ord.item_count || 1} Total Item(s)
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-bold text-gray-800">{ord.payment_method}</span>
                      <p className="text-[10px] text-gray-400">{ord.payment_status}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      {getStatusBadge(ord.order_status)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-black text-sm text-gray-900">
                      ₹{Number(ord.grand_total).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}