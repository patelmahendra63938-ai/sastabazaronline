import Header from '@/components/Header';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Package, Truck, ArrowRight, ShoppingBag } from 'lucide-react';
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

export default async function OrderSuccessPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params;
  const order = await getOrder(resolvedParams.id);
  const totals = order ? resolveOrderTotals(order) : null;

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <CheckCircle2 size={64} className="mx-auto text-green-600 mb-4 animate-bounce" />
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Order Placed Successfully!</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          Thank you for shopping with <span className="font-bold text-indigo-950">Sastabazar</span>. Operated by Adhyey Brothers.
        </p>

        {order ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mt-8 text-left space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-2">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Order ID</p>
                <p className="font-mono font-bold text-sm text-indigo-600">{order.id}</p>
              </div>
              <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Status: {order.payment_status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="font-bold text-gray-900 mb-2 flex items-center gap-1.5"><Truck size={16} className="text-indigo-600" /> Shipping Details</p>
                <p className="font-semibold text-gray-800">{order.customer_name}</p>
                <p className="text-gray-600 text-xs">Phone: {order.customer_phone}</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                  {order.shipping_address?.address}, {order.shipping_address?.city} - {order.shipping_address?.pincode}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <p className="font-bold text-gray-900 mb-2 flex items-center gap-1.5"><Package size={16} className="text-indigo-600" /> Payment Summary</p>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex justify-between"><span>Product Subtotal</span><b>₹{totals?.productSubtotal}</b></div>
                    {Boolean(totals?.discountAmount) && <div className="flex justify-between text-green-700"><span>Discount</span><b>-₹{totals?.discountAmount}</b></div>}
                    <div className="flex justify-between"><span>Shipping Charge</span><b>₹{totals?.shippingCharge}</b></div>
                    {totals?.isCod && <div className="flex justify-between"><span>COD Charge</span><b>₹{totals.codCharge}</b></div>}
                    <div className="flex justify-between border-t pt-1.5 text-sm font-black text-gray-900"><span>Grand Total</span><span>₹{totals?.grandTotal}</span></div>
                    <div className="flex justify-between"><span>Payment Mode</span><b>{order.payment_method}</b></div>
                  </div>
                </div>
                <p className="text-[10px] text-green-600 font-semibold mt-2">✓ Verified & GST Invoice Ready</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl border mt-8">
            <p className="text-gray-500 text-sm">Order details loaded or processing...</p>
          </div>
        )}

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/"
            className="bg-indigo-950 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition shadow-md flex items-center gap-2"
          >
            <ShoppingBag size={18} /> Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
