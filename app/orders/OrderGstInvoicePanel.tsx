'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BadgeCheck, FileText, Loader2, X } from 'lucide-react';
import { getVerifiedOrderDetailAction } from '@/actions/orderDetails';
import { saveCustomerGstInvoiceAction } from '@/actions/customerGstInvoice';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function OrderGstInvoicePanel() {
  const pathname = usePathname();
  const orderRef = useMemo(() => {
    const match = pathname?.match(/^\/orders\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : '';
  }, [pathname]);

  const [open, setOpen] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [needsGuestVerification, setNeedsGuestVerification] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderRef) return;

    let cancelled = false;
    const load = async () => {
      setLoadingOrder(true);
      try {
        const result = await getVerifiedOrderDetailAction({ orderRef });
        if (cancelled) return;

        if (result.success && result.order) {
          const gst =
            result.order.shipping_address && typeof result.order.shipping_address === 'object'
              ? result.order.shipping_address.gst_invoice
              : null;
          if (gst?.gstin) {
            setGstin(String(gst.gstin));
            setBillingAddress(String(gst.billing_address || ''));
            setSaved(true);
          }
          setNeedsGuestVerification(false);
        } else if (result.requiresVerification) {
          setNeedsGuestVerification(true);
        }
      } finally {
        if (!cancelled) setLoadingOrder(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderRef]);

  if (!orderRef) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanGstin = gstin.trim().toUpperCase();

    if (!GSTIN_PATTERN.test(cleanGstin)) {
      setError('Please enter a valid 15-character GSTIN.');
      return;
    }

    if (billingAddress.trim().length < 10) {
      setError('Please enter the complete GST billing address.');
      return;
    }

    if (needsGuestVerification) {
      if (!guestEmail.trim() || guestPhone.replace(/\D/g, '').length < 10) {
        setError('Enter the same email and phone number used for this order.');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const result = await saveCustomerGstInvoiceAction({
        orderRef,
        gstin: cleanGstin,
        billingAddress: billingAddress.trim(),
        email: needsGuestVerification ? guestEmail.trim() : undefined,
        phone: needsGuestVerification ? guestPhone.trim() : undefined,
      });

      if (!result.success) throw new Error(result.error || 'GST invoice details could not be saved.');

      setGstin(cleanGstin);
      setSaved(true);
      setNeedsGuestVerification(false);
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || 'GST invoice details could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loadingOrder}
        className={`fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-xs font-black shadow-xl transition sm:right-6 ${
          saved
            ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
            : 'bg-[#741f23] text-white hover:bg-[#5e171b]'
        }`}
      >
        {loadingOrder ? <Loader2 size={15} className="animate-spin" /> : saved ? <BadgeCheck size={16} /> : <FileText size={16} />}
        {saved ? 'GST Details Saved' : 'Need GST Invoice?'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#b5843d]">Business Purchase</p>
                <h3 className="mt-1 text-sm font-black text-[#741f23]">GST Invoice Details</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-gray-600">
              Enter your GSTIN and GST billing address. These details will be attached to this order for GST invoicing. No external GST API verification is used.
            </p>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>
            )}

            {needsGuestVerification && (
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-amber-900">Order Email *</label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-amber-900">Order Phone *</label>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs outline-none"
                  />
                </div>
              </div>
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
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-gray-700">GST Billing Address *</label>
              <textarea
                required
                rows={4}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Complete GST billing address with city, state and PIN code"
                className="w-full rounded-xl border border-[#ead8b8] px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#d7aa5b]"
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-800">
              Please enter your GST details carefully. ADHYEY BROTHERS stores the information exactly as submitted by the customer.
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
