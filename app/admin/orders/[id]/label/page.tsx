'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

type LabelSizeKey = '4x6' | 'a6' | '4x4';

const LABEL_SIZES: Record<
  LabelSizeKey,
  { label: string; widthMm: number; heightMm: number }
> = {
  '4x6': { label: '4 × 6 inch (100 × 150 mm)', widthMm: 101.6, heightMm: 152.4 },
  a6: { label: 'A6 (105 × 148 mm)', widthMm: 105, heightMm: 148 },
  '4x4': { label: '4 × 4 inch (100 × 100 mm)', widthMm: 101.6, heightMm: 101.6 },
};

const SELLER_NAME = 'ADHYEY BROTHERS';
const SELLER_ADDRESS = 'SY NO 9/10, PLOT 353-354-355, PANDOL INDUSTRIES, SURAT - 395004';
const SELLER_GSTIN = '24AKBPD1704F1Z1';

export default function OrderShippingLabelPage() {
  const router = useRouter();
  const routeParams = useParams();
  const rawId = routeParams?.id as string | undefined;

  const [order, setOrder] = useState<any | null>(null);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [labelSize, setLabelSize] = useState<LabelSizeKey>('4x6');

  const selectedLabel = LABEL_SIZES[labelSize];
  const isCompact = labelSize === '4x4';

  const fetchOrderAndList = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, grand_total, created_at')
        .order('created_at', { ascending: false })
        .limit(25);

      if (recentOrders && recentOrders.length > 0) {
        setAllOrders(recentOrders);
      }

      const decodedId = rawId ? decodeURIComponent(rawId).trim() : '';
      const isLiteralPlaceholder =
        !decodedId || decodedId === '[id]' || decodedId === 'undefined';

      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          decodedId
        );

      let targetOrder: any = null;

      if (!isLiteralPlaceholder) {
        if (isUUID) {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', decodedId)
            .maybeSingle();

          if (!error && data) targetOrder = data;
        } else {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('order_number', decodedId)
            .maybeSingle();

          if (!error && data) {
            targetOrder = data;
          } else {
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

      if (!targetOrder && recentOrders && recentOrders.length > 0) {
        const { data: latestFullOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('id', recentOrders[0].id)
          .single();

        targetOrder = latestFullOrder;
      }

      if (!targetOrder) {
        throw new Error(
          'No orders found in the database. Please place an order first.'
        );
      }

      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', targetOrder.id);

      setOrder({ ...targetOrder, order_items: itemsData || [] });
    } catch (err: any) {
      console.error('Label fetch error:', err);
      setErrorMsg(err.message || 'Failed to generate shipping label.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrderAndList();
  }, [rawId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-gray-600">
        <Loader2 size={32} className="animate-spin text-[#741f23]" />
        <p className="text-xs font-bold uppercase tracking-wider">
          Generating Parcel Shipping Label...
        </p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-gray-50 p-6">
        <div className="w-full max-w-md space-y-4 rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle size={40} className="mx-auto text-red-500" />
          <h2 className="text-base font-bold text-gray-900">No Order Record Found</h2>
          <p className="text-xs text-gray-500">
            {errorMsg || 'Unable to locate order.'}
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Link
              href="/admin/orders"
              className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
            >
              Back to Orders
            </Link>
            <button
              onClick={fetchOrderAndList}
              className="flex cursor-pointer items-center gap-1 rounded-xl bg-[#741f23] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5e171b]"
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shippingAddr =
    typeof order.shipping_address === 'object' && order.shipping_address !== null
      ? order.shipping_address
      : {
          address:
            order.shipping_address ||
            order.address ||
            'Address provided at checkout',
          city: 'Surat',
          state: 'Gujarat',
          pincode: '395007',
        };

  const isCod = String(order.payment_method || '')
    .toUpperCase()
    .includes('COD');

  const displayOrderNum =
    order.order_number || order.id.slice(0, 8).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-100 p-4 sm:p-8 print:min-h-0 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page {
            size: ${selectedLabel.widthMm}mm ${selectedLabel.heightMm}mm;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${selectedLabel.widthMm}mm !important;
            height: ${selectedLabel.heightMm}mm !important;
            overflow: hidden !important;
            background: #fff !important;
          }
          .print-label-page {
            box-sizing: border-box !important;
            width: ${selectedLabel.widthMm}mm !important;
            height: ${selectedLabel.heightMm}mm !important;
            min-height: ${selectedLabel.heightMm}mm !important;
            max-height: ${selectedLabel.heightMm}mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <div className="mb-4 flex w-full max-w-[460px] flex-col gap-2.5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/admin/orders"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-2xs hover:text-gray-900"
          >
            <ArrowLeft size={14} /> Back to Orders
          </Link>

          <button
            onClick={() => window.print()}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#741f23] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#5e171b]"
          >
            <Printer size={14} /> Print Label
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white p-2.5 shadow-2xs">
          <span className="shrink-0 text-[11px] font-bold uppercase text-gray-500">
            Label Size:
          </span>
          <select
            value={labelSize}
            onChange={(e) => setLabelSize(e.target.value as LabelSizeKey)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-[#741f23] focus:outline-none"
          >
            {Object.entries(LABEL_SIZES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>

        {allOrders.length > 1 && (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white p-2.5 shadow-2xs">
            <span className="shrink-0 text-[11px] font-bold uppercase text-gray-500">
              Switch Order:
            </span>
            <select
              value={order.id}
              onChange={(e) =>
                router.push(`/admin/orders/${e.target.value}/label`)
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-[#741f23] focus:outline-none"
            >
              {allOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number || o.id.slice(0, 8)} — {o.customer_name} (₹{o.grand_total})
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="px-1 text-[10px] leading-relaxed text-gray-500">
          Default is 4 × 6 inch for thermal courier printers. In the browser print dialog use 100% / Actual Size and disable browser headers & footers.
        </p>
      </div>

      <div
        className={`print-label-page flex flex-col justify-between border-2 border-black bg-white font-sans text-black shadow-xl print:border-0 ${
          isCompact ? 'p-2 text-[9px] print:p-1.5' : 'p-4 text-xs print:p-2'
        }`}
        style={{
          width: `${selectedLabel.widthMm}mm`,
          minHeight: `${selectedLabel.heightMm}mm`,
          height: `${selectedLabel.heightMm}mm`,
        }}
      >
        <div className={`flex items-start justify-between border-b-2 border-black ${isCompact ? 'pb-1' : 'pb-2'}`}>
          <div className="min-w-0 pr-2">
            <h2 className={`${isCompact ? 'text-sm' : 'text-base'} font-black uppercase tracking-tight`}>
              {SELLER_NAME}
            </h2>
            <p className={`${isCompact ? 'text-[6.5px]' : 'text-[8px]'} max-w-[255px] font-bold leading-tight text-gray-700`}>
              {SELLER_ADDRESS}
            </p>
            <p className={`${isCompact ? 'text-[6.5px]' : 'text-[8px]'} font-bold text-gray-700`}>
              GSTIN: {SELLER_GSTIN}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className={`rounded border-2 border-black px-2 py-0.5 font-black uppercase ${isCompact ? 'text-[9px]' : 'text-xs'}`}>
              {isCod ? `COD: ₹${order.grand_total || order.total_amount}` : 'PREPAID'}
            </span>
          </div>
        </div>

        <div className={`flex items-center justify-between gap-3 border-b-2 border-black ${isCompact ? 'py-1' : 'py-2.5'}`}>
          <div className={isCompact ? 'space-y-0.5' : 'space-y-1'}>
            <p className={`${isCompact ? 'text-[7px]' : 'text-[9px]'} font-bold uppercase text-gray-600`}>
              Scan for Warehouse & Dispatch
            </p>
            <p className={`${isCompact ? 'text-xs' : 'text-sm'} font-mono font-black`}>
              {displayOrderNum}
            </p>
            <p className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} font-bold`}>
              Weight: ~{order.actual_weight_kg || 0.5} KG
            </p>
            <p className={`${isCompact ? 'text-[7px]' : 'text-[9px]'} text-gray-600`}>
              Date: {new Date(order.created_at).toLocaleDateString('en-IN')}
            </p>
          </div>
          <div className="shrink-0 rounded-lg border border-black bg-white p-1">
            <QRCodeSVG value={displayOrderNum} size={isCompact ? 58 : 80} level="M" />
          </div>
        </div>

        <div className={`space-y-0.5 border-b-2 border-black ${isCompact ? 'py-1' : 'py-2.5'}`}>
          <p className={`${isCompact ? 'text-[7px]' : 'text-[9px]'} font-black uppercase text-gray-600`}>
            Deliver To:
          </p>
          <p className={`${isCompact ? 'text-xs' : 'text-sm'} font-black`}>
            {order.customer_name || 'Customer'}
          </p>
          <p className={`${isCompact ? 'text-[8px]' : 'text-[11px]'} font-medium leading-snug`}>
            {shippingAddr.address}, {shippingAddr.city}, {shippingAddr.state}
          </p>
          <p className={`${isCompact ? 'text-sm' : 'text-base'} pt-0.5 font-mono font-black tracking-wider`}>
            PIN: {shippingAddr.pincode || '395007'}
          </p>
        </div>

        <div className={`flex-1 space-y-1 border-b-2 border-black ${isCompact ? 'py-1' : 'py-2'}`}>
          <p className={`${isCompact ? 'text-[7px]' : 'text-[9px]'} font-black uppercase text-gray-600`}>
            Package Contents:
          </p>
          <div className={`${isCompact ? 'text-[7.5px]' : 'text-[10px]'} space-y-0.5`}>
            {(order.order_items || []).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between gap-2 font-semibold">
                <span className={`${isCompact ? 'max-w-[230px]' : 'max-w-[250px]'} truncate`}>
                  {item.product_title} ({item.size || 'Free Size'})
                </span>
                <span className="shrink-0">Qty: {item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${isCompact ? 'pt-1 text-[6.5px]' : 'pt-2 text-[8.5px]'} leading-tight text-gray-700`}>
          <p className="font-bold">If undelivered, return to:</p>
          <p>
            {SELLER_NAME}, {SELLER_ADDRESS}, India • GSTIN: {SELLER_GSTIN}
          </p>
        </div>
      </div>
    </div>
  );
}
