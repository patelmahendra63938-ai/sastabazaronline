'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, FileText, Printer, Loader2, Receipt } from 'lucide-react';
import { resolveOrderTotals } from '@/lib/orders/order-totals';

export default function AdminInvoicesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Fetch orders (the exact same source powering the working Admin Order Book)
  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Professional Tax & GST Breakdown Calculator using real order items
  const calculateTaxBreakdown = (items: any[], customerState: string = 'Gujarat', businessState: string = 'Gujarat') => {
    const taxSummary: Record<number, { taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }> = {};
    let grandTaxable = 0;
    let grandTax = 0;

    const isIntraState = customerState.trim().toLowerCase() === businessState.trim().toLowerCase();

    items?.forEach(item => {
      const lineTotal = Number(item.line_total || (item.unit_price * item.quantity) || item.total_amount || 0);
      const gstRate = Number(item.gst_rate || 5); // Default GST fallback

      // Inclusive GST formula: Taxable Value = Line Total / (1 + Rate / 100)
      const taxableVal = lineTotal / (1 + (gstRate / 100));
      const taxVal = lineTotal - taxableVal;

      grandTaxable += taxableVal;
      grandTax += taxVal;

      if (!taxSummary[gstRate]) {
        taxSummary[gstRate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
      }

      taxSummary[gstRate].taxable += taxableVal;
      if (isIntraState) {
        taxSummary[gstRate].cgst += taxVal / 2;
        taxSummary[gstRate].sgst += taxVal / 2;
      } else {
        taxSummary[gstRate].igst += taxVal;
      }
      taxSummary[gstRate].totalTax += taxVal;
    });

    return {
      taxSummary,
      grandTaxable: Math.round(grandTaxable * 100) / 100,
      grandTax: Math.round(grandTax * 100) / 100,
      isIntraState
    };
  };

  const filteredOrders = orders.filter(o => 
    (o.order_number || o.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.customer_phone || o.phone || '').includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-indigo-950">GST Invoices & Tax Management</h1>
        <p className="text-xs text-gray-500 mt-1">Official B2C tax invoices synchronized directly from active orders (GSTIN: 24AKBPD1704F1Z1).</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Order #, Customer Name, Phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>
        <span className="text-xs font-bold text-gray-500">Total Invoices Available: {orders.length}</span>
      </div>

      {/* Invoices Table linked to Orders */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading invoices from orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-xs text-gray-500">No invoices found matching your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-600 font-bold uppercase text-[10px]">
                  <th className="p-3.5">Invoice / Order #</th>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Taxable Subtotal</th>
                  <th className="p-3.5">Total GST</th>
                  <th className="p-3.5">Grand Total</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map(order => {
                  const items = order.order_items || [];
                  const breakdown = calculateTaxBreakdown(items);
                  const orderNum = order.order_number || order.id?.slice(0, 8) || 'SBZ-000';
                  const grandTotal = Number(order.grand_total || order.total_amount || 0);

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="p-3.5 font-mono font-bold text-indigo-950">
                        INV-{orderNum}
                      </td>
                      <td className="p-3.5 font-bold text-gray-900">
                        {order.customer_name || 'Customer'}
                        <p className="text-[10px] font-normal text-gray-500">{order.customer_phone || order.phone}</p>
                      </td>
                      <td className="p-3.5 font-mono text-gray-700">₹{breakdown.grandTaxable.toFixed(2)}</td>
                      <td className="p-3.5 font-mono text-indigo-700 font-bold">₹{breakdown.grandTax.toFixed(2)}</td>
                      <td className="p-3.5 font-mono font-black text-gray-950">₹{grandTotal}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedInvoice({ ...order, computedBreakdown: breakdown, itemsList: items, invoiceNum: orderNum })}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5"
                        >
                          <FileText size={14} /> View Tax Invoice
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL TAX INVOICE PREVIEW & PRINT                               */}
      {/* ========================================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl space-y-6 text-xs">
            
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <h3 className="font-black text-indigo-950 text-sm flex items-center gap-2">
                <Receipt size={18} className="text-orange-500" /> Tax Invoice — INV-{selectedInvoice.invoiceNum}
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="bg-indigo-950 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-indigo-900 transition shadow"
                >
                  <Printer size={14} /> Print / Download PDF
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 px-3 py-1 text-lg font-bold">
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Invoice Container */}
            <div className="space-y-6 border p-6 rounded-2xl bg-white shadow-sm">
              
              {/* Company Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-xl font-black text-indigo-950">Sastabazar Online</h2>
                  <p className="text-gray-500">Surat, Gujarat, India - 395006</p>
                  <p className="text-gray-500 font-mono mt-1 font-bold">GSTIN: 24AKBPD1704F1Z1</p>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-gray-900 text-sm">TAX INVOICE</h3>
                  <p className="font-mono text-indigo-950 font-bold mt-1">INV-{selectedInvoice.invoiceNum}</p>
                  <p className="text-gray-500 mt-0.5">Order Date: {new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                  <p className="text-gray-500">Payment: {selectedInvoice.payment_method} ({selectedInvoice.payment_status})</p>
                </div>
              </div>

              {/* Billing & Shipping Details */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <span className="font-bold text-gray-400 uppercase text-[10px]">Billed To Customer:</span>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedInvoice.customer_name}</p>
                  <p className="text-gray-600">{selectedInvoice.customer_phone || selectedInvoice.phone}</p>
                  <p className="text-gray-600">{selectedInvoice.customer_email}</p>
                </div>
                <div>
                  <span className="font-bold text-gray-400 uppercase text-[10px]">Shipping Address:</span>
                  <p className="text-gray-800 mt-0.5">
                    {typeof selectedInvoice.shipping_address === 'string'
                      ? selectedInvoice.shipping_address
                      : `${selectedInvoice.shipping_address?.address || ''}, ${selectedInvoice.shipping_address?.city || ''} - ${selectedInvoice.shipping_address?.pincode || ''}`}
                  </p>
                </div>
              </div>

              {/* Product Items Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 font-bold text-gray-600 text-[10px] uppercase">
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">HSN</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">GST Rate</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedInvoice.itemsList?.map((item: any, idx: number) => {
                    const price = Number(item.unit_price || 0);
                    const qty = Number(item.quantity || 1);
                    const lineTot = Number(item.line_total || (price * qty));
                    return (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-gray-900">{item.product_title}</td>
                        <td className="p-2.5 font-mono text-gray-500">{item.hsn_code || '6204'}</td>
                        <td className="p-2.5 text-center">{qty}</td>
                        <td className="p-2.5 text-right font-mono">₹{price}</td>
                        <td className="p-2.5 text-right font-mono">{item.gst_rate || 5}%</td>
                        <td className="p-2.5 text-right font-mono font-bold">₹{lineTot}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* GST Tax Summary Breakdown (CGST / SGST / IGST) */}
              {(() => {
                const breakdown = selectedInvoice.computedBreakdown;
                return (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-bold text-gray-700 uppercase text-[10px]">
                      GST Tax Breakdown Summary ({breakdown.isIntraState ? 'Intra-State: CGST + SGST' : 'Inter-State: IGST'})
                    </h4>
                    <table className="w-full text-left border-collapse bg-gray-50 rounded-xl overflow-hidden">
                      <thead>
                        <tr className="border-b bg-gray-100 text-[10px] font-bold text-gray-600 uppercase">
                          <th className="p-2">GST Rate</th>
                          <th className="p-2 text-right">Taxable Value</th>
                          <th className="p-2 text-right">CGST</th>
                          <th className="p-2 text-right">SGST</th>
                          <th className="p-2 text-right">IGST</th>
                          <th className="p-2 text-right">Total Tax</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-mono text-[11px]">
                        {Object.entries(breakdown.taxSummary).map(([rate, val]: [string, any]) => (
                          <tr key={rate}>
                            <td className="p-2 font-bold">{rate}%</td>
                            <td className="p-2 text-right">₹{val.taxable.toFixed(2)}</td>
                            <td className="p-2 text-right">₹{val.cgst.toFixed(2)}</td>
                            <td className="p-2 text-right">₹{val.sgst.toFixed(2)}</td>
                            <td className="p-2 text-right">₹{val.igst.toFixed(2)}</td>
                            <td className="p-2 text-right font-bold">₹{val.totalTax.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Grand Totals */}
                    <div className="flex justify-end pt-2">
                      <div className="w-64 space-y-1.5 font-mono">
                        <div className="flex justify-between text-gray-600">
                          <span>Taxable Subtotal:</span>
                          <span>₹{breakdown.grandTaxable.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Total GST:</span>
                          <span>₹{breakdown.grandTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Shipping Charge:</span>
                          <span>₹{selectedInvoice.shipping_charge || 0}</span>
                        </div>
                        {resolveOrderTotals(selectedInvoice).isCod && <div className="flex justify-between text-gray-600"><span>COD Charge:</span><span>₹{resolveOrderTotals(selectedInvoice).codCharge}</span></div>}
                        <div className="flex justify-between font-black text-indigo-950 text-sm border-t pt-2">
                          <span>Grand Total:</span>
                          <span>₹{selectedInvoice.grand_total}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
