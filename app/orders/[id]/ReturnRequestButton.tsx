'use client';

import React, { useState } from 'react';
import { submitReturnRequestAction } from '@/actions/customerReturn';
import { RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  orderId: string;
  orderItemId: string;
  productId: string;
  quantity: number;
}

export default function ReturnRequestButton({ orderId, orderItemId, productId, quantity }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('Size/Fit Issue');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await submitReturnRequestAction({
      orderId,
      orderItemId,
      productId,
      quantity,
      reason,
      comment
    });

    if (res.success) {
      setSubmitted(true);
    } else {
      alert(res.error || 'Failed to submit return.');
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 text-indigo-900 text-[11px] font-bold hover:bg-indigo-100 transition flex items-center gap-1.5"
      >
        <RotateCcw size={12} /> Return Item
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border shadow-2xl space-y-4">
            {submitted ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 size={48} className="text-green-600 mx-auto" />
                <h3 className="text-lg font-black text-indigo-950">Return Request Submitted!</h3>
                <p className="text-xs text-gray-500">Our logistics team will verify and assign a reverse pickup courier.</p>
                <button
                  onClick={() => { setOpen(false); window.location.reload(); }}
                  className="bg-indigo-950 text-white font-bold text-xs px-6 py-2.5 rounded-xl"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <RotateCcw size={16} /> 7-Day Easy Return
                  </h3>
                  <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
                </div>

                <div className="text-xs space-y-3">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase text-[10px] mb-1">Reason for Return *</label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    >
                      <option>Size/Fit Issue</option>
                      <option>Defective / Damaged Fabric</option>
                      <option>Color Mismatch / Wrong Product</option>
                      <option>Quality not as expected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 uppercase text-[10px] mb-1">Additional Comments</label>
                    <textarea
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Explain the issue briefly..."
                      className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-950 text-white px-5 py-2 text-xs font-bold rounded-xl hover:bg-indigo-900 disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}