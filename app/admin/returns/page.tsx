'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { 
  RefreshCw, PackageX, Truck, ShieldAlert, CheckCircle2, 
  IndianRupee, ArrowRight, Settings, AlertTriangle, Search 
} from 'lucide-react';

export default function AdminReturnsRefundsDashboard() {
  const [activeTab, setActiveTab] = useState<'returns' | 'qc' | 'refunds' | 'settings'>('returns');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [returns, setReturns] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Modals
  const [qcModal, setQcModal] = useState<any | null>(null);
  const [refundModal, setRefundModal] = useState<any | null>(null);

  // QC State
  const [qcResult, setQcResult] = useState('PASSED');
  const [qcDisposition, setQcDisposition] = useState('RESTOCK');
  const [qcApprovedAmount, setQcApprovedAmount] = useState<number>(0);
  const [qcNotes, setQcNotes] = useState('');

  // Refund State
  const [utrInput, setUtrInput] = useState('');
  const [refundNotes, setRefundNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: retData } = await supabase.from('returns').select('*, return_items(*, products(title, images)), return_pickups(*)').order('requested_at', { ascending: false });
      if (retData) setReturns(retData);

      const { data: refData } = await supabase.from('refunds').select('*, returns(return_number, customer_name)').order('created_at', { ascending: false });
      if (refData) setRefunds(refData);

      const { data: setData } = await supabase.from('return_settings').select('*').single();
      if (setData) setSettings(setData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // KPIs
  const kpis = useMemo(() => {
    return {
      pendingQc: returns.filter(r => r.status === 'RECEIVED_AT_WAREHOUSE' || r.status === 'QC_PENDING').length,
      pendingRefunds: refunds.filter(r => ['REFUND_PENDING', 'REFUND_PROCESSING', 'REFUND_APPROVAL_REQUIRED'].includes(r.status)).length,
      refundedAmount: refunds.filter(r => r.status === 'REFUNDED').reduce((acc, curr) => acc + Number(curr.refund_amount), 0),
      delayedPickups: returns.filter(r => r.status === 'RETURN_APPROVED' && new Date(r.expected_pickup_at) < new Date()).length
    };
  }, [returns, refunds]);

  // Handle QC Submit
  const handleQcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Confirm QC as ${qcResult} and disposition as ${qcDisposition}?`)) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('process_return_qc', {
        p_return_id: qcModal.id,
        p_result: qcResult,
        p_disposition: qcDisposition,
        p_approved_refund: qcApprovedAmount,
        p_qc_notes: qcNotes,
        p_admin_name: 'Admin User'
      });
      if (error) throw error;
      alert('Quality Check completed. Inventory and Refunds generated securely.');
      setQcModal(null);
      fetchData();
    } catch (err: any) {
      alert(`QC Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Manual Refund Payout
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput || utrInput.length < 6) {
      alert('Valid UTR / Transaction Reference is required to mark refund as paid.');
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('mark_refund_paid', {
        p_refund_id: refundModal.id,
        p_utr_reference: utrInput,
        p_admin_name: 'Admin Finance',
        p_notes: refundNotes
      });
      if (error) throw error;
      alert('Refund successfully marked as PAID.');
      setRefundModal(null);
      setUtrInput('');
      fetchData();
    } catch (err: any) {
      alert(`Payment Logging Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const updateReturnStatus = async (id: string, status: string) => {
    await supabase.from('returns').update({ status }).eq('id', id);
    fetchData();
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-indigo-950 flex items-center gap-2">
              <PackageX className="text-red-500" /> Reverse Logistics & Refunds
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Strict manual payment controls & auditable inventory disposition.</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded-xl flex items-center gap-2">
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
        
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-orange-500">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Pending QC</p>
            <p className="text-2xl font-black text-indigo-950 mt-1">{kpis.pendingQc}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Pending Refunds</p>
            <p className="text-2xl font-black text-indigo-950 mt-1">{kpis.pendingRefunds}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-red-500">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Delayed Pickups</p>
            <p className="text-2xl font-black text-red-600 mt-1 flex items-center gap-2">
              {kpis.delayedPickups} {kpis.delayedPickups > 0 && <ShieldAlert size={18} />}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-green-500">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Total Refunded</p>
            <p className="text-2xl font-black text-green-700 mt-1">₹{kpis.refundedAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 gap-6">
          <button onClick={() => setActiveTab('returns')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'returns' ? 'border-indigo-600 text-indigo-950' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <Truck size={16} /> Returns Tracking
          </button>
          <button onClick={() => setActiveTab('qc')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'qc' ? 'border-indigo-600 text-indigo-950' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <PackageX size={16} /> Quality Check (QC)
          </button>
          <button onClick={() => setActiveTab('refunds')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'refunds' ? 'border-indigo-600 text-indigo-950' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <IndianRupee size={16} /> Refund Book
          </button>
        </div>

        {/* TAB: RETURNS TRACKING */}
        {activeTab === 'returns' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Return ID / Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returns.map(ret => (
                  <tr key={ret.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold text-indigo-900">
                      {ret.return_number}<br/>
                      <span className="text-gray-400 font-sans font-normal text-[10px]">{new Date(ret.requested_at).toLocaleDateString()}</span>
                    </td>
                    <td className="p-3 font-bold text-gray-800">{ret.customer_name}</td>
                    <td className="p-3 text-gray-600">{ret.return_items?.[0]?.products?.title}</td>
                    <td className="p-3">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-bold text-[10px]">{ret.status}</span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {ret.status === 'RETURN_REQUESTED' && (
                        <button onClick={() => updateReturnStatus(ret.id, 'RETURN_APPROVED')} className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-bold hover:bg-blue-200">Approve Pickup</button>
                      )}
                      {ret.status === 'RETURN_APPROVED' && (
                        <button onClick={() => updateReturnStatus(ret.id, 'RECEIVED_AT_WAREHOUSE')} className="text-[10px] bg-purple-100 text-purple-700 px-3 py-1.5 rounded font-bold hover:bg-purple-200">Mark Received at Warehouse</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: QUALITY CHECK */}
        {activeTab === 'qc' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Return ID</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Requested Refund</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returns.filter(r => r.status === 'RECEIVED_AT_WAREHOUSE' || r.status === 'QC_PENDING').map(ret => (
                  <tr key={ret.id} className="hover:bg-gray-50 border-l-4 border-l-orange-400">
                    <td className="p-3 font-mono font-bold">{ret.return_number}</td>
                    <td className="p-3 font-bold">{ret.return_items?.[0]?.products?.title}</td>
                    <td className="p-3 text-gray-600">{ret.return_items?.[0]?.reason}</td>
                    <td className="p-3 font-black text-indigo-900">₹{ret.total_refund_requested}</td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => { setQcModal(ret); setQcApprovedAmount(ret.total_refund_requested); }} 
                        className="bg-indigo-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-lg shadow-sm"
                      >
                        Perform QC & Disposition
                      </button>
                    </td>
                  </tr>
                ))}
                {returns.filter(r => r.status === 'RECEIVED_AT_WAREHOUSE' || r.status === 'QC_PENDING').length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-400">No items pending Quality Check.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: REFUND BOOK (STRICT MANUAL) */}
        {activeTab === 'refunds' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3">
              <ShieldAlert className="text-indigo-600" size={20} />
              <p className="text-xs text-indigo-900"><b>No Automatic Payment API Connected.</b> You must manually transfer funds via UPI/Bank and enter the UTR Reference below to mark a refund as PAID.</p>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Refund ID</th>
                  <th className="p-3">Customer (Return Ref)</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payout Method</th>
                  <th className="p-3">Status / UTR</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {refunds.map(ref => (
                  <tr key={ref.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold">{ref.refund_number}</td>
                    <td className="p-3">
                      <p className="font-bold text-gray-800">{ref.returns?.customer_name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{ref.returns?.return_number}</p>
                    </td>
                    <td className="p-3 font-black text-indigo-900">₹{ref.refund_amount}</td>
                    <td className="p-3">
                      <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">{ref.refund_method}</span><br/>
                      <span className="text-[9px] text-gray-500">{ref.customer_upi_id || 'vpatel@okicici'}</span>
                    </td>
                    <td className="p-3">
                      {ref.status === 'REFUNDED' ? (
                        <div>
                          <span className="text-green-700 font-bold text-[10px] bg-green-50 px-2 py-0.5 rounded">PAID</span>
                          <p className="text-[10px] font-mono mt-1 text-gray-600">UTR: {ref.refund_utr}</p>
                        </div>
                      ) : (
                        <span className="text-orange-700 font-bold text-[10px] bg-orange-50 px-2 py-0.5 rounded">{ref.status}</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {ref.status !== 'REFUNDED' && (
                        <button 
                          onClick={() => setRefundModal(ref)}
                          className="bg-green-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-green-700"
                        >
                          Log Payment & UTR
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: QUALITY CHECK (QC) & DISPOSITION */}
      {qcModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleQcSubmit} className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="border-b pb-3">
              <h3 className="text-lg font-black text-indigo-950">Quality Check: {qcModal.return_number}</h3>
              <p className="text-xs text-gray-500">Product: {qcModal.return_items[0].products?.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">QC Result</label>
                <select value={qcResult} onChange={(e) => setQcResult(e.target.value)} className="w-full text-xs border p-2 rounded-lg font-bold">
                  <option value="PASSED">PASSED (Resellable)</option>
                  <option value="PARTIAL">PARTIAL (Minor issues)</option>
                  <option value="FAILED">FAILED (Damaged/Used)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Inventory Disposition</label>
                <select value={qcDisposition} onChange={(e) => setQcDisposition(e.target.value)} className="w-full text-xs border p-2 rounded-lg font-bold text-indigo-900 bg-indigo-50">
                  <option value="RESTOCK">RESTOCK (+Available Inventory)</option>
                  <option value="DAMAGED">DAMAGED (+Damaged Ledger)</option>
                  <option value="REJECTED">REJECTED (No Inventory Change)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Approved Refund Amount (₹)</label>
              <input type="number" value={qcApprovedAmount} onChange={(e) => setQcApprovedAmount(Number(e.target.value))} className="w-full text-sm border p-2 rounded-lg font-black text-green-700" />
              <p className="text-[10px] text-gray-400 mt-1">Requested Amount: ₹{qcModal.total_refund_requested}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">QC Notes (Required if Failed)</label>
              <textarea value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} className="w-full text-xs border p-2 rounded-lg" rows={2} placeholder="e.g. Tags missing, slight stain on collar..."></textarea>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setQcModal(null)} className="flex-1 bg-gray-100 text-xs font-bold py-3 rounded-xl">Cancel</button>
              <button type="submit" disabled={actionLoading} className="flex-1 bg-indigo-950 text-white text-xs font-bold py-3 rounded-xl">
                {actionLoading ? 'Processing...' : 'Complete QC & Update Inventory'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MANUAL REFUND LOGGING */}
      {refundModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleRefundSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="border-b pb-3">
              <h3 className="text-lg font-black text-indigo-950">Process Manual Refund</h3>
              <p className="text-xs text-gray-500">Refund ID: {refundModal.refund_number}</p>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
              <p className="text-[10px] font-bold text-green-700 uppercase">Amount to Transfer</p>
              <p className="text-3xl font-black text-green-800">₹{refundModal.refund_amount}</p>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Customer Details for Payment</p>
              <p className="text-sm font-bold text-gray-900">{refundModal.returns?.customer_name}</p>
              <p className="text-xs text-gray-600 font-mono mt-1">UPI ID: <span className="bg-yellow-100 px-1 rounded">{refundModal.customer_upi_id || '9876543210@ybl'}</span></p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Bank / UPI UTR Reference Number <span className="text-red-500">*</span></label>
              <input type="text" required value={utrInput} onChange={(e) => setUtrInput(e.target.value)} placeholder="e.g. 312345678901" className="w-full text-sm font-mono border p-2.5 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              <p className="text-[9px] text-gray-400 mt-1">Mandatory. This serves as financial proof of the manual transfer.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Internal Notes</label>
              <input type="text" value={refundNotes} onChange={(e) => setRefundNotes(e.target.value)} placeholder="e.g. Refunded via GPay business account" className="w-full text-xs border p-2.5 rounded-lg" />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setRefundModal(null)} className="flex-1 bg-gray-100 text-xs font-bold py-3 rounded-xl">Cancel</button>
              <button type="submit" disabled={actionLoading} className="flex-1 bg-green-600 text-white text-xs font-bold py-3 rounded-xl hover:bg-green-700">
                {actionLoading ? 'Saving...' : 'Mark as PAID'}
              </button>
            </div>
          </form>
        </div>
      )}
      <Footer />
    </main>
  );
}