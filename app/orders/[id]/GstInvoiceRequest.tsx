'use client';

import React, { useMemo, useState } from 'react';
import { BadgeCheck, FileText, Loader2, X } from 'lucide-react';
import { saveCustomerGstInvoiceAction } from '@/actions/customerGstInvoice';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function GstInvoiceRequest({
  orderRef,
  shippingAddress,
  guestEmail,
  guestPhone,
}: {
  orderRef: string;
  shippingAddress: any;
  guestEmail?: string;
  guestPhone?: string;
}) {
  const existing = useMemo(() => {
    if (!shippingAddress || typeof shippingAddress !== 'object') return null;
    return shippingAddress.gst_invoice || null;
  }, [shippingAddress]);

  const [open, setOpen] = useState(false);
  const [gstin, setGstin] = useState(String(existing?.gstin || ''));
  const [billingAddress, setBillingAddress] = useState(String(existing?.billing_address || ''));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(Boolean(existing?.gstin));
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanGstin = gstin.trim().toUpperCase();

    if (!GSTIN_PATTERN.test(cleanGstin)) {
      setError('Enter a valid 15-character GSTIN.');
      return;
    }

    if (billingAddress.trim().length < 10) {
      setError('Enter the complete GST billing address.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await saveCustomerGstInvoiceAction({
        orderRef,
        gstin: cleanGstin,
        billingAddress: billingAddress.trim(),
        email: guestEmail?.trim() || undefined,
        phone: guestPhone?.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'GST invoice details could not be saved.');
      }

      setGstin(cleanGstin);
      setSaved(true);
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || 'GST invoice details could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="rounded-3xl border border-[#ead8b8] bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#b5843d]">Business Purchase</p>
            <h2 className="mt-1 text-sm font-black text-[#741f23]">Need GST Invoice?</h2>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-gray-500">
              Add your GSTIN and GST billing address to this order. No external GST verification is performed; the details are saved exactly as provided by you.
            </p>
          </div>

          {saved ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs font-bold text-green-700 transition hover:bg-green-100"
            >
              <BadgeCheck size={15} /> GST Details Saved
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#741f23] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#5e171b]"
            >
              <FileText size={15} /> Need GST Invoice
            </button>
          )}
        </div>

        {saved && gstin && (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50/70 p-3 text-[11px] text-green-900">
            <p><span className="font-bold">Customer GSTIN:</span> <span className="font-mono">{gstin}</span></p>
            <p className="mt-1"><span className="font-bold">GST Billing Address:</span> {billingAddress}</p>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-[#741f23]">GST Invoice Details</h3>
                <p className="mt-0.5 text-[10px] text-gray-500">These details will be attached to this order.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>
            )}

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-gray-700">GSTIN *</label>
              <input
                type="text"
                required
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="24ABCDE1234F1Z5"
                className="w-full rounded-xl border border-[#ead8b8] px-3 py-2.5 font-mono text-xs uppercase outline-none focus:ring-2 focus:ring-[#d7aa5b]"
              />
              <p className="mt-1 text-[10px] text-gray-500">Please check the GSTIN carefully before saving.</p>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-gray-700">GST Billing Address *</label>
              <textarea
                required
                rows={4}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Business name/address, city, state and PIN code"
                className="w-full rounded-xl border border-[#ead8b8] px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#d7aa5b]"
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-800">
              ADHYEY BROTHERS does not verify this GSTIN with an external GST API. The customer is responsible for entering correct GST details.
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-200">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[#741f23] py-2.5 text-xs font-bold text-white hover:bg-[#5e171b] disabled:opacity-60">
                {saving ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Saving...</span> : 'Save GST Details'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
