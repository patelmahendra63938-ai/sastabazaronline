'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { 
  Package, ShoppingCart, TrendingUp, AlertTriangle, CheckCircle2, 
  Clock, Truck, RotateCcw, XCircle, Search, Filter, Download, 
  ExternalLink, ChevronRight, ArrowUpDown, RefreshCw, Plus, Edit3, Eye,
  FileText, ShieldCheck, Box, History, Layers, IndianRupee, ArrowLeft, PlusCircle
} from 'lucide-react';
import Link from 'next/link';

export default function AdminOrderInventoryDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'movements' | 'reorder'>('orders');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [adjustModalProduct, setAdjustModalProduct] = useState<any | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<string>('MANUAL_ADJUSTMENT');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  const [courierInput, setCourierInput] = useState('');
  const [trackingInput, setTrackingInput] = useState('');

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  const [invSearch, setInvSearch] = useState('');
  const [invCategoryFilter, setInvCategoryFilter] = useState('ALL');
  const [invStockStatusFilter, setInvStockStatusFilter] = useState('ALL');

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      if (ordersData) setOrders(ordersData);

      const { data: invData } = await supabase
        .from('inventory')
        .select('*, products(id, title, price, category, images, hsn_code, gst_rate)')
        .order('available_quantity', { ascending: true });
      if (invData) setInventoryList(invData);

      const { data: movData } = await supabase
        .from('inventory_movements')
        .select('*, products(title)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (movData) setMovements(movData);

    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const kpis = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(today));
    const totalRevenue = orders.filter(o => o.order_status !== 'CANCELLED').reduce((acc, o) => acc + Number(o.grand_total || 0), 0);
    const todayRevenue = todayOrders.filter(o => o.order_status !== 'CANCELLED').reduce((acc, o) => acc + Number(o.grand_total || 0), 0);

    const pendingCount = orders.filter(o => o.order_status === 'PENDING').length;
    const toPackCount = orders.filter(o => o.order_status === 'CONFIRMED').length;

    const totalAvailableStock = inventoryList.reduce((acc, i) => acc + (i.available_quantity || 0), 0);
    const totalReservedStock = inventoryList.reduce((acc, i) => acc + (i.reserved_quantity || 0), 0);
    const lowStockCount = inventoryList.filter(i => i.available_quantity > 0 && i.available_quantity <= i.reorder_level).length;
    const outOfStockCount = inventoryList.filter(i => i.available_quantity === 0).length;

    const totalInventoryValue = inventoryList.reduce((acc, i) => {
      const price = Number(i.products?.price || 0);
      return acc + (price * (i.available_quantity || 0));
    }, 0);

    return {
      totalRevenue,
      todayRevenue,
      totalOrders: orders.length,
      todayOrdersCount: todayOrders.length,
      pendingCount,
      toPackCount,
      totalAvailableStock,
      totalReservedStock,
      lowStockCount,
      outOfStockCount,
      totalInventoryValue
    };
  }, [orders, inventoryList]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!confirm(`Transition order status to ${newStatus}?`)) return;
    setActionLoading(true);

    try {
      const { error } = await supabase.rpc('update_order_status_workflow', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_actor: 'ADMIN_DASHBOARD',
        p_notes: `Status updated to ${newStatus} via Admin Console`,
        p_courier: courierInput || null,
        p_tracking: trackingInput || null
      });

      if (error) throw error;
      alert(`Order updated to ${newStatus} successfully!`);
      setSelectedOrder(null);
      fetchData();
    } catch (err: any) {
      alert(`Workflow Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct || adjustQty === 0) return;
    setActionLoading(true);

    try {
      const { error } = await supabase.rpc('adjust_inventory_stock', {
        p_product_id: adjustModalProduct.product_id,
        p_quantity_delta: parseInt(adjustQty.toString()),
        p_movement_type: adjustType,
        p_notes: adjustNotes || 'Manual stock adjustment from Admin console',
        p_created_by: 'ADMIN'
      });

      if (error) throw error;
      alert('Stock adjusted successfully!');
      setAdjustModalProduct(null);
      setAdjustQty(0);
      setAdjustNotes('');
      fetchData();
    } catch (err: any) {
      alert(`Adjustment Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        (order.order_number && order.order_number.toLowerCase().includes(orderSearch.toLowerCase())) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(orderSearch.toLowerCase())) ||
        (order.customer_phone && order.customer_phone.includes(orderSearch));
      
      const matchesStatus = orderStatusFilter === 'ALL' || order.order_status === orderStatusFilter;
      const matchesPayment = paymentFilter === 'ALL' || order.payment_status === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, orderSearch, orderStatusFilter, paymentFilter]);

  const filteredInventory = useMemo(() => {
    return inventoryList.filter(item => {
      const title = item.products?.title || '';
      const category = item.products?.category || '';
      const matchesSearch = title.toLowerCase().includes(invSearch.toLowerCase());
      const matchesCategory = invCategoryFilter === 'ALL' || category === invCategoryFilter;
      
      let matchesStock = true;
      if (invStockStatusFilter === 'LOW') matchesStock = item.available_quantity > 0 && item.available_quantity <= item.reorder_level;
      if (invStockStatusFilter === 'OUT') matchesStock = item.available_quantity === 0;
      if (invStockStatusFilter === 'IN') matchesStock = item.available_quantity > item.reorder_level;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [inventoryList, invSearch, invCategoryFilter, invStockStatusFilter]);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col font-sans" suppressHydrationWarning>
      <Header />

      {/* Top Header with Prominent Add Product Button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-950 text-white text-xs font-black px-2 py-0.5 rounded">ADMIN</span>
              <h1 className="text-xl sm:text-2xl font-black text-indigo-950">Sastabazar Control Panel</h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Real-time Order Book, Inventory Ledger, and Product Management</p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData} 
              disabled={refreshing}
              className="p-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>

            {/* ⭐ PROMINENT ADD NEW PRODUCT BUTTON ⭐ */}
            <Link 
              href="/admin/add-product" 
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-black px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <PlusCircle size={16} /> + Add New Product
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Today Revenue</p>
            <p className="text-lg sm:text-xl font-black text-indigo-950 mt-1">₹{kpis.todayRevenue.toLocaleString()}</p>
            <span className="text-[10px] text-gray-400 font-semibold">{kpis.todayOrdersCount} orders</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Action Required</p>
            <p className="text-lg sm:text-xl font-black text-orange-600 mt-1">{kpis.pendingCount + kpis.toPackCount}</p>
            <span className="text-[10px] text-gray-400">{kpis.pendingCount} Pending | {kpis.toPackCount} Ready</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Available Stock</p>
            <p className="text-lg sm:text-xl font-black text-green-700 mt-1">{kpis.totalAvailableStock.toLocaleString()}</p>
            <span className="text-[10px] text-gray-400 font-semibold">{inventoryList.length} items</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Low Stock</p>
            <p className="text-lg sm:text-xl font-black text-red-600 mt-1">{kpis.lowStockCount + kpis.outOfStockCount}</p>
            <span className="text-[10px] text-gray-400">{kpis.lowStockCount} Low | {kpis.outOfStockCount} Out</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Total Orders</p>
            <p className="text-lg sm:text-xl font-black text-indigo-900 mt-1">{kpis.totalOrders}</p>
            <span className="text-[10px] text-gray-400 font-semibold">Lifetime bookings</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Inventory Value</p>
            <p className="text-lg sm:text-xl font-black text-indigo-900 mt-1">₹{kpis.totalInventoryValue.toLocaleString()}</p>
            <span className="text-[10px] text-gray-400 font-semibold">At Selling Price</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 gap-6">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'orders' ? 'border-indigo-600 text-indigo-950' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <ShoppingCart size={16} /> Order Book ({orders.length})
          </button>

          <button 
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'inventory' ? 'border-indigo-600 text-indigo-950' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <Package size={16} /> Inventory Ledger ({inventoryList.length})
          </button>

          <button 
            onClick={() => setActiveTab('movements')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'movements' ? 'border-indigo-600 text-indigo-950' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <History size={16} /> Stock Movements Audit
          </button>
        </div>

        {/* TAB 1: ORDER BOOK */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search Order #, Name, Phone..." 
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <select 
                  value={orderStatusFilter} 
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border rounded-xl bg-white font-bold text-gray-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <Link 
                href="/admin/add-product"
                className="w-full sm:w-auto bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Plus size={14} /> Add Product
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-600 font-bold uppercase text-[10px]">
                      <th className="p-3.5">Order #</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Grand Total</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">No matching orders found.</td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/80 transition">
                          <td className="p-3.5 font-mono font-bold text-indigo-950">{order.order_number}</td>
                          <td className="p-3.5 text-gray-500">{new Date(order.created_at).toLocaleDateString('en-IN')}</td>
                          <td className="p-3.5 font-bold text-gray-900">{order.customer_name}</td>
                          <td className="p-3.5 font-bold text-gray-950">₹{order.grand_total}</td>
                          <td className="p-3.5 font-bold text-indigo-700">{order.order_status}</td>
                          <td className="p-3.5 text-right">
                            <button 
                              onClick={() => setSelectedOrder(order)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-200"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY LEDGER */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search product title..." 
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Add Product Shortcut Button */}
              <Link 
                href="/admin/add-product"
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <Plus size={14} /> + Add New Product
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-600 font-bold uppercase text-[10px]">
                      <th className="p-3.5">Product</th>
                      <th className="p-3.5">Size/Variant</th>
                      <th className="p-3.5">Available Stock</th>
                      <th className="p-3.5">Sold</th>
                      <th className="p-3.5 text-right">Adjust Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInventory.map((item) => (
                      <tr key={item.id || item.product_id} className="hover:bg-gray-50/80 transition">
                        <td className="p-3.5 font-bold text-gray-900">{item.products?.title}</td>
                        <td className="p-3.5 font-bold text-indigo-700">{item.size || 'Free Size'}</td>
                        <td className="p-3.5 font-bold text-sm text-green-700">{item.available_quantity}</td>
                        <td className="p-3.5 text-gray-600">{item.sold_quantity || 0}</td>
                        <td className="p-3.5 text-right">
                          <button 
                            onClick={() => setAdjustModalProduct(item)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      <Footer />
    </main>
  );
}