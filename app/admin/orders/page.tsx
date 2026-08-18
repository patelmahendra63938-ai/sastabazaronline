'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShoppingCart, RefreshCw, User, Phone, MapPin, Package, 
  Loader2, Clock, QrCode, X, Printer
} from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qrModalOrder, setQrModalOrder] = useState<any | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Error fetching admin orders:', err);
      setErrorMsg(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-950 flex items-center gap-2">
            <ShoppingCart className="text-orange-500" size={24} /> Live Order Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time customer orders with parcel label generation and QR barcode integration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/scan"
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-950 px-3.5 py-2 rounded-xl hover:bg-indigo-900 transition shadow-xs"
          >
            <QrCode size={14} className="text-orange-400" />
            <span>Open Mobile Scanner</span>
          </Link>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3.5 py-2 rounded-xl hover:bg-gray-50 transition shadow-xs cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
          <Loader2 size={24} className="animate-spin text-orange-500" />
          <span>Loading orders from database...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto">
            <Clock size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900">No Orders Recorded</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Placed customer orders will immediately display here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => {
            const items = ord.order_items || [];
            const shippingAddr = typeof ord.shipping_address === 'object'
              ? `${ord.shipping_address?.address || ''}, ${ord.shipping_address?.city || ''} - ${ord.shipping_address?.pincode || ''}`
              : ord.shipping_address || ord.address || 'Address not provided';
            const orderNum = ord.order_number || ord.order_id || ord.id.slice(0, 8);

            return (
              <div key={ord.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4 hover:border-gray-300 transition">
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-3 gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setQrModalOrder(ord)}
                      title="Click to view large scannable QR"
                      className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl transition flex items-center gap-1 text-[11px] font-bold cursor-pointer shadow-2xs"
                    >
                      <QrCode size={16} />
                      <span className="hidden sm:inline">QR Scan</span>
                    </button>

                    <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-100">
                      {orderNum}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {new Date(ord.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/orders/${ord.id}/label`}
                      target="_blank"
                      className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                    >
                      <Printer size={13} />
                      <span>Print Label</span>
                    </Link>

                    <select
                      value={ord.order_status || 'CONFIRMED'}
                      onChange={(e) => handleUpdateStatus(ord.id, e.target.value)}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none"
                    >
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PACKED">PACKED</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                      {ord.payment_method || 'COD'}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50/80 p-3.5 rounded-xl">
                  <div>
                    <p className="font-bold text-gray-900 flex items-center gap-1.5">
                      <User size={13} className="text-indigo-600" /> {ord.customer_name || 'Guest Customer'}
                    </p>
                    <p className="text-gray-600 flex items-center gap-1.5 mt-0.5">
                      <Phone size={13} className="text-green-600" /> {ord.customer_phone || ord.phone || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500 flex items-center gap-1.5">
                      <MapPin size={13} className="text-red-500" /> Shipping Address:
                    </p>
                    <p className="text-gray-800 mt-0.5">{shippingAddr}</p>
                  </div>
                </div>

                {/* Items Breakdown */}
                {items.length > 0 && (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    {items.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs bg-white">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-gray-400" />
                          <div>
                            <span className="font-bold text-gray-800">{item.product_title}</span>
                            <span className="text-[11px] text-gray-500 ml-2">
                              (Size: {item.size || 'Free Size'}, Qty: {item.quantity})
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-indigo-950">₹{item.line_total || (item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Total */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
                  <span className="text-gray-500">Payment Status: <b className="text-gray-800">{ord.payment_status || 'PENDING'}</b></span>
                  <span className="text-sm font-black text-indigo-950">
                    Grand Total: <span className="text-orange-600">₹{ord.grand_total || ord.total_amount}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Big QR Code Modal */}
      {qrModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-200 text-center space-y-4 relative">
            <button
              onClick={() => setQrModalOrder(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block">
                Parcel Packing QR Code
              </span>
              <h3 className="text-lg font-black text-indigo-950 mt-0.5">
                {qrModalOrder.order_number || qrModalOrder.order_id || qrModalOrder.id.slice(0, 8)}
              </h3>
              <p className="text-xs text-gray-500">{qrModalOrder.customer_name} • ₹{qrModalOrder.grand_total || qrModalOrder.total_amount}</p>
            </div>

            <div className="bg-white p-4 border-2 border-dashed border-indigo-200 rounded-2xl inline-block shadow-inner">
              <QRCodeSVG
                value={qrModalOrder.order_number || qrModalOrder.order_id || qrModalOrder.id}
                size={210}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              📱 Scan with <b>Mobile Scanner (`/admin/scan`)</b> to transition status.
            </p>

            <div className="flex gap-2 pt-1">
              <Link
                href={`/admin/orders/${qrModalOrder.id}/label`}
                target="_blank"
                className="flex-1 py-2.5 text-xs font-bold bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer size={14} />
                <span>Open Label</span>
              </Link>
              <button
                onClick={() => setQrModalOrder(null)}
                className="flex-1 py-2.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
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