'use client';

import { useState, useTransition } from 'react';
import { CirclePlus, Loader2, X } from 'lucide-react';
import { addCodSettlement, addCreditNote, addSupplierInvoice, type AccountEntryResult } from './actions';

type EntryType = 'supplier' | 'cod' | 'credit';

const today = () => new Date().toISOString().slice(0, 10);
const fieldClass = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100';

export default function AccountingEntryForm({ type, onSaved }: { type: EntryType; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const labels = { supplier: 'Add Supplier Invoice', cod: 'Add COD Settlement', credit: 'Issue Credit Note' };

  const submit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      let result: AccountEntryResult;
      if (type === 'supplier') result = await addSupplierInvoice(formData);
      else if (type === 'cod') result = await addCodSettlement(formData);
      else result = await addCreditNote(formData);
      if (!result.success) { setMessage(result.error || 'Unable to save.'); return; }
      await onSaved();
      setOpen(false);
    });
  };

  return <>
    <button onClick={() => { setMessage(null); setOpen(true); }} className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600"><CirclePlus size={15}/>{labels[type]}</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={`${type}-entry-title`} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between"><h2 id={`${type}-entry-title`} className="text-lg font-black text-indigo-950">{labels[type]}</h2><button onClick={() => setOpen(false)} aria-label="Close form" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><X size={20}/></button></div>
        <form action={submit} className="grid gap-4 sm:grid-cols-2">
          {type === 'supplier' && <SupplierFields />}
          {type === 'cod' && <CodFields />}
          {type === 'credit' && <CreditFields />}
          {message && <p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{message}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 text-xs font-bold text-gray-600">Cancel</button><button disabled={pending} className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl bg-indigo-950 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{pending?<><Loader2 size={14} className="animate-spin"/>Saving…</>:'Save Entry'}</button></div>
        </form>
      </div>
    </div>}
  </>;
}

function Field({ label, name, type='text', required=true, defaultValue, placeholder }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string|number; placeholder?: string }) { return <label className="space-y-1 text-xs font-bold text-gray-700"><span>{label}{required?' *':''}</span><input className={fieldClass} name={name} type={type} min={type==='number'?'0':undefined} step={type==='number'?'0.01':undefined} required={required} defaultValue={defaultValue} placeholder={placeholder}/></label> }
function TaxFields() { return <><Field label="Taxable Amount" name="taxable_amount" type="number"/><Field label="CGST" name="cgst" type="number" defaultValue={0}/><Field label="SGST" name="sgst" type="number" defaultValue={0}/><Field label="IGST" name="igst" type="number" defaultValue={0}/></> }
function SupplierFields() { return <><Field label="Supplier Name" name="supplier_name"/><Field label="Supplier GSTIN" name="supplier_gstin" required={false}/><Field label="Supplier Invoice Number" name="invoice_number"/><Field label="Invoice Date" name="invoice_date" type="date" defaultValue={today()}/><TaxFields/><Field label="Amount Paid" name="amount_paid" type="number" defaultValue={0}/><Field label="Notes" name="notes" required={false}/></> }
function CodFields() { return <><Field label="Courier Partner" name="partner_name" defaultValue="NimbusPost"/><Field label="Settlement Reference" name="settlement_reference"/><Field label="Settlement Date" name="settlement_date" type="date" defaultValue={today()}/><Field label="Order Count" name="order_count" type="number" defaultValue={0}/><Field label="COD Collected" name="cod_collected" type="number"/><Field label="Courier Charge" name="courier_charge" type="number" defaultValue={0}/><Field label="COD Charge" name="cod_charge" type="number" defaultValue={0}/><Field label="RTO Charge" name="rto_charge" type="number" defaultValue={0}/><Field label="Other Deduction" name="other_deduction" type="number" defaultValue={0}/><label className="space-y-1 text-xs font-bold text-gray-700"><span>Status *</span><select name="status" className={fieldClass} defaultValue="PENDING"><option value="PENDING">Pending</option><option value="CREDITED">Credited</option></select></label><Field label="Bank UTR (required if credited)" name="bank_utr" required={false}/></> }
function CreditFields() { return <><Field label="Credit Note Number" name="credit_note_number" placeholder="CN/2026-27/000001"/><Field label="Order Number" name="order_number" required={false}/><Field label="Issue Date" name="issue_date" type="date" defaultValue={today()}/><Field label="Reason" name="reason"/><TaxFields/><Field label="Refund Reference / UTR" name="refund_reference" required={false}/></> }
