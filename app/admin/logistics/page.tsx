'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Package,
  Search,
  Truck,
  X,
} from 'lucide-react';
import { isCancelledOrderStatus } from '@/lib/orders/admin-order-status';

export default function LogisticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({ courier_id: '', awb: '', weight: '', cost: '', date: '' });
  const [manualTrackForm, setManualTrackForm] = useState({ status: 'IN_TRANSIT', location: '', description: '', event_time: '' });
  const [search, setSearch] = useState('');
  const [shipmentFilter, setShipmentFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ordData } = await supabase
        .from('orders')
        .select('*, shipments(*, courier_partners(*))')
        .order('created_at', { ascending: false });
      if (ordData) setOrders(ordData);

      const { data: courData } = await supabase
        .from('courier_partners')
        .select('*')
        .eq('active', true);
      if (courData) setCouriers(courData);
    } catch (err) {
      console.error('Failed to load logistics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isCancelledOrder = (order: any) =>
    isCancelledOrderStatus(order?.order_status);

  const openOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    if (order.shipments?.length) {
      const shipmentId = order.shipments[0].id;
      const { data: shipData } = await supabase
        .from('shipments')
        .select('*, courier_partners(*)')
        .eq('id', shipmentId)
        .single();
      setShipments(shipData ? [shipData] : []);

      const { data: trackData } = await supabase
        .from('shipment_tracking_events')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('event_time', { ascending: false });
      setTrackingEvents(trackData || []);
    } else {
      setShipments([]);
      setTrackingEvents([]);
    }
  };

  const handleAssignCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (isCancelledOrder(selectedOrder)) {
      alert('This order is CANCELLED. Courier/AWB assignment is blocked.');
      return;
    }
    if (!assignForm.courier_id || !assignForm.awb) {
      alert('Courier and AWB required');
      return;
    }

    try {
      const { error } = await supabase.rpc('assign_courier_to_shipment', {
        p_order_id: selectedOrder.id,
        p_courier_id: assignForm.courier_id,
        p_awb: assignForm.awb,
        p_weight: Number(assignForm.weight) || 0,
        p_cost: Number(assignForm.cost) || 0,
        p_expected_date: assignForm.date || null,
        p_admin_name: 'Admin User',
      });
      if (error) throw error;
      alert('Courier Assigned Successfully!');
      setAssignForm({ courier_id: '', awb: '', weight: '', cost: '', date: '' });
      await fetchData();
      await openOrderDetails(selectedOrder);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddTrackingEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !shipments.length) return;
    if (isCancelledOrder(selectedOrder)) {
      alert('This order is CANCELLED. Tracking updates are blocked.');
      return;
    }

    try {
      const eventTime = manualTrackForm.event_time
        ? new Date(manualTrackForm.event_time).toISOString()
        : new Date().toISOString();

      await supabase.from('shipment_tracking_events').insert([{
        shipment_id: shipments[0].id,
        status: manualTrackForm.status,
        location: manualTrackForm.location,
        description: manualTrackForm.description,
        event_time: eventTime,
        source: 'MANUAL',
        created_by: 'Admin User',
      }]);

      await supabase
        .from('shipments')
        .update({ shipment_status: manualTrackForm.status })
        .eq('id', shipments[0].id);

      if (manualTrackForm.status === 'DELIVERED') {
        await supabase
          .from('orders')
          .update({ order_status: 'DELIVERED' })
          .eq('id', selectedOrder.id);
      }

      alert('Tracking Event Added!');
      setManualTrackForm({ status: 'IN_TRANSIT', location: '', description: '', event_time: '' });
      await openOrderDetails(selectedOrder);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copied: ${text}`);
  };

  const getShipmentBadge = (status: string) => {
    const styles: Record<string, string> = {
      NOT_ASSIGNED: 'bg-gray-100 text-gray-600',
      COURIER_ASSIGNED: 'bg-blue-100 text-blue-700',
      PICKED_UP: 'bg-blue-100 text-blue-700',
      IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
      OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-700',
      DELIVERED: 'bg-green-100 text-green-700',
      DELAYED: 'bg-red-100 text-red-700',
      RTO_INITIATED: 'bg-rose-100 text-rose-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${styles[status] || styles.NOT_ASSIGNED}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const orderNumber = String(o.order_number || '');
      const customerName = String(o.customer_name || '');
      const awb = String(o.shipments?.[0]?.awb_number || '');
      const q = search.toLowerCase();
      const matchSearch =
        orderNumber.toLowerCase().includes(q) ||
        customerName.toLowerCase().includes(q) ||
        awb.toLowerCase().includes(q);

      if (shipmentFilter === 'CANCELLED') {
        return matchSearch && isCancelledOrder(o);
      }

      if (isCancelledOrder(o)) return false;

      const activeShipment = o.shipments?.[0]?.shipment_status || 'NOT_ASSIGNED';
      const matchStatus = shipmentFilter === 'ALL' || activeShipment === shipmentFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, shipmentFilter]);

  const activeOrders = orders.filter((o) => !isCancelledOrder(o));
  const cancelledCount = orders.filter(isCancelledOrder).length;
  const kpis = {
    toShip: activeOrders.filter((o) => !o.shipments || o.shipments.length === 0).length,
    inTransit: activeOrders.filter((o) => o.shipments?.[0]?.shipment_status === 'IN_TRANSIT').length,
    delivered: activeOrders.filter((o) => o.shipments?.[0]?.shipment_status === 'DELIVERED').length,
    cancelled: cancelledCount,
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-indigo-950 flex items-center gap-2">
              <Truck className="text-indigo-600" /> Logistics & Shipments
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage Couriers, AWBs, and monitor package tracking.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        <div className={`transition-all duration-300 ${selectedOrder ? 'lg:col-span-8 hidden lg:block' : 'col-span-12'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Ready to Ship</p>
              <p className="text-2xl font-black text-orange-600 mt-1">{kpis.toShip}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-[10px] font-bold text-gray-500 uppercase">In Transit</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{kpis.inTransit}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Delivered</p>
              <p className="text-2xl font-black text-green-600 mt-1">{kpis.delivered}</p>
            </div>
            <button
              type="button"
              onClick={() => setShipmentFilter('CANCELLED')}
              className="text-left bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm hover:bg-red-100 transition"
            >
              <p className="text-[10px] font-bold text-red-600 uppercase">Cancelled — Do Not Ship</p>
              <p className="text-2xl font-black text-red-700 mt-1">{kpis.cancelled}</p>
            </button>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search Order #, Customer, AWB..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
            <select
              value={shipmentFilter}
              onChange={(e) => setShipmentFilter(e.target.value)}
              className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-gray-50 font-bold text-gray-700 focus:outline-none"
            >
              <option value="ALL">Active Shipments</option>
              <option value="NOT_ASSIGNED">Not Assigned (Needs AWB)</option>
              <option value="COURIER_ASSIGNED">Courier Assigned</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="RTO_INITIATED">RTO Initiated</option>
              <option value="CANCELLED">Cancelled — Do Not Ship</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Order Info</th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Courier & AWB</th>
                    <th className="px-4 py-3.5">Tracking</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading logistics...</td></tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500 font-medium">No orders found matching your search.</td></tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const ship = order.shipments?.[0];
                      const cancelled = isCancelledOrder(order);
                      return (
                        <tr
                          key={order.id}
                          className={`border-l-4 border-l-transparent transition hover:bg-indigo-50/50 ${selectedOrder?.id === order.id && !cancelled ? 'bg-indigo-50 border-l-indigo-600' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-mono font-bold text-indigo-900">{order.order_number}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{new Date(order.created_at).toLocaleDateString('en-IN')}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-900 truncate max-w-[150px]">{order.customer_name}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[150px]">{order.shipping_address?.city || 'India'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold border px-2 py-1 rounded-md ${cancelled ? 'text-red-700 bg-red-100 border-red-200' : 'text-gray-600 bg-gray-100 border-gray-200'}`}>
                              {cancelled ? 'CANCELLED — DO NOT SHIP' : order.order_status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {cancelled ? (
                              <span className="text-[10px] text-red-700 font-bold bg-red-100 border border-red-200 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                                <X size={12} /> AWB BLOCKED
                              </span>
                            ) : ship ? (
                              <div>
                                <p className="font-bold text-gray-900 flex items-center gap-1.5"><Truck size={12} className="text-gray-400" /> {ship.courier_partners?.name}</p>
                                <p className="text-xs font-mono text-indigo-600 mt-0.5 font-semibold">{ship.awb_number}</p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-orange-600 font-bold bg-orange-50 border border-orange-200 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                                <AlertTriangle size={12} /> Assign AWB
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {cancelled ? getShipmentBadge('CANCELLED') : getShipmentBadge(ship?.shipment_status || 'NOT_ASSIGNED')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {cancelled ? (
                              <span className="text-[10px] font-bold text-red-600">Processing disabled</span>
                            ) : (
                              <button
                                onClick={() => openOrderDetails(order)}
                                className="bg-white border border-gray-300 text-gray-700 text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-300 transition"
                              >
                                Manage
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedOrder && (
          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-140px)] sticky top-24 z-20">
            <div className={`p-5 text-white flex justify-between items-center shrink-0 ${isCancelledOrder(selectedOrder) ? 'bg-red-700' : 'bg-indigo-950'}`}>
              <div>
                <h3 className="font-black tracking-wider text-base">{selectedOrder.order_number}</h3>
                <p className="text-[11px] mt-1 font-medium opacity-80">{selectedOrder.customer_name} • {selectedOrder.item_count || selectedOrder.order_items?.length || 0} Items</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 bg-black/20 hover:bg-black/30 rounded-lg text-white transition">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-6 bg-gray-50/50">
              {isCancelledOrder(selectedOrder) ? (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 text-center space-y-3">
                  <AlertTriangle className="mx-auto text-red-600" size={30} />
                  <h4 className="font-black text-red-800">CUSTOMER CANCELLED ORDER</h4>
                  <p className="text-xs text-red-700">Do not assign courier, do not generate AWB, and do not dispatch this order.</p>
                  <p className="text-[11px] font-bold text-red-600">All logistics actions are disabled.</p>
                </div>
              ) : shipments.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 border-b pb-3">
                    <Package className="text-orange-500" size={18} />
                    <h4 className="font-black text-sm text-gray-900">Assign Courier Partner</h4>
                  </div>
                  <form onSubmit={handleAssignCourier} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Select Courier *</label>
                      <select required value={assignForm.courier_id} onChange={(e) => setAssignForm({ ...assignForm, courier_id: e.target.value })} className="w-full text-sm border border-gray-300 rounded-lg p-2.5 font-bold bg-white">
                        <option value="">-- Choose Partner --</option>
                        {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">AWB / Tracking Number *</label>
                      <input required type="text" value={assignForm.awb} onChange={(e) => setAssignForm({ ...assignForm, awb: e.target.value })} className="w-full text-sm border border-gray-300 rounded-lg p-2.5 font-mono uppercase" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" value={assignForm.date} onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })} className="w-full text-xs border border-gray-300 rounded-lg p-2" />
                      <input type="number" step="0.1" value={assignForm.weight} onChange={(e) => setAssignForm({ ...assignForm, weight: e.target.value })} placeholder="Weight KG" className="w-full text-xs border border-gray-300 rounded-lg p-2" />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-lg">Save & Generate Tracking</button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase">Logistics Partner</p>
                        <p className="font-black text-gray-900 mt-1 text-lg flex items-center gap-2"><Truck size={16} /> {shipments[0].courier_partners?.name}</p>
                      </div>
                      {getShipmentBadge(shipments[0].shipment_status)}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">AWB Tracking Number</p>
                        <p className="font-mono font-black text-indigo-900 text-base">{shipments[0].awb_number}</p>
                      </div>
                      <button onClick={() => copyToClipboard(shipments[0].awb_number)} className="p-2 bg-white border border-gray-200 rounded-lg"><Copy size={16} /></button>
                    </div>
                    {shipments[0].tracking_url && (
                      <a href={shipments[0].tracking_url} target="_blank" rel="noopener noreferrer" className="mt-4 w-full bg-indigo-50 text-indigo-700 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 border border-indigo-100">
                        <ExternalLink size={14} /> View Official Tracking Page
                      </a>
                    )}
                  </div>

                  {shipments[0].shipment_status !== 'DELIVERED' && (
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPin size={16} className="text-orange-500" /> Log Manual Update</p>
                      <form onSubmit={handleAddTrackingEvent} className="space-y-3">
                        <select value={manualTrackForm.status} onChange={(e) => setManualTrackForm({ ...manualTrackForm, status: e.target.value })} className="w-full text-xs border border-gray-300 rounded-lg p-2.5">
                          <option value="PICKED_UP">Picked Up</option>
                          <option value="IN_TRANSIT">In Transit</option>
                          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="DELAYED">Delayed</option>
                          <option value="RTO_INITIATED">RTO Initiated</option>
                        </select>
                        <input type="datetime-local" value={manualTrackForm.event_time} onChange={(e) => setManualTrackForm({ ...manualTrackForm, event_time: e.target.value })} className="w-full text-xs border border-gray-300 rounded-lg p-2.5" />
                        <input required type="text" placeholder="Location" value={manualTrackForm.location} onChange={(e) => setManualTrackForm({ ...manualTrackForm, location: e.target.value })} className="w-full text-sm border border-gray-300 rounded-lg p-2.5" />
                        <input required type="text" placeholder="Tracking note" value={manualTrackForm.description} onChange={(e) => setManualTrackForm({ ...manualTrackForm, description: e.target.value })} className="w-full text-sm border border-gray-300 rounded-lg p-2.5" />
                        <button type="submit" className="w-full bg-gray-900 text-white font-bold text-xs py-3 rounded-lg">Add Status Update</button>
                      </form>
                    </div>
                  )}

                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock size={16} className="text-blue-500" /> Tracking History</p>
                    <div className="space-y-3">
                      {trackingEvents.map((evt, idx) => (
                        <div key={evt.id} className={`rounded-lg border p-3 ${idx === 0 ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-200'}`}>
                          <div className="flex justify-between gap-2">
                            <span className="text-[11px] font-black uppercase">{evt.status.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-gray-400">{new Date(evt.event_time).toLocaleString('en-IN')}</span>
                          </div>
                          <p className="text-xs text-gray-700 mt-1">{evt.description}</p>
                          {evt.location && <p className="text-[10px] text-gray-500 mt-1">{evt.location}</p>}
                        </div>
                      ))}
                      {trackingEvents.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No tracking events recorded yet.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </main>
  );
}
