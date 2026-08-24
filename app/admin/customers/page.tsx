'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, Mail, Phone, MapPin, ShoppingBag, 
  Search, RefreshCw, Loader2, Calendar, IndianRupee, ArrowUpDown,
  X, Package, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import OrderStatusBadge from '@/components/admin/OrderStatusBadge';

interface CustomerRecord {
  email: string;
  name: string;
  phone: string;
  latest_address: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'spent' | 'orders'>('recent');

  // Customer Orders Drilldown Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // 1. Fetch from unified customer directory view
      const { data, error } = await supabase
        .from('customer_directory')
        .select('*');

      if (!error && data) {
        setCustomers(data);
      } else {
        // Fallback: Directly aggregate from orders table if view is not yet cached
        const { data: ordersData, error: ordersErr } = await supabase
          .from('orders')
          .select('customer_name, customer_email, customer_phone, shipping_address, address, grand_total, created_at')
          .order('created_at', { ascending: false });

        if (ordersErr) throw ordersErr;

        const customerMap = new Map<string, CustomerRecord>();

        (ordersData || []).forEach((ord: any) => {
          const emailKey = (ord.customer_email || ord.customer_phone || 'guest').toLowerCase().trim();
          
          let formattedAddress = 'Address not provided';
          if (ord.shipping_address && typeof ord.shipping_address === 'object') {
            formattedAddress = `${ord.shipping_address.address || ''}, ${ord.shipping_address.city || ''}, ${ord.shipping_address.state || ''} - ${ord.shipping_address.pincode || ''}`;
          } else if (ord.address) {
            formattedAddress = ord.address;
          }

          if (customerMap.has(emailKey)) {
            const existing = customerMap.get(emailKey)!;
            existing.total_orders += 1;
            existing.total_spent += Number(ord.grand_total || 0);
            if (!existing.phone || existing.phone === 'N/A') existing.phone = ord.customer_phone;
          } else {
            customerMap.set(emailKey, {
              email: ord.customer_email || 'No email recorded',
              name: ord.customer_name || 'Valued Customer',
              phone: ord.customer_phone || 'N/A',
              latest_address: formattedAddress,
              total_orders: 1,
              total_spent: Number(ord.grand_total || 0),
              last_order_date: ord.created_at,
            });
          }
        });

        setCustomers(Array.from(customerMap.values()));
      }
    } catch (err: any) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch all orders for a specific customer
  const handleOpenCustomerOrders = async (cust: CustomerRecord) => {
    setSelectedCustomer(cust);
    setIsModalOpen(true);
    setLoadingOrders(true);

    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (cust.email && cust.email !== 'No email recorded' && cust.email !== 'guest@sastabazaronline.in') {
        query = query.eq('customer_email', cust.email);
      } else if (cust.phone && cust.phone !== 'N/A') {
        query = query.eq('customer_phone', cust.phone);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCustomerOrders(data || []);
    } catch (err: any) {
      console.error('Error fetching customer orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Filter & Search
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const q = searchTerm.toLowerCase().trim();
        return (
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.latest_address.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'spent') return b.total_spent - a.total_spent;
        if (sortBy === 'orders') return b.total_orders - a.total_orders;
        return new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime();
      });
  }, [customers, searchTerm, sortBy]);

  const totalRevenue = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-950 flex items-center gap-2">
            <Users className="text-orange-500" size={24} /> Customer Directory & CRM
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Auto-synced directory of customers with verified Email, Mobile, Delivery Address, and Order Value.
          </p>
        </div>
        <button
          onClick={fetchCustomers}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition shadow-2xs cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Customers</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <p className="text-xs text-gray-500 font-bold uppercase">Total Unique Customers</p>
          <p className="text-2xl font-black text-indigo-950 mt-1">{customers.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <p className="text-xs text-gray-500 font-bold uppercase">Total Customer Orders</p>
          <p className="text-2xl font-black text-indigo-950 mt-1">
            {customers.reduce((acc, c) => acc + c.total_orders, 0)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <p className="text-xs text-gray-500 font-bold uppercase">Customer Lifetime Value</p>
          <p className="text-2xl font-black text-orange-600 mt-1">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Search and Sort Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, email, mobile number, or city/address..."
            className="w-full pl-10 pr-4 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown size={14} className="text-gray-400" />
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="border rounded-xl px-3 py-2 bg-white text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="recent">Sort by: Most Recent Order</option>
            <option value="spent">Sort by: Highest Spent (₹)</option>
            <option value="orders">Sort by: Most Orders</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
            All Customers ({filteredCustomers.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-orange-500" />
            <span>Loading customer directory from database...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No customer records found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="px-4 py-3.5">Customer Name & Contact</th>
                  <th className="px-4 py-3.5">Delivery Address</th>
                  <th className="px-4 py-3.5 text-center">Orders Placed</th>
                  <th className="px-4 py-3.5">Total Spent</th>
                  <th className="px-4 py-3.5">Last Order Date</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((cust, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition">
                    
                    {/* Name, Email, Phone */}
                    <td className="px-4 py-3.5 space-y-1">
                      <p className="font-bold text-gray-900 text-xs">{cust.name}</p>
                      <p className="text-[11px] font-mono text-indigo-600 flex items-center gap-1">
                        <Mail size={12} className="shrink-0 text-gray-400" />
                        <span>{cust.email}</span>
                      </p>
                      <p className="text-[11px] font-mono text-green-700 flex items-center gap-1">
                        <Phone size={12} className="shrink-0 text-gray-400" />
                        <span>{cust.phone}</span>
                      </p>
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="text-gray-700 leading-relaxed flex items-start gap-1.5 text-[11px]">
                        <MapPin size={13} className="text-orange-500 shrink-0 mt-0.5" />
                        <span>{cust.latest_address}</span>
                      </p>
                    </td>

                    {/* Clickable Total Orders Badge */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleOpenCustomerOrders(cust)}
                        className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold px-3 py-1 rounded-xl border border-indigo-200 transition cursor-pointer shadow-2xs"
                      >
                        <ShoppingBag size={12} className="text-indigo-600" />
                        <span>{cust.total_orders} {cust.total_orders === 1 ? 'Order' : 'Orders'}</span>
                      </button>
                    </td>

                    {/* Total Spent */}
                    <td className="px-4 py-3.5 font-black text-orange-600 text-sm">
                      ₹{Number(cust.total_spent).toLocaleString('en-IN')}
                    </td>

                    {/* Last Order Date */}
                    <td className="px-4 py-3.5 text-gray-500 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-gray-400" />
                        <span>
                          {new Date(cust.last_order_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Action Button */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenCustomerOrders(cust)}
                        className="px-3 py-1.5 text-[11px] font-bold bg-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 text-gray-700 border border-gray-200 rounded-xl transition cursor-pointer"
                      >
                        View Orders
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CUSTOMER ORDERS DRILLDOWN MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div>
                <h3 className="text-base font-black text-indigo-950 flex items-center gap-2">
                  <Package className="text-orange-500" size={18} />
                  Orders for {selectedCustomer.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedCustomer.email} • {selectedCustomer.phone}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Order List */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              {loadingOrders ? (
                <div className="p-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 size={24} className="animate-spin text-orange-500" />
                  <span>Loading customer order records...</span>
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="p-10 text-center text-xs text-gray-500">
                  No individual order records found for this customer.
                </div>
              ) : (
                customerOrders.map((ord) => {
                  const items = ord.order_items || [];
                  const orderDate = new Date(ord.created_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  });

                  return (
                    <div key={ord.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 shadow-2xs hover:border-gray-300 transition">
                      
                      {/* Order Metadata Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-950 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                            {ord.order_number || ord.order_id || ord.id.slice(0, 8)}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {orderDate}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={ord.order_status} />
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                            {ord.payment_method || 'COD'} ({ord.payment_status || 'PENDING'})
                          </span>
                        </div>
                      </div>

                      {/* Items Ordered */}
                      <div className="space-y-1.5">
                        {items.map((item: any, iIdx: number) => (
                          <div key={iIdx} className="flex justify-between items-center text-xs bg-gray-50/70 p-2 rounded-xl">
                            <div className="flex items-center gap-2">
                              <Package size={13} className="text-indigo-600 shrink-0" />
                              <span className="font-bold text-gray-800">{item.product_title}</span>
                              <span className="text-[11px] text-gray-500 font-semibold">
                                (Size: {item.size || 'Free Size'}, Qty: {item.quantity})
                              </span>
                            </div>
                            <span className="font-bold text-indigo-950">
                              ₹{item.line_total || (item.unit_price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Order Footer Summary */}
                      <div className="flex justify-between items-center pt-2 text-xs">
                        <span className="text-gray-500 text-[11px]">
                          Shipping: <b className="text-gray-800">{ord.shipping_charge === 0 ? 'FREE' : `₹${ord.shipping_charge}`}</b>
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-indigo-950">
                            Total: <span className="text-orange-600">₹{ord.grand_total || ord.total_amount}</span>
                          </span>
                          <Link
                            href="/admin/orders"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-950 hover:underline"
                          >
                            Manage in Orders <ChevronRight size={12} />
                          </Link>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-xs font-bold bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}