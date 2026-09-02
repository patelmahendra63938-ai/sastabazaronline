'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BadgeIndianRupee, CheckCircle2, Pencil, X } from 'lucide-react';
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
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const saved = readSavedDetails();
    if (saved?.requested === true) {
      setEnabled(true);
      setGstin(String(saved.gstin || ''));
      setBillingAddress(String(saved.billing_address || ''));
    }

    let createdTarget: HTMLDivElement | null = null;

    const placeInline = () => {
      const headings = Array.from(document.querySelectorAll('h3'));
      const paymentHeading = headings.find((heading) =>
        heading.textContent?.includes('2. Payment Method')
      );
      const paymentSection = paymentHeading?.parentElement;
      const form = paymentSection?.parentElement;

      if (!paymentSection || !form) return false;

      const existing = document.getElementById('checkout-gst-inline-slot');
      if (existing) {
        setPortalTarget(existing);
        return true;
      }

      createdTarget = document.createElement('div');
      createdTarget.id = 'checkout-gst-inline-slot';
      paymentSection.insertAdjacentElement('beforebegin', createdTarget);
      setPortalTarget(createdTarget);
      return true;
    };

    if (!placeInline()) {
      const observer = new MutationObserver(() => {
        if (placeInline()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });

      const timeout = window.setTimeout(() => observer.disconnect(), 5000);
      return () => {
        window.clearTimeout(timeout);
        observer.disconnect();
        if (createdTarget?.isConnected) createdTarget.remove();
      };
    }

    return () => {
      if (createdTarget?.isConnected) createdTarget.remove();
    };
  }, []);

  const clearDetails = () => {
    document.cookie = `${CHECKOUT_GST_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    setEnabled(false);
    setGstin('');
    setBillingAddress('');
    setError('');
    setOpen(false);
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
    setBillingAddress(cleanAddress);
    setError('');
    setOpen(false);
  };

  const inlineCard = (
    <section className={`rounded-2xl border-2 p-4 sm:p-5 transition ${enabled ? 'border-green-200 bg-green-50/70' : 'border-[#ead8b8] bg-[#fff7e8]'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${enabled ? 'bg-green-100 text-green-700' : 'bg-white text-[#741f23]'}`}>
            {enabled ? <CheckCircle2 size={18} /> : <BadgeIndianRupee size={18} />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b5843d]">GST Billing</p>
            <h3 className="mt-0.5 text-sm font-black text-[#741f23]">
              {enabled ? 'GST Invoice Requested ✓' : 'Need GST Invoice for this order?'}
            </h3>
            {!enabled && (
              <p className="mt-1 text-[11px] leading-5 text-gray-600">
                Add your GSTIN and GST billing address before placing the order.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#741f23] px-4 py-2.5 text-[11px] font-black text-white transition hover:bg-[#5e171b]"
        >
          {enabled ? <Pencil size={13} /> : <BadgeIndianRupee size={13} />}
          {enabled ? 'Edit GST Details' : 'Add GST Details'}
        </button>
      </div>

      {enabled && (
        <div className="mt-4 rounded-xl border border-green-200 bg-white p-3 text-[11px] leading-5 text-gray-700">
          <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
            <span className="font-black text-gray-500">GSTIN</span>
            <span className="font-mono font-black text-[#741f23]">{gstin}</span>
            <span className="font-black text-gray-500">Billing Address</span>
            <span className="font-medium">{billingAddress}</span>
          </div>
          <p className="mt-3 border-t border-green-100 pt-2 text-[10px] text-gray-500">
            GST invoice details will be attached to this order as provided. The invoice is prepared only after the order is placed.
          </p>
        </div>
      )}
    </section>
  );

  return (
    <>
      {portalTarget ? createPortal(inlineCard, portalTarget) : null}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#ead8b8] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#b5843d]">Secure Checkout</p>
                <h2 className="mt-1 text-xl font-black text-[#741f23]">GST Invoice Details</h2>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  Enter your GSTIN and GST billing address. These details will be attached to this order exactly as provided.
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
                We perform structural GSTIN validation only. Your GSTIN is not marked as externally verified.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
