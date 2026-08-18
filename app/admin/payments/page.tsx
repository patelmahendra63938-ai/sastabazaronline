'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { CreditCard, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, grand_total, payment_method, payment_status, created_at')
        .order('created_at', { ascending: false });
      if (data) setOrders(data);
      setLoading(false);
    };
    fetchPayments();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-indigo-950">Payment & Transaction Ledger</h1>
        <p className="text-xs text-gray-500 mt-1">Monitor Cash on Delivery (COD) and UPI/QR scanning collections.</p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-bold text-xs text-gray-700 uppercase">
          Recent Payment Transactions ({orders.length})
        </div>
        {loading ? (
          <div className="p-16 text-center text-xs text-gray-400">Loading payment records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b text-[11px] font-bold text-gray-500 uppercase">
                  <th className="p-4">Order #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-mono font-bold text-indigo-950">{o.order_number}</td>
                    <td className="p-4 font-bold text-gray-900">{o.customer_name}</td>
                    <td className="p-4"><span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md font-bold text-[10px]">{o.payment_method}</span></td>
                    <td className="p-4 font-black text-gray-900">₹{o.grand_total}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        o.payment_status === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {o.payment_status || 'PENDING'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}