'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { resolveOrderTotals } from '@/lib/orders/order-totals';
import { getVerifiedOrderDetailAction } from '@/actions/orderDetails';
import { 
  Package, Truck, CheckCircle2, Clock, XCircle, RotateCcw, 
  AlertCircle, ChevronRight, ArrowLeft, Loader2,
  MapPin, Phone, ShieldCheck, X, IndianRupee, QrCode
} from 'lucide-react';

export default function CustomerOrderDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> | { id: string } 
}) {
  const router = useRouter();
  const resolvedParams = typeof (params as any)?.then === 'function' 
    ? use(params as Promise<{ id: string }>) 
    : (params as { id: string });
  const orderId = resolvedParams?.id;

  const [order, setOrder] = useState<any | null>(null);
  const [returnRequest, setReturnRequest] = useState<any | null>(null);
  const [refundRecord, setRefundRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationPhone, setVerificationPhone] = useState('');

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  
  // Cancellation Form State
  const [cancelReason, setCancelReason] = useState('Changed mind / placed by mistake');
  const [cancelRefundUpi, setCancelRefundUpi] = useState('');
  
  // Return / Exchange Form State
  const [returnType, setReturnType] = useState<'RETURN' | 'EXCHANGE'>('RETURN');
  const [returnReason, setReturnReason] = useState('Wrong Size Received');
  const [selectedExchangeSize, setSelectedExchangeSize] = useState('L');
  const [customerComment, setCustomerComment] = useState('');
  const [refundUpiId, setRefundUpiId] = useState('');

  const fetchOrderDetails = async (credentials?: { email: string; phone: string }) => {
    if (!orderId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await getVerifiedOrderDetailAction({ orderRef: orderId, email: credentials?.email, phone: credentials?.phone });
      if (!result.success || !result.order) {
        setRequiresVerification(Boolean(result.requiresVerification));
        throw new Error(result.error || 'Order could not be verified.');
      }
      setOrder(result.order); setReturnRequest(result.returnRequest); setRefundRecord(result.refundRecord);
      setCanManage(Boolean(result.canManage)); setRequiresVerification(false);
    } catch (err: any) {
      console.error('Error loading customer order:', err);
      setErrorMsg(err.message || 'Unable to retrieve order details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyGuestOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    await fetchOrderDetails({ email: verificationEmail, phone: verificationPhone });
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const isPrepaidOrder = order?.payment_method?.toUpperCase().includes('ONLINE') || 
                         order?.payment_method?.toUpperCase().includes('UPI') || 
                         order?.payment_status === 'PAID';
  const totals = order ? resolveOrderTotals(order) : null;

  // Handle Order Cancellation (with Prepaid Refund support)
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    
    if (isPrepaidOrder && !cancelRefundUpi.trim()) {
      setErrorMsg('Please enter a valid UPI ID to receive your refund.');
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);

    try {
      // 1. Update Order Status
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ 
          order_status: 'CANCELLED',
          payment_status: isPrepaidOrder ? 'REFUND_PENDING' : order.payment_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateErr) throw updateErr;

      // 2. If Prepaid, create a Refund Queue Record for Admin
      if (isPrepaidOrder) {
        const refundNumber = `REF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        await supabase.from('refunds').insert([{
          refund_number: refundNumber,
          order_id: order.id,
          refund_amount: order.grand_total || order.total_amount,
          refund_method: 'UPI',
          status: 'REFUND_PENDING',
          customer_upi_id: cancelRefundUpi.trim(),
          notes: `Auto-generated refund from order cancellation. Reason: ${cancelReason}`
        }]);
      }

      // 3. Restore Reserved Inventory
      for (const item of (order.order_items || [])) {
        if (item.product_id) {
          const { data: inv } = await supabase
            .from('inventory')
            .select('available_quantity')
            .eq('product_id', item.product_id)
            .eq('size', item.size || 'Free Size')
            .maybeSingle();

          if (inv) {
            await supabase
              .from('inventory')
              .update({ available_quantity: inv.available_quantity + item.quantity })
              .eq('product_id', item.product_id)
              .eq('size', item.size || 'Free Size');
          }
        }
      }

      // 4. Log Audit Trail
      await supabase.from('order_status_history').insert([{
        order_id: order.id,
        previous_status: order.order_status,
        new_status: 'CANCELLED',
        notes: `Customer cancelled order. Reason: ${cancelReason}. ${isPrepaidOrder ? `Refund requested via UPI: ${cancelRefundUpi}` : 'No refund required (COD).'}` ,
        changed_by: 'CUSTOMER'
      }]);

      setSuccessMsg(
        isPrepaidOrder
          ? 'Your order has been cancelled. A refund request of ₹' + (order.grand_total || order.total_amount) + ' has been queued to your UPI ID (' + cancelRefundUpi + ').'
          : 'Your order has been successfully cancelled.'
      );
      setShowCancelModal(false);
      fetchOrderDetails();
    } catch (err: any) {
      setErrorMsg('Failed to cancel order: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Return / Exchange Submission (Only for DELIVERED orders)
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setActionLoading(true);
    setErrorMsg(null);

    try {
      const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const { data: retData, error: retErr } = await supabase
        .from('returns')
        .insert([{
          return_number: returnNumber,
          order_id: order.id,
          customer_name: order.customer_name,
          status: returnType === 'EXCHANGE' ? 'EXCHANGE_REQUESTED' : 'RETURN_REQUESTED',
          total_refund_requested: returnType === 'RETURN' ? (order.grand_total || order.total_amount) : 0,
          expected_pickup_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (retErr) throw retErr;

      const itemsPayload = (order.order_items || []).map((item: any) => ({
        return_id: retData.id,
        order_item_id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        reason: `${returnType}: ${returnReason} ${returnType === 'EXCHANGE' ? `(Target Size: ${selectedExchangeSize})` : ''}`,
        customer_comment: customerComment.trim() || null,
        disposition: 'PENDING'
      }));

      await supabase.from('return_items').insert(itemsPayload);

      if (returnType === 'RETURN' && refundUpiId.trim()) {
        const refundNumber = `REF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        await supabase.from('refunds').insert([{
          refund_number: refundNumber,
          return_id: retData.id,
          order_id: order.id,
          refund_amount: order.grand_total || order.total_amount,
          refund_method: 'UPI',
          status: 'REFUND_PENDING',
          customer_upi_id: refundUpiId.trim()
        }]);
      }

      setSuccessMsg(`Your ${returnType.toLowerCase()} request has been registered (${returnNumber}). Courier pickup will be scheduled shortly.`);
      setShowReturnModal(false);
      fetchOrderDetails();
    } catch (err: any) {
      setErrorMsg('Failed to submit return request: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-12 gap-3 text-gray-500">
          <Loader2 size={32} className="animate-spin text-orange-500" />
          <p className="text-xs font-bold uppercase tracking-wider">Loading Order Information...</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (errorMsg && !order) {
    if (requiresVerification) return (
      <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between"><Header />
        <div className="mx-auto w-full max-w-md flex-1 px-4 py-20">
          <form onSubmit={handleVerifyGuestOrder} className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
            <div><h1 className="text-lg font-black text-indigo-950">Verify Your Order</h1><p className="mt-1 text-xs text-gray-500">Order number <b>{orderId}</b> is not a secret. Enter the same email and phone used at checkout.</p></div>
            <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{errorMsg}</div>
            <label className="block text-xs font-bold text-gray-700">Order Email *<input type="email" required value={verificationEmail} onChange={(e) => setVerificationEmail(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
            <label className="block text-xs font-bold text-gray-700">Order Phone *<input type="tel" required inputMode="numeric" value={verificationPhone} onChange={(e) => setVerificationPhone(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
            <button type="submit" className="w-full rounded-xl bg-indigo-950 px-5 py-3 text-xs font-bold text-white">Verify & Track Order</button>
            <Link href="/orders" className="block text-center text-xs font-bold text-indigo-700">Back to My Orders</Link>
          </form>
        </div><Footer /></main>
    );
    return (
      <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between">
        <Header />
        <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
          <AlertCircle size={44} className="mx-auto text-red-500" />
          <h2 className="text-lg font-bold text-gray-900">Order Not Found</h2>
          <p className="text-xs text-gray-500">{errorMsg}</p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-indigo-950 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-indigo-900 transition"
          >
            Return to Homepage
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const orderStatus = order.order_status || 'CONFIRMED';
  const isCancellable = ['CONFIRMED', 'PENDING', 'PROCESSING'].includes(orderStatus);
  const isDelivered = orderStatus === 'DELIVERED';
  const isCancelled = orderStatus === 'CANCELLED';

  const deliveredDate = order.updated_at ? new Date(order.updated_at) : new Date(order.created_at);
  const daysSinceDelivery = Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
  const isReturnWindowValid = isDelivered && daysSinceDelivery <= 7 && !returnRequest;

  const shippingAddr = typeof order.shipping_address === 'object'
    ? `${order.shipping_address?.address || ''}, ${order.shipping_address?.city || ''}, ${order.shipping_address?.state || ''} - ${order.shipping_address?.pincode || ''}`
    : order.shipping_address || order.address || 'Address provided during checkout';

  return (
    <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8 w-full flex-1 space-y-6">
        
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-indigo-950">
            <ArrowLeft size={14} /> Back to Shopping
          </Link>
          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border ${
            isCancelled 
              ? 'bg-red-50 text-red-700 border-red-200' 
              : 'bg-indigo-50 text-indigo-950 border-indigo-100'
          }`}>
            {order.order_number || order.id.slice(0, 8)}
          </span>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-xs p-4 rounded-2xl flex items-center gap-2 shadow-2xs">
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-4 rounded-2xl flex items-center gap-2 shadow-2xs">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ===================================================================== */}
        {/* ORDER STATUS & TRACKING CARD (DYNAMIC COLOR CHANGING)                 */}
        {/* ===================================================================== */}
        <div className={`rounded-3xl border p-6 shadow-2xs space-y-6 transition-colors ${
          isCancelled 
            ? 'bg-red-50/40 border-red-200' 
            : isDelivered 
            ? 'bg-white border-green-200' 
            : 'bg-white border-gray-200'
        }`}>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200/60 pb-5">
            <div>
              <span className={`text-[11px] font-black uppercase tracking-widest ${
                isCancelled ? 'text-red-600' : isDelivered ? 'text-green-600' : 'text-orange-600'
              }`}>
                {isCancelled ? '• Order Terminated' : isDelivered ? '• Order Completed' : '• Live Order Tracking'}
              </span>
              
              <h1 className={`text-xl font-black mt-0.5 ${
                isCancelled ? 'text-red-900' : 'text-indigo-950'
              }`}>
                {isCancelled 
                  ? 'This Order Has Been Cancelled' 
                  : isDelivered 
                  ? 'Delivered to Customer' 
                  : 'Order in Progress'}
              </h1>
              
              <p className="text-xs text-gray-500 mt-1">
                Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </p>
            </div>

            {/* Action Buttons: Cancel vs Return vs Status Pill */}
            <div className="flex items-center gap-2.5">
              {canManage && isCancellable && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition cursor-pointer shadow-2xs"
                >
                  Cancel Order
                </button>
              )}

              {canManage && isReturnWindowValid && (
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="px-4 py-2 text-xs font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RotateCcw size={13} className="text-orange-500" />
                  <span>Return or Exchange</span>
                </button>
              )}

              {isCancelled && (
                <span className="px-3.5 py-1.5 bg-red-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm">
                  <XCircle size={14} /> CANCELLED
                </span>
              )}
            </div>
          </div>

          {/* Cancellation Info Banner (High Contrast) */}
          {isCancelled && (
            <div className="bg-white border-2 border-red-200 p-4 rounded-2xl space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                <XCircle size={16} className="shrink-0 text-red-600" />
                <span>Order cancellation has been processed successfully.</span>
              </div>
              
              {isPrepaidOrder ? (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-amber-900 flex items-center gap-1">
                    <IndianRupee size={13} /> Prepaid Refund Status:
                  </p>
                  <p className="text-amber-800 text-[11px]">
                    Refund of <b>₹{order.grand_total || order.total_amount}</b> is queued. 
                    {refundRecord?.customer_upi_id ? ` Target UPI ID: ${refundRecord.customer_upi_id}` : ''}
                    {refundRecord?.status === 'REFUNDED' ? ' (Completed - UTR: ' + refundRecord.refund_utr + ')' : ' (Processing within 24-48 business hours)'}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500">
                  This was a Cash on Delivery (COD) order. No payment was charged, and all items have been released.
                </p>
              )}
            </div>
          )}

          {/* Normal Active Timeline (Hidden when Cancelled) */}
          {!isCancelled && (
            <div className="grid grid-cols-4 gap-2 text-center pt-2">
              <div className="space-y-1">
                <div className="w-8 h-8 mx-auto rounded-full bg-green-500 text-white flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <p className="text-[11px] font-bold text-gray-900">Confirmed</p>
              </div>
              <div className="space-y-1">
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  ['PACKED', 'SHIPPED', 'DELIVERED'].includes(orderStatus) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Package size={16} />
                </div>
                <p className="text-[11px] font-bold text-gray-700">Packed</p>
              </div>
              <div className="space-y-1">
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  ['SHIPPED', 'DELIVERED'].includes(orderStatus) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Truck size={16} />
                </div>
                <p className="text-[11px] font-bold text-gray-700">Shipped</p>
              </div>
              <div className="space-y-1">
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  orderStatus === 'DELIVERED' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <CheckCircle2 size={16} />
                </div>
                <p className="text-[11px] font-bold text-gray-700">Delivered</p>
              </div>
            </div>
          )}

          {/* Return Status Box */}
          {returnRequest && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-orange-950">
                <span className="flex items-center gap-1.5">
                  <RotateCcw size={14} className="text-orange-600" /> Return Request #{returnRequest.return_number}
                </span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-orange-200 text-[10px]">
                  {returnRequest.status}
                </span>
              </div>
              <p className="text-[11px] text-orange-800">
                Reverse courier pickup is scheduled. Please keep the item packed with original tags intact.
              </p>
            </div>
          )}
        </div>

        {/* Ordered Items List */}
        <div className={`rounded-3xl border p-6 shadow-2xs space-y-4 bg-white ${
          isCancelled ? 'border-red-200/80 opacity-90' : 'border-gray-200'
        }`}>
          <h2 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
            Items in this Order ({order.order_items?.length || 0})
          </h2>

          <div className="divide-y divide-gray-100">
            {(order.order_items || []).map((item: any, idx: number) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    isCancelled ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-900'
                  }`}>
                    <Package size={18} />
                  </div>
                  <div>
                    <p className={`font-bold ${isCancelled ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                      {item.product_title}
                    </p>
                    <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                      Size: <span className="text-gray-900">{item.size || 'Free Size'}</span> • Qty: <span className="text-gray-900">{item.quantity}</span>
                    </p>
                  </div>
                </div>
                <span className={`font-black text-sm ${isCancelled ? 'text-gray-400 line-through' : 'text-indigo-950'}`}>
                  ₹{item.line_total || (item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Payment & Delivery Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-xs">
            <div className="bg-gray-50/70 p-4 rounded-2xl space-y-1">
              <p className="font-bold text-gray-500 text-[10px] uppercase">Delivery Address</p>
              <p className="font-bold text-gray-900 flex items-center gap-1">
                <MapPin size={12} className="text-orange-500" /> {order.customer_name}
              </p>
              <p className="text-gray-600 leading-relaxed text-[11px]">{shippingAddr}</p>
              <p className="text-gray-500 text-[11px] flex items-center gap-1 pt-1">
                <Phone size={11} className="text-green-600" /> {order.customer_phone || 'N/A'}
              </p>
            </div>

            <div className="bg-gray-50/70 p-4 rounded-2xl space-y-2">
              <p className="font-bold text-gray-500 text-[10px] uppercase">Financial Summary</p>
              <div className="flex justify-between text-gray-600 text-xs"><span>Product Subtotal:</span><span className="font-bold text-gray-900">₹{totals?.productSubtotal}</span></div>
              {Boolean(totals?.discountAmount) && <div className="flex justify-between text-green-700 text-xs"><span>Discount:</span><span className="font-bold">-₹{totals?.discountAmount}</span></div>}
              <div className="flex justify-between text-gray-600 text-xs"><span>Shipping Charge:</span><span className="font-bold text-gray-900">₹{totals?.shippingCharge}</span></div>
              {totals?.isCod && <div className="flex justify-between text-gray-600 text-xs"><span>COD Charge:</span><span className="font-bold text-gray-900">₹{totals.codCharge}</span></div>}
              <div className="flex justify-between text-gray-600 text-xs">
                <span>Payment Mode:</span>
                <span className="font-bold text-gray-900">{order.payment_method || 'COD'}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-xs">
                <span>Payment Status:</span>
                <span className={`font-bold ${
                  order.payment_status === 'PAID' ? 'text-green-600' :
                  order.payment_status === 'REFUND_PENDING' ? 'text-amber-600' :
                  order.payment_status === 'REFUNDED' ? 'text-blue-600' :
                  'text-gray-800'
                }`}>
                  {order.payment_status || 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-indigo-950 pt-1 border-t border-gray-200">
                <span>Total Amount:</span>
                <span className={isCancelled ? 'text-gray-400 line-through' : 'text-orange-600'}>
                  ₹{totals?.grandTotal}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* 1. CANCEL ORDER MODAL WITH PREPAID REFUND SUPPORT                      */}
      {/* ===================================================================== */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmCancel} className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-red-600 flex items-center gap-2">
                <AlertCircle size={18} /> Cancel Order Confirmation
              </h3>
              <button type="button" onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to cancel this order? Once cancelled, this action cannot be reversed.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Reason for cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl bg-white font-medium"
              >
                <option value="Changed mind / placed by mistake">Changed mind / placed by mistake</option>
                <option value="Expected delivery time is too long">Expected delivery time is too long</option>
                <option value="Incorrect shipping address entered">Incorrect shipping address entered</option>
                <option value="Found better price elsewhere">Found better price elsewhere</option>
                <option value="Other">Other reason</option>
              </select>
            </div>

            {/* Prepaid Refund UPI Input Field */}
            {isPrepaidOrder && (
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                  <QrCode size={16} className="text-orange-500" />
                  <span>Prepaid Order Refund (₹{order.grand_total || order.total_amount})</span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Enter your UPI ID so our accounts team can process your refund directly:
                </p>
                <input
                  type="text"
                  required
                  placeholder="e.g. yourname@okaxis / 9876543210@upi"
                  value={cancelRefundUpi}
                  onChange={(e) => setCancelRefundUpi(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border rounded-xl font-mono text-indigo-950 font-bold outline-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
              >
                No, Keep Order
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. RETURN / EXCHANGE MODAL                                            */}
      {/* ===================================================================== */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleReturnSubmit} className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-indigo-950 flex items-center gap-2">
                <RotateCcw className="text-orange-500" size={18} /> Return or Exchange Product
              </h3>
              <button type="button" onClick={() => setShowReturnModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReturnType('RETURN')}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  returnType === 'RETURN' ? 'bg-orange-500 text-white border-orange-500 shadow-2xs' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                Refund Money (Return)
              </button>
              <button
                type="button"
                onClick={() => setReturnType('EXCHANGE')}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  returnType === 'EXCHANGE' ? 'bg-orange-500 text-white border-orange-500 shadow-2xs' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                Size Exchange
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Reason for request *</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl bg-white font-medium"
              >
                <option value="Wrong Size Received">Wrong Size Received (Fitting issue)</option>
                <option value="Damaged / Defective Product">Damaged or Defective Product</option>
                <option value="Item Not As Described">Item Not As Described / Color difference</option>
                <option value="Quality not as expected">Quality not as expected</option>
                <option value="Received Wrong Item">Received completely different product</option>
              </select>
            </div>

            {returnType === 'EXCHANGE' && (
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Replacement Size Needed *</label>
                <div className="flex gap-2">
                  {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                    <button
                      type="button"
                      key={sz}
                      onClick={() => setSelectedExchangeSize(sz)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${
                        selectedExchangeSize === sz ? 'bg-indigo-950 text-white border-indigo-950' : 'bg-gray-50 text-gray-800'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {returnType === 'RETURN' && (
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">UPI ID for Direct Refund *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. mobile@upi or name@okaxis"
                  value={refundUpiId}
                  onChange={(e) => setRefundUpiId(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-1">Refund will be credited within 2 business days after quality check.</p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Additional details (Optional)</label>
              <textarea
                rows={2}
                value={customerComment}
                onChange={(e) => setCustomerComment(e.target.value)}
                placeholder="Explain any specific issue with the fabric, stitch, or parcel condition..."
                className="w-full text-xs p-2.5 border rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="flex-1 py-2.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 text-xs font-bold bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      <Footer />
    </main>
  );
}
