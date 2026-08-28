'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { lookupOrdersAction } from '@/actions/orderLookup';
import { resolveOrderTotals } from '@/lib/orders/order-totals';
import {
  Package, Search, Mail, CheckCircle2, ChevronRight,
  Truck, Clock, RotateCcw, AlertCircle, Loader2,
} from 'lucide-react';

interface Props {
  isLoggedIn: boolean;
  initialEmail: string | null;
  initialOrders: any[] | null;
}

export default function OrdersLookupClient({ isLoggedIn, initialEmail, initialOrders }: Props) {
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchedEmail, setSearchedEmail] = useState<string | null>(initialEmail);
  const [orders, setOrders] = useState<any[] | null>(initialOrders);
  const [hasSearched, setHasSearched] = useState(isLoggedIn);

  const handleGuestSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumberInput.trim() || !emailInput.trim() || phoneInput.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter the order number, email and phone number used for the order.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await lookupOrdersAction({
      orderNumber: orderNumberInput.trim(),
      email: emailInput.trim(),
      phone: phoneInput,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to find the order. Please try again.');
      setLoading(false);
      return;
    }

    setSearchedEmail(res.email || emailInput.trim());
    setOrders(res.orders || []);
    setHasSearched(true);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="bg-green-100 text-green-800 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 size={12} /> Delivered
          </span>
        );
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Truck size={12} /> In Transit
          </span>
        );
      case 'RETURN_REQUESTED':
      case 'RETURNED':
        return (
          <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <RotateCcw size={12} /> Return in Progress
          </span>
        );
      case 'CANCELLED':
      case 'CANCELED':
        return (
          <span className="bg-red-100 text-red-800 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <AlertCircle size={12} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="bg-orange-100 text-orange-800 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Clock size={12} /> Confirmed / Processing
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {isLoggedIn ? (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-indigo-950">My Orders</h1>
            <p className="text-xs text-gray-500 mt-0.5">Track, manage and download invoices for your purchases</p>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
              <Mail size={14} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-indigo-900 tracking-wider">Account Email</p>
              <p className="text-xs font-mono font-bold text-indigo-950">{initialEmail}</p>
            </div>
            <span className="ml-2 text-green-600 font-bold text-xs">✓</span>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 px-2.5 py-1 rounded-md">
              Order Tracking Portal
            </span>
            <h1 className="text-2xl font-black text-indigo-950 mt-2">Find Your Order</h1>
            <p className="text-xs text-gray-500 mt-1">
              For your privacy, enter your order number together with the email address and phone number used at checkout.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleGuestSearch} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Order Number *</label>
              <input
                type="text"
                required
                value={orderNumberInput}
                onChange={(e) => setOrderNumberInput(e.target.value.toUpperCase())}
                placeholder="SBZ-..."
                className="w-full px-4 py-3 text-sm font-mono border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                Customer Email Address *
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Customer Phone Number *</label>
              <input
                type="tel"
                required
                inputMode="numeric"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Phone used at checkout"
                className="w-full px-4 py-3 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-gray-400">
                Already have an account? <Link href="/login?redirectTo=/orders" className="text-indigo-700 font-bold hover:underline">Sign In</Link>
              </p>

              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold px-6 py-3 rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={15} />}
                {loading ? 'Verifying Order...' : 'Find My Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-indigo-950 uppercase tracking-wider">
              {isLoggedIn ? `Your Orders (${orders?.length || 0})` : 'Verified Order'}
            </h2>
            {searchedEmail && !isLoggedIn && (
              <span className="text-xs text-gray-500 font-mono">
                Verified for: <strong>{searchedEmail}</strong>
              </span>
            )}
          </div>

          {(!orders || orders.length === 0) ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center shadow-xs space-y-4">
              <Package size={52} className="mx-auto text-gray-300" />
              <h3 className="text-base font-bold text-gray-800">No Order Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                The order details could not be verified. Please check the order number, email and phone number.
              </p>
              {!isLoggedIn && (
                <button
                  onClick={() => {
                    setHasSearched(false);
                    setOrderNumberInput('');
                    setEmailInput('');
                    setPhoneInput('');
                  }}
                  className="bg-indigo-50 text-indigo-950 text-xs font-bold px-5 py-2.5 rounded-xl border border-indigo-200 hover:bg-indigo-100 transition"
                >
                  Try Another Order
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord: any) => (
                <div
                  key={ord.id || ord.order_number}
                  className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
                >
                  <div className="bg-gray-50/90 px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase">Order Number</span>
                        <span className="font-mono font-black text-indigo-950 text-sm">{ord.order_number}</span>
                      </div>
                      <span className="text-gray-300">|</span>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase">Order Date</span>
                        <span className="text-gray-700 font-medium">
                          {ord.created_at ? new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(ord.order_status)}
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 font-bold block uppercase">Total Amount</span>
                        <span className="font-black text-gray-900 text-sm">₹{Number(ord.grand_total || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 divide-y divide-gray-100">
                    {(ord.items || ord.order_items || []).map((item: any) => (
                      <div key={item.id || `${item.product_id}-${item.size || ''}`} className="py-2.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                        <div>
                          <p className="text-xs font-bold text-gray-900 line-clamp-1">{item.product_title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Quantity: {item.quantity} • Unit Price: ₹{item.unit_price}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-800 font-mono">₹{item.line_total}</span>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const totals = resolveOrderTotals(ord);
                    return (
                      <div className="mx-5 mb-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl border bg-gray-50 p-3 text-[11px] text-gray-600 sm:grid-cols-3">
                        <span>Subtotal <b className="float-right text-gray-900">₹{totals.productSubtotal}</b></span>
                        {totals.discountAmount > 0 && <span className="text-green-700">Discount <b className="float-right">-₹{totals.discountAmount}</b></span>}
                        <span>Shipping <b className="float-right text-gray-900">₹{totals.shippingCharge}</b></span>
                        {totals.isCod && <span>COD Charge <b className="float-right text-gray-900">₹{totals.codCharge}</b></span>}
                        <span className="font-black text-indigo-950">Grand Total <b className="float-right">₹{totals.grandTotal}</b></span>
                      </div>
                    );
                  })()}

                  <div className="bg-gray-50/50 px-5 py-3 border-t flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-gray-500">
                      {ord.courier_partner && ord.tracking_number ? (
                        <span className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Truck size={13} className="text-indigo-600" />
                          <span>Dispatched via <strong>{ord.courier_partner}</strong> (AWB: {ord.tracking_number})</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">Payment: {ord.payment_method} ({ord.payment_status})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/orders/${ord.order_number}`}
                        className="bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                      >
                        <span>View Details & Tracking</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
