import Header from '@/components/Header';
export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import {
  CheckCircle2,
  Package,
  Truck,
  ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import { resolveOrderTotals } from '@/lib/orders/order-totals';

async function getOrder(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export default async function OrderSuccessPage({
  params,
}: {
  params: { id: string };
}) {
  const resolvedParams = await params;
  const order = await getOrder(resolvedParams.id);
  const totals = order ? resolveOrderTotals(order) : null;

  return (
    <main className="min-h-screen bg-[#fffaf5] pb-16">
      <Header />

      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <CheckCircle2
          size={64}
          className="mx-auto mb-4 text-green-600 animate-bounce"
        />

        <h1 className="text-3xl font-black tracking-tight text-[#741f23]">
          Order Placed Successfully!
        </h1>

        <p className="mt-2 text-sm text-gray-600 sm:text-base">
          Thank you for shopping with{' '}
          <span className="font-bold text-[#741f23]">
            ADHYEY BROTHERS
          </span>
          .
        </p>

        {order ? (
          <div className="mt-8 space-y-6 rounded-2xl border border-[#ead8b8] bg-white p-6 text-left shadow-sm md:p-8">
            <div className="flex flex-col items-start justify-between gap-2 border-b border-[#ead8b8] pb-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">
                  Order ID
                </p>

                <p className="font-mono text-sm font-bold text-[#741f23]">
                  {order.id}
                </p>
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-800">
                Status: {order.payment_status}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-[#ead8b8] bg-[#fffdf9] p-4">
                <p className="mb-2 flex items-center gap-1.5 font-bold text-gray-900">
                  <Truck size={16} className="text-[#741f23]" />
                  Shipping Details
                </p>

                <p className="font-semibold text-gray-800">
                  {order.customer_name}
                </p>

                <p className="text-xs text-gray-600">
                  Phone: {order.customer_phone}
                </p>

                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {order.shipping_address?.address},{' '}
                  {order.shipping_address?.city}
                  {order.shipping_address?.state
                    ? `, ${order.shipping_address.state}`
                    : ''}{' '}
                  - {order.shipping_address?.pincode}
                </p>
              </div>

              <div className="rounded-xl border border-[#ead8b8] bg-[#fffdf9] p-4">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 font-bold text-gray-900">
                    <Package size={16} className="text-[#741f23]" />
                    Payment Summary
                  </p>

                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Product Subtotal</span>
                      <b>₹{totals?.productSubtotal}</b>
                    </div>

                    {Boolean(totals?.discountAmount) && (
                      <div className="flex justify-between text-green-700">
                        <span>Discount</span>
                        <b>-₹{totals?.discountAmount}</b>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Shipping Charge</span>
                      <b>₹{totals?.shippingCharge}</b>
                    </div>

                    {totals?.isCod && (
                      <div className="flex justify-between">
                        <span>COD Charge</span>
                        <b>₹{totals.codCharge}</b>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-[#ead8b8] pt-1.5 text-sm font-black text-gray-900">
                      <span>Grand Total</span>
                      <span>₹{totals?.grandTotal}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Payment Mode</span>
                      <b>{order.payment_method}</b>
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-[10px] font-semibold text-green-600">
                  ✓ Verified & GST Invoice Ready
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-[#ead8b8] bg-white p-6">
            <p className="text-sm text-gray-500">
              Order details loaded or processing...
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-[#741f23] px-8 py-3 font-bold text-white shadow-md transition hover:bg-[#5e171b]"
          >
            <ShoppingBag size={18} />
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}