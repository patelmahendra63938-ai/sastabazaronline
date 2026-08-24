'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { BadgeIndianRupee, Banknote, BookOpen, FileMinus2, FileText, Landmark, Loader2, ReceiptText, Truck } from 'lucide-react';
import { calculateCodSettlement, financialYearFor, splitInclusiveGst } from '@/lib/accounting/calculations';
import { isCancelledOrderStatus } from '@/lib/orders/admin-order-status';
import AccountingEntryForm from './AccountingEntryForm';

type Order = { id: string; order_number?: string; created_at: string; customer_name?: string; grand_total?: number; total_amount?: number; shipping_charge?: number; cod_charge?: number; payment_method?: string; payment_status?: string; order_status?: string; order_items?: Array<{ line_total?: number; unit_price?: number; quantity?: number; gst_rate?: number }> };
type SupplierInvoice = { id: string; supplier_name: string; invoice_number: string; invoice_date: string; taxable_amount: number; cgst: number; sgst: number; igst: number; total_amount: number; amount_paid: number };
type CodSettlement = { id: string; partner_name: string; settlement_reference: string; settlement_date: string; cod_collected: number; courier_charge: number; cod_charge: number; rto_charge: number; other_deduction: number; net_bank_credit: number; status: string };
type CreditNote = { id: string; credit_note_number: string; issue_date: string; reason: string; total_amount: number };

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AccountsDashboard() {
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [settlements, setSettlements] = useState<CodSettlement[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [registersReady, setRegistersReady] = useState(true);
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersResult, supplierResult, settlementResult, creditResult] = await Promise.all([
      supabase.from('orders').select('id, order_number, created_at, customer_name, grand_total, total_amount, shipping_charge, cod_charge, payment_method, payment_status, order_status, order_items(line_total,unit_price,quantity,gst_rate)').order('created_at', { ascending: false }),
      supabase.from('supplier_tax_invoices').select('*').order('invoice_date', { ascending: false }),
      supabase.from('cod_settlements').select('*').order('settlement_date', { ascending: false }),
      supabase.from('credit_notes').select('*').order('issue_date', { ascending: false }),
    ]);
    setOrders((ordersResult.data || []) as Order[]);
    setSupplierInvoices((supplierResult.data || []) as SupplierInvoice[]);
    setSettlements((settlementResult.data || []) as CodSettlement[]);
    setCreditNotes((creditResult.data || []) as CreditNote[]);
    setRegistersReady(!supplierResult.error && !settlementResult.error && !creditResult.error);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // Initial remote-store synchronization for this client-side register.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const activeOrders = orders.filter(order => !isCancelledOrderStatus(order.order_status));
  const prepaidOrders = activeOrders.filter(order => !String(order.payment_method || '').toUpperCase().includes('COD'));
  const codOrders = activeOrders.filter(order => String(order.payment_method || '').toUpperCase().includes('COD'));
  const grossSales = activeOrders.reduce((sum, order) => sum + Number(order.grand_total || order.total_amount || 0), 0);
  const prepaidReceived = prepaidOrders.filter(order => order.payment_status === 'PAID').reduce((sum, order) => sum + Number(order.grand_total || order.total_amount || 0), 0);
  const codExpected = codOrders.reduce((sum, order) => sum + Number(order.grand_total || order.total_amount || 0), 0);
  const codCredited = settlements.filter(row => row.status === 'CREDITED').reduce((sum, row) => sum + Number(row.net_bank_credit || 0), 0);
  const inputGst = supplierInvoices.reduce((sum, row) => sum + Number(row.cgst || 0) + Number(row.sgst || 0) + Number(row.igst || 0), 0);
  const outputGst = activeOrders.reduce((sum, order) => sum + (order.order_items || []).reduce((itemSum, item) => {
    const total = Number(item.line_total || Number(item.unit_price || 0) * Number(item.quantity || 1));
    return itemSum + splitInclusiveGst(total, Number(item.gst_rate || 5), true).cgst + splitInclusiveGst(total, Number(item.gst_rate || 5), true).sgst;
  }, 0), 0);
  const fy = financialYearFor(new Date());

  const tabs = [
    ['overview', 'Overview'], ['gst', 'GST Report'], ['prepaid', 'Prepaid Register'], ['cod', 'COD Settlements'],
    ['supplier', 'Supplier Tax Invoices'], ['credit', 'Credit Notes'], ['outstanding', 'Outstanding Payments'],
  ];

  if (loading) return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="animate-spin" size={18} /> Loading accounts…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-xs font-black uppercase tracking-widest text-orange-600">Financial Year {fy}</p><h1 className="text-2xl font-black text-indigo-950">Accounts & GST</h1><p className="mt-1 text-xs text-gray-500">Customer prices include GST. Registers separate taxable value and tax automatically.</p></div>
        <Link href="/admin/invoices" className="rounded-xl bg-indigo-950 px-4 py-2 text-center text-xs font-bold text-white">Customer Tax Invoices</Link>
      </div>

      {!registersReady && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">Preview mode: existing order accounts are live. New supplier, COD settlement and credit-note registers activate after the included Supabase migration is approved.</div>}

      <div className="flex gap-2 overflow-x-auto pb-1">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${tab === key ? 'bg-orange-500 text-white' : 'border bg-white text-gray-600'}`}>{label}</button>)}</div>

      {tab === 'overview' && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={BadgeIndianRupee} label="Gross Sales" value={money(grossSales)} note="Cancelled excluded" />
          <Metric icon={Banknote} label="Prepaid Received" value={money(prepaidReceived)} note={`${prepaidOrders.length} prepaid orders`} />
          <Metric icon={Truck} label="COD Expected" value={money(codExpected)} note={`${codOrders.length} COD orders`} />
          <Metric icon={Landmark} label="COD Bank Credit" value={money(codCredited)} note="Courier settlement credit" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Summary title="GST Summary" rows={[["Output GST", money(outputGst)], ["Input GST", money(inputGst)], ["Estimated payable", money(Math.max(0, outputGst-inputGst))]]} />
          <Summary title="Payments to Date" rows={[["Prepaid received", money(prepaidReceived)], ["COD credited", money(codCredited)], ["Total bank receipts", money(prepaidReceived+codCredited)]]} />
          <Summary title="Outstanding" rows={[["COD awaiting credit", money(Math.max(0, codExpected-codCredited))], ["Supplier payable", money(supplierInvoices.reduce((s,r)=>s+Math.max(0,Number(r.total_amount)-Number(r.amount_paid)),0))], ["Credit notes", money(creditNotes.reduce((s,r)=>s+Number(r.total_amount),0))]]} />
        </div>
      </>}

      {tab === 'gst' && <Register title="GST Report" icon={BookOpen} headers={['Particular', 'Taxable / Amount', 'GST']} rows={[
        ['Customer sales (inclusive)', money(grossSales), money(outputGst)],
        ['Supplier purchases', money(supplierInvoices.reduce((s,r)=>s+Number(r.taxable_amount||0),0)), money(inputGst)],
        ['Credit notes', money(creditNotes.reduce((s,r)=>s+Number(r.total_amount),0)), 'Adjustment'],
        ['Estimated GST payable', '', money(Math.max(0, outputGst-inputGst))],
      ]} />}
      {tab === 'prepaid' && <Register title="Prepaid Register" icon={Banknote} headers={['Order', 'Customer', 'Date', 'Amount', 'Status']} rows={prepaidOrders.map(o=>[o.order_number||o.id.slice(0,8), o.customer_name||'Customer', new Date(o.created_at).toLocaleDateString('en-IN'), money(Number(o.grand_total||o.total_amount)), o.payment_status||'PENDING'])} />}
      {tab === 'cod' && <EntrySection form={<AccountingEntryForm type="cod" onSaved={load}/>}><Register title="COD Courier Settlements" icon={Truck} headers={['Reference', 'Partner', 'Date', 'COD collected', 'Deductions', 'Bank credit', 'Status']} rows={settlements.map(r=>{const c=calculateCodSettlement({codCollected:Number(r.cod_collected),courierCharge:Number(r.courier_charge),codCharge:Number(r.cod_charge),rtoCharge:Number(r.rto_charge),otherDeduction:Number(r.other_deduction)});return[r.settlement_reference,r.partner_name,new Date(r.settlement_date).toLocaleDateString('en-IN'),money(r.cod_collected),money(c.deductions),money(r.net_bank_credit),r.status]})} empty="No courier settlement imported yet." /></EntrySection>}
      {tab === 'supplier' && <EntrySection form={<AccountingEntryForm type="supplier" onSaved={load}/>}><Register title="Supplier Tax Invoices" icon={ReceiptText} headers={['Supplier', 'Invoice', 'Date', 'Total', 'Paid', 'Outstanding']} rows={supplierInvoices.map(r=>[r.supplier_name,r.invoice_number,new Date(r.invoice_date).toLocaleDateString('en-IN'),money(r.total_amount),money(r.amount_paid),money(Number(r.total_amount)-Number(r.amount_paid))])} empty="No supplier invoice entered yet." /></EntrySection>}
      {tab === 'credit' && <EntrySection form={<AccountingEntryForm type="credit" onSaved={load}/>}><Register title="Return Credit Notes" icon={FileMinus2} headers={['Credit note', 'Date', 'Reason', 'Amount']} rows={creditNotes.map(r=>[r.credit_note_number,new Date(r.issue_date).toLocaleDateString('en-IN'),r.reason,money(r.total_amount)])} empty="No credit note issued yet." /></EntrySection>}
      {tab === 'outstanding' && <div className="grid gap-4 lg:grid-cols-2"><Summary title="Receivable" rows={[["COD awaiting courier credit",money(Math.max(0,codExpected-codCredited))]]}/><Summary title="Payable" rows={[["Outstanding supplier invoices",money(supplierInvoices.reduce((s,r)=>s+Math.max(0,Number(r.total_amount)-Number(r.amount_paid)),0))]]}/></div>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof FileText; label: string; value: string; note: string }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase text-gray-500">{label}</span><Icon size={19} className="text-orange-500" /></div><p className="mt-3 text-2xl font-black text-indigo-950">{value}</p><p className="mt-1 text-[10px] font-semibold text-gray-500">{note}</p></div> }
function Summary({ title, rows }: { title: string; rows: string[][] }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 text-sm font-black text-indigo-950">{title}</h2><div className="space-y-2">{rows.map(([a,b])=><div key={a} className="flex justify-between gap-4 border-b pb-2 text-xs last:border-0"><span className="text-gray-500">{a}</span><strong className="text-right text-gray-900">{b}</strong></div>)}</div></div> }
function EntrySection({ form, children }: { form: React.ReactNode; children: React.ReactNode }) { return <div className="space-y-3"><div className="flex justify-end">{form}</div>{children}</div> }
function Register({ title, icon: Icon, headers, rows, empty='No records found.' }: { title: string; icon: typeof FileText; headers: string[]; rows: Array<Array<string>>; empty?: string }) { return <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex items-center gap-2 border-b bg-gray-50 p-4"><Icon size={17} className="text-orange-500"/><h2 className="text-sm font-black text-indigo-950">{title}</h2></div>{rows.length===0?<p className="p-12 text-center text-xs text-gray-500">{empty}</p>:<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b bg-gray-50 text-[10px] uppercase text-gray-500">{headers.map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row,i)=><tr key={i} className="hover:bg-gray-50">{row.map((cell,j)=><td key={j} className={`p-3 ${j===0?'font-bold text-indigo-950':'text-gray-700'}`}>{cell}</td>)}</tr>)}</tbody></table></div>}</div> }
