'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft, Loader2, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function OrderShippingLabelPage() {
  const router = useRouter();
  const routeParams = useParams();
  const rawId = routeParams?.id as string | undefined;

  const [order, setOrder] = useState<any | null>(null);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrderAndList = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Fetch recent orders for dropdown switcher
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, grand_total, created_at')
        .order('created_at', { ascending: false })
        .limit(25);

      if (recentOrders && recentOrders.length > 0) {
        setAllOrders(recentOrders);
      }

      const decodedId = rawId ? decodeURIComponent(rawId).trim() : '';
      const isLiteralPlaceholder = !decodedId || decodedId === '[id]' || decodedId === 'undefined';
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId);

      let targetOrder: any = null;

      if (!isLiteralPlaceholder) {
        if (isUUID) {
          // Query by UUID
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', decodedId)
            .maybeSingle();

          if (!error && data) targetOrder = data;
        } else {
          // Query by Order Number
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('order_number', decodedId)
            .maybeSingle();

          if (!error && data) {
            targetOrder = data;
          } else {
            // Partial lookup fallback
            const { data: partialMatch } = await supabase
              .from('orders')
              .select('*')
              .ilike('order_number', `%${decodedId}%`)
              .limit(1)
              .maybeSingle();

            if (partialMatch) targetOrder = partialMatch;
          }
        }
      }

      // If literal [id] was accessed or order wasn't found by specific ID, auto-fallback to latest order
      if (!targetOrder) {
        if (recentOrders && recentOrders.length > 0) {
          const { data: latestFullOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('id', recentOrders[0].id)
            .single();

          targetOrder = latestFullOrder;
        }
      }

      if (!targetOrder) {
        throw new Error('No orders found in the database. Please place an order first.');
      }

      // 2. Fetch line items decoupled
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', targetOrder.id);

      setOrder({
        ...targetOrder,
        order_items: itemsData || []
      });

    } catch (err: any) {
      console.error('Label fetch error:', err);
      setErrorMsg(err.message || 'Failed to generate shipping label.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderAndList();
  }, [rawId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 gap-3 text-gray-600">
        <Loader2 size={32} className="animate-spin text-orange-500" />
        <p className="text-xs font-bold uppercase tracking-wider">Generating Parcel Shipping Label...</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm max-w-md w-full text-center space-y-4">
          <AlertCircle size={40} className="mx-auto text-red-500" />
          <h2 className="text-base font-bold text-gray-900">No Order Record Found</h2>
          <p className="text-xs text-gray-500">{errorMsg || 'Unable to locate order.'}</p>
          <div className="flex gap-2 justify-center pt-2">
            <Link
              href="/admin/orders"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
            >
              Back to Orders
            </Link>
            <button
              onClick={fetchOrderAndList}
              className="px-4 py-2 bg-indigo-950 hover:bg-indigo-900 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Address Parsing
  const shippingAddr = typeof order.shipping_address === 'object' && order.shipping_address !== null
    ? order.shipping_address
    : {
        address: order.shipping_address || order.address || 'Address provided at checkout',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395007'
      };

  const isCod = String(order.payment_method || '').toUpperCase().includes('COD');
  const displayOrderNum = order.order_number || order.id.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex flex-col items-center">
      
      {/* Top Action & Selector Bar (Hidden during thermal printing) */}
      <div className="w-full max-w-[420px] mb-4 flex flex-col gap-2.5 print:hidden">
        <div className="flex justify-between items-center">
          <Link 
            href="/admin/orders" 
            className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-2xs"
          >
            <ArrowLeft size={14} /> Back to Orders
          </Link>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer size={14} /> Print A6 Label
          </button>
        </div>

        {/* Live Order Switcher Dropdown */}
        {allOrders.length > 1 && (
          <div className="bg-white p-2.5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase shrink-0">Switch Order:</span>
            <select
              value={order.id}
              onChange={(e) => router.push(`/admin/orders/${e.target.value}/label`)}
              className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-indigo-950 focus:outline-none"
            >
              {allOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number || o.id.slice(0, 8)} — {o.customer_name} (₹{o.grand_total})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Standard A6 Thermal Shipping Label (100mm x 150mm standard) */}
      <div className="w-[100mm] min-h-[145mm] bg-white border-2 border-black p-4 text-black font-sans text-xs flex flex-col justify-between print:border-0 print:m-0 print:p-2 shadow-xl">
        
        {/* Header */}
        <div className="border-b-2 border-black pb-2 flex justify-between items-start">
          <div>
            <h2 className="text-base font-black uppercase tracking-tight">SASTABAZAR</h2>
            <p className="text-[9px] text-gray-700 font-bold">Surat, Gujarat • GSTIN: 24AKBPD1704F1Z1</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-black border-2 border-black px-2 py-0.5 rounded uppercase">
              {isCod ? `COD: ₹${order.grand_total || order.total_amount}` : 'PREPAID'}
            </span>
          </div>
        </div>

        {/* Barcode & Routing Block */}
        <div className="py-2.5 border-b-2 border-black flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase text-gray-600">Scan for Warehouse & Dispatch</p>
            <p className="text-sm font-mono font-black">{displayOrderNum}</p>
            <p className="text-[10px] font-bold">Weight: ~{order.actual_weight_kg || 0.5} KG</p>
            <p className="text-[9px] text-gray-600">Date: {new Date(order.created_at).toLocaleDateString('en-IN')}</p>
          </div>
          <div className="p-1 border border-black rounded-lg bg-white shrink-0">
            <QRCodeSVG value={displayOrderNum} size={80} level="M" />
          </div>
        </div>

        {/* Consignee (Deliver To) */}
        <div className="py-2.5 border-b-2 border-black space-y-0.5">
          <p className="text-[9px] font-black uppercase text-gray-600">Deliver To:</p>
          <p className="font-black text-sm">{order.customer_name || 'Customer'}</p>
          <p className="text-[11px] leading-snug font-medium">
            {shippingAddr.address}, {shippingAddr.city}, {shippingAddr.state}
          </p>
          <p className="font-mono font-black text-base pt-0.5 tracking-wider">
            PIN: {shippingAddr.pincode || '395007'}
          </p>
          <p className="text-[11px] font-bold">Phone: {order.customer_phone || order.phone || 'N/A'}</p>
        </div>

        {/* Package Manifest Items */}
        <div className="py-2 border-b-2 border-black space-y-1 flex-1">
          <p className="text-[9px] font-black uppercase text-gray-600">Package Contents:</p>
          <div className="space-y-0.5 text-[10px]">
            {(order.order_items || []).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between font-semibold">
                <span className="truncate max-w-[200px]">{item.product_title} ({item.size || 'Free Size'})</span>
                <span>Qty: {item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Return Address Footer */}
        <div className="pt-2 text-[8.5px] text-gray-700 leading-tight">
          <p className="font-bold">If undelivered, return to:</p>
          <p>Adhyey Brothers / SastaBazar Logistics, Surat, Gujarat - 395007</p>
        </div>

      </div>
    </div>
  );
}