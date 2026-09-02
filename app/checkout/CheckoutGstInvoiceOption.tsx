'use client';

import { useEffect, useState } from 'react';
import { BadgeIndianRupee, CheckCircle2, X } from 'lucide-react';
import { CHECKOUT_GST_COOKIE } from '@/lib/gst/checkout-gst';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function readSavedDetails() {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CHECKOUT_GST_COOKIE}=`));

  if (!match) return null;

  try {
    const raw = match.slice(CHECKOUT_GST_COOKIE.length + 1);
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

export default function CheckoutGstInvoiceOption() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = readSavedDetails();
    if (saved?.requested === true) {
      setEnabled(true);
      setGstin(String(saved.gstin || ''));
      setBillingAddress(String(saved.billing_address || ''));
    }
  }, []);

  const clearDetails = () => {
    document.cookie = `${CHECKOUT_GST_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    setEnabled(false);
    setGstin('');
    setBillingAddress('');
    setError('');
  };

  const saveDetails = () => {
    const cleanGstin = gstin.trim().toUpperCase();
    const cleanAddress = billingAddress.trim();

    if (!GSTIN_PATTERN.test(cleanGstin)) {
      setError('Please enter a valid 15-character GSTIN.');
      return;
    }

    if (cleanAddress.length < 10) {
      setError('Please enter a complete GST billing address.');
      return;
    }

    const payload = encodeURIComponent(JSON.stringify({
      requested: true,
      gstin: cleanGstin,
      billing_address: cleanAddress,
    }));

    document.cookie = `${CHECKOUT_GST_COOKIE}=${payload}; path=/; max-age=7200; SameSite=Lax`;
    setEnabled(true);
    setGstin(cleanGstin);
    setError('');
    setOpen(false);
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 max-w-[calc(100vw-2rem)]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-2xl border border-[#d7aa5b] bg-white px-4 py-3 text-xs font-black text-[#741f23] shadow-xl transition hover:bg-[#fff7e8]"
        >
          {enabled ? <CheckCircle2 size={17} className="text-green-600" /> : <BadgeIndianRupee size={17} />}
          {enabled ? `GST Invoice: ${gstin}` : 'Need GST Invoice?'}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#ead8b8] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#b5843d]">Secure Checkout</p>
                <h2 className="mt-1 text-xl font-black text-[#741f23]">GST Invoice Details</h2>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  Enter your GSTIN and GST billing address. These details will be stored with this order exactly as provided for GST invoice preparation.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100" aria-label="Close GST invoice dialog">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-700">GSTIN *</label>
                <input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 15))}
                  maxLength={15}
                  autoCapitalize="characters"
                  placeholder="15-character GSTIN"
                  className="w-full rounded-xl border border-[#ead8b8] bg-white px-3 py-3 text-xs font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-[#d7aa5b]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-700">GST Billing Address *</label>
                <textarea
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  rows={4}
                  placeholder="Business billing address for GST invoice"
                  className="w-full rounded-xl border border-[#ead8b8] bg-white px-3 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-[#d7aa5b]"
                />
              </div>

              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={saveDetails} className="flex-1 rounded-xl bg-[#741f23] px-4 py-3 text-xs font-black text-white hover:bg-[#5e171b]">
                  Save GST Details
                </button>
                {enabled && (
                  <button type="button" onClick={clearDetails} className="rounded-xl border border-gray-200 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50">
                    Remove GST Invoice
                  </button>
                )}
              </div>

              <p className="text-[10px] leading-relaxed text-gray-500">
                We perform structural GSTIN validation only. The GSTIN is not marked as externally verified.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
