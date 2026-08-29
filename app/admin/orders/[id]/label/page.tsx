'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, ArrowLeft, Loader2, Printer, RefreshCw, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { syncExistingNimbusPostShipment } from '@/actions/shipping';

type LabelSizeKey = '4x6' | 'a6' | '4x4';

const LABEL_SIZES: Record<LabelSizeKey, { label: string; widthMm: number; heightMm: number }> = {
  '4x6': { label: '4 × 6 inch (100 × 150 mm)', widthMm: 101.6, heightMm: 152.4 },
  a6: { label: 'A6 (105 × 148 mm)', widthMm: 105, heightMm: 148 },
  '4x4': { label: '4 × 4 inch (100 × 100 mm)', widthMm: 101.6, heightMm: 101.6 },
};

const SELLER_NAME = 'ADHYEY BROTHERS';
const SELLER_ADDRESS = 'SY NO 9/10, PLOT 353-354-355, PANDOL INDUSTRIES, SURAT - 395004';
const SELLER_GSTIN = '24AKBPD1704F1Z1';
const PRINT_SAFE_MM = 3;

export default function OrderShippingLabelPage() {
  const params = useParams();
  const rawId = params?.id as string | undefined;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [labelSize, setLabelSize] = useState<LabelSizeKey>('4x6');
  const autoSyncAttempted = useRef(false);

  const selectedLabel = LABEL_SIZES[labelSize];
  const isCompact = labelSize === '4x4';

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const decodedId = rawId ? decodeURIComponent(rawId).trim() : '';
      if (!decodedId || decodedId === '[id]' || decodedId === 'undefined') {
        throw new Error('Invalid order reference.');
      }

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId);
      let targetOrder: any = null;

      if (isUUID) {
        const { data, error } = await supabase.from('orders').select('*').eq('id', decodedId).maybeSingle();
        if (error) throw error;
        targetOrder = data;
      } else {
        const { data, error } = await supabase.from('orders').select('*').eq('order_number', decodedId).maybeSingle();
        if (error) throw error;
        targetOrder = data;
      }

      if (!targetOrder) throw new Error('Order not found.');

      const [{ data: itemsData }, { data: shipmentData, error: shipmentError }] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', targetOrder.id),
        supabase
          .from('shipments')
          .select('id, awb_number, shipment_status, tracking_url, shipping_label_url, courier_partners(name)')
          .eq('order_id', targetOrder.id)
          .limit(1)
          .maybeSingle(),
      ]);

      if (shipmentError) console.warn('Label shipment lookup warning:', shipmentError.message);

      setOrder({ ...targetOrder, order_items: itemsData || [], shipment: shipmentData || null });
      return { ...targetOrder, shipment: shipmentData || null };
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load order label.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [rawId]);

  const syncAwb = useCallback(
    async (silent = false) => {
      if (!order?.id || syncing) return;
      setSyncing(true);
      if (!silent) setSyncMsg('Checking NimbusPost for assigned courier/AWB...');

      try {
        const result = await syncExistingNimbusPostShipment(order.id);
        if (result.success) {
          setSyncMsg(`AWB synced: ${result.awb}`);
          await fetchOrder();
        } else {
          setSyncMsg(result.error || 'NimbusPost has not assigned an AWB yet. Internal label remains available.');
        }
      } catch (err: any) {
        setSyncMsg(err?.message || 'NimbusPost AWB sync failed. Internal label remains available.');
      } finally {
        setSyncing(false);
      }
    },
    [fetchOrder, order?.id, syncing]
  );

  useEffect(() => {
    autoSyncAttempted.current = false;
    void fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    const awb = String(order?.shipment?.awb_number || '').trim();
    if (order?.id && !awb && !autoSyncAttempted.current && !syncing) {
      autoSyncAttempted.current = true;
      void syncAwb(true);
    }
  }, [order?.id, order?.shipment?.awb_number, syncAwb, syncing]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-gray-600">
        <Loader2 size={32} className="animate-spin text-[#741f23]" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading Shipping Label...</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md space-y-4 rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle size={40} className="mx-auto text-red-500" />
          <h2 className="text-base font-bold text-gray-900">Shipping Label Unavailable</h2>
          <p className="text-xs text-gray-500">{errorMsg || 'Unable to locate order.'}</p>
          <Link href="/admin/orders" className="inline-block rounded-xl bg-[#741f23] px-4 py-2 text-xs font-bold text-white">Back to Orders</Link>
        </div>
      </div>
    );
  }

  const shippingAddr =
    typeof order.shipping_address === 'object' && order.shipping_address !== null
      ? order.shipping_address
      : {
          address: order.shipping_address || order.address || 'Address provided at checkout',
          city: order.shipping_city || 'Surat',
          state: order.shipping_state || 'Gujarat',
          pincode: order.shipping_pincode || '395007',
        };

  const isCod = String(order.payment_method || '').toUpperCase().includes('COD');
  const displayOrderNum = order.order_number || order.id.slice(0, 8).toUpperCase();
  const awbNumber = String(order.shipment?.awb_number || '').trim();
  const hasCourierAwb = awbNumber.length > 0;
  const courierName = order.shipment?.courier_partners?.name || 'NimbusPost Assigned Courier';
  const scanValue = hasCourierAwb ? awbNumber : displayOrderNum;

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-100 p-4 sm:p-8 print:min-h-0 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { size: ${selectedLabel.widthMm}mm ${selectedLabel.heightMm}mm; margin: 0; }
          html, body {
            margin: 0 !important; padding: 0 !important;
            width: ${selectedLabel.widthMm}mm !important;
            height: ${selectedLabel.heightMm}mm !important;
            overflow: hidden !important; background: #fff !important;
          }
          body * { visibility: hidden !important; }
          .print-label-page, .print-label-page * { visibility: visible !important; }
          .print-label-page {
            position: fixed !important;
            left: ${PRINT_SAFE_MM}mm !important; top: ${PRINT_SAFE_MM}mm !important;
            box-sizing: border-box !important;
            width: calc(${selectedLabel.widthMm}mm - ${PRINT_SAFE_MM * 2}mm) !important;
            height: calc(${selectedLabel.heightMm}mm - ${PRINT_SAFE_MM * 2}mm) !important;
            margin: 0 !important; border: 1.5px solid #000 !important;
            box-shadow: none !important; overflow: hidden !important;
          }
        }
      `}</style>

      <div className="mb-4 flex w-full max-w-[460px] flex-col gap-2.5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/admin/orders" className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600">
            <ArrowLeft size={14} /> Back to Orders
          </Link>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl bg-[#741f23] px-4 py-2 text-xs font-bold text-white">
            <Printer size={14} /> {hasCourierAwb ? 'Print Courier Label' : 'Print Internal Label'}
          </button>
        </div>

        <div className={`rounded-2xl border px-3 py-3 text-[11px] ${hasCourierAwb ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          {hasCourierAwb ? (
            <div className="space-y-1">
              <p className="font-black">Courier label ready</p>
              <p>AWB: <span className="font-mono font-black">{awbNumber}</span> • {courierName}</p>
              <p>The scannable QR uses the courier AWB. SBZ remains only as your internal Order ID.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-black">AWB pending — Internal label mode</p>
              <p>You may print this for packing/warehouse use. Do not present its SBZ QR as the courier pickup barcode.</p>
              <button
                type="button"
                disabled={syncing}
                onClick={() => void syncAwb(false)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 font-bold text-white disabled:opacity-50"
              >
                {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Sync NimbusPost AWB
              </button>
            </div>
          )}
        </div>

        {syncMsg && <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] text-gray-600">{syncMsg}</div>}

        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2.5">
          <span className="shrink-0 text-[11px] font-bold uppercase text-gray-500">Label Size:</span>
          <select value={labelSize} onChange={(e) => setLabelSize(e.target.value as LabelSizeKey)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-[#741f23]">
            {Object.entries(LABEL_SIZES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
        </div>
      </div>

      <div
        className={`print-label-page flex flex-col justify-between border-2 border-black bg-white font-sans text-black shadow-xl ${isCompact ? 'p-2 text-[9px] print:p-1.5' : 'p-4 text-xs print:p-2'}`}
        style={{ width: `${selectedLabel.widthMm}mm`, minHeight: `${selectedLabel.heightMm}mm`, height: `${selectedLabel.heightMm}mm` }}
      >
        <div className={`flex items-start justify-between border-b-2 border-black ${isCompact ? 'pb-1' : 'pb-2'}`}>
          <div className="min-w-0 pr-2">
            <h2 className={`${isCompact ? 'text-sm' : 'text-base'} font-black uppercase tracking-tight`}>{SELLER_NAME}</h2>
            <p className={`${isCompact ? 'text-[6.5px]' : 'text-[8px]'} max-w-[255px] font-bold leading-tight text-gray-700`}>{SELLER_ADDRESS}</p>
            <p className={`${isCompact ? 'text-[6.5px]' : 'text-[8px]'} font-bold text-gray-700`}>GSTIN: {SELLER_GSTIN}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className={`rounded border-2 border-black px-2 py-0.5 font-black uppercase ${isCompact ? 'text-[9px]' : 'text-xs'}`}>{isCod ? `COD: ₹${order.grand_total || order.total_amount}` : 'PREPAID'}</span>
          </div>
        </div>

        <div className={`flex items-center justify-between gap-3 border-b-2 border-black ${isCompact ? 'py-1' : 'py-2.5'}`}>
          <div className={isCompact ? 'space-y-0.5' : 'space-y-1'}>
            <p className={`${isCompact ? 'text-[7px]' : 'text-[9px]'} font-black uppercase ${hasCourierAwb ? 'text-black' : 'text-red-700'}`}>
              {hasCourierAwb ? 'Courier AWB — Scan for Pickup' : 'INTERNAL / PACKING LABEL — NOT COURIER AWB'}
            </p>
            <p className={`${isCompact ? 'text-xs' : 'text-sm'} font-mono font-black`}>{scanValue}</p>
            {hasCourierAwb && <p className={`${isCompact ? 'text-[7px]' : 'text-[9px]'} font-bold`}>Courier: {courierName}</p>}
            <p className={`${isCompact ? 'text-[7px]' : 'text-[9px]'} font-bold text-gray-700`}>Order ID: {displayOrderNum}</p>
            <p className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} font-bold`}>Weight: ~{order.actual_weight_kg || order.chargeable_weight_kg || 0.5} KG</p>
            <p className={`${isCompact ? 'text-[7px]' : 'text-[9px]'} text-gray-600`}>Date: {new Date(order.created_at).toLocaleDateString('en-IN')}</p>
          </div>
          <div className="mr-2 shrink-0 rounded-lg border border-black bg-white p-1">
            <QRCodeSVG value={scanValue} size={isCompact ? 54 : 76} level="M" />
          </div>
        </div>

        {!hasCourierAwb && (
          <div className={`border-b-2 border-black bg-gray-100 text-center font-black uppercase ${isCompact ? 'py-1 text-[7px]' : 'py-1.5 text-[9px]'}`}>
            Warehouse use only • Replace with courier label after AWB sync
          </div>
        )}

        <div className={`space-y-0.5 border-b-2 border-black ${isCompact ? 'py-1' : 'py-2.5'}`}>
          <p className={`${isCompact ? 'text-[7px]' : 'text-[9px]'} font-black uppercase text-gray-600`}>Deliver To:</p>
          <p className={`${isCompact ? 'text-xs' : 'text-sm'} font-black`}>{order.customer_name || 'Customer'}</p>
          <p className={`${isCompact ? 'text-[8px]' : 'text-[11px]'} font-medium leading-snug`}>{shippingAddr.address}, {shippingAddr.city}, {shippingAddr.state}</p>
          <p className={`${isCompact ? 'text-sm' : 'text-base'} pt-0.5 font-mono font-black tracking-wider`}>PIN: {shippingAddr.pincode || '395007'}</p>
        </div>

        <div className={`flex-1 space-y-1 border-b-2 border-black ${isCompact ? 'py-1' : 'py-2'}`}>
          <p className={`${isCompact ? 'text-[7px]' : 'text-[9px]'} font-black uppercase text-gray-600`}>Package Contents:</p>
          <div className={`${isCompact ? 'text-[7.5px]' : 'text-[10px]'} space-y-0.5`}>
            {(order.order_items || []).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between gap-2 font-semibold">
                <span className={`${isCompact ? 'max-w-[220px]' : 'max-w-[240px]'} truncate`}>{item.product_title || item.name || 'Product'} {item.size ? `(${item.size})` : ''}</span>
                <span className="shrink-0">Qty: {item.quantity || 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${isCompact ? 'pt-1 text-[6.5px]' : 'pt-2 text-[8.5px]'} leading-tight text-gray-700`}>
          <p className="font-bold">If undelivered, return to:</p>
          <p>{SELLER_NAME}, {SELLER_ADDRESS}, India • GSTIN: {SELLER_GSTIN}</p>
        </div>
      </div>

      {hasCourierAwb && (
        <div className="mt-3 flex w-full max-w-[460px] items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[10px] font-bold text-green-800 print:hidden">
          <Truck size={13} /> Courier pickup scan value: {awbNumber}
        </div>
      )}
    </div>
  );
}
