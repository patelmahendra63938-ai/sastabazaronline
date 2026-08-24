'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type AccountEntryResult = { success: boolean; error?: string };

function textValue(formData: FormData, key: string, required = true) {
  const value = String(formData.get(key) || '').trim();
  if (required && !value) throw new Error(`${key.replaceAll('_', ' ')} is required.`);
  return value || null;
}

function moneyValue(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  if (!Number.isFinite(value) || value < 0) throw new Error(`${key.replaceAll('_', ' ')} must be zero or more.`);
  return Math.round(value * 100) / 100;
}

function dateValue(formData: FormData, key: string) {
  const value = String(formData.get(key) || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${key.replaceAll('_', ' ')} is invalid.`);
  return value;
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  if (message.includes('duplicate key')) return 'This invoice or settlement reference already exists.';
  return message || 'Unable to save the accounting entry.';
}

export async function addSupplierInvoice(formData: FormData): Promise<AccountEntryResult> {
  try {
    const { user } = await requireAdminUser();
    const supabase = await createServerSupabaseClient();
    const taxable = moneyValue(formData, 'taxable_amount');
    const cgst = moneyValue(formData, 'cgst');
    const sgst = moneyValue(formData, 'sgst');
    const igst = moneyValue(formData, 'igst');
    const total = Math.round((taxable + cgst + sgst + igst) * 100) / 100;
    const paid = moneyValue(formData, 'amount_paid');
    if (paid > total) throw new Error('Paid amount cannot exceed invoice total.');

    const { error } = await supabase.from('supplier_tax_invoices').insert({
      supplier_name: textValue(formData, 'supplier_name'),
      supplier_gstin: textValue(formData, 'supplier_gstin', false),
      invoice_number: textValue(formData, 'invoice_number'),
      invoice_date: dateValue(formData, 'invoice_date'),
      taxable_amount: taxable, cgst, sgst, igst, total_amount: total, amount_paid: paid,
      notes: textValue(formData, 'notes', false), created_by: user.id,
    });
    if (error) throw error;
    revalidatePath('/admin/accounts');
    return { success: true };
  } catch (error) { return { success: false, error: safeError(error) }; }
}

export async function addCodSettlement(formData: FormData): Promise<AccountEntryResult> {
  try {
    const { user } = await requireAdminUser();
    const supabase = await createServerSupabaseClient();
    const status = String(formData.get('status')) === 'CREDITED' ? 'CREDITED' : 'PENDING';
    const utr = textValue(formData, 'bank_utr', false);
    if (status === 'CREDITED' && !utr) throw new Error('Bank UTR is required when settlement is credited.');
    const orderCount = Number(formData.get('order_count'));
    if (!Number.isInteger(orderCount) || orderCount < 0) throw new Error('Order count must be a valid whole number.');

    const { error } = await supabase.from('cod_settlements').insert({
      partner_name: textValue(formData, 'partner_name'),
      settlement_reference: textValue(formData, 'settlement_reference'),
      settlement_date: dateValue(formData, 'settlement_date'), order_count: orderCount,
      cod_collected: moneyValue(formData, 'cod_collected'),
      courier_charge: moneyValue(formData, 'courier_charge'),
      cod_charge: moneyValue(formData, 'cod_charge'),
      rto_charge: moneyValue(formData, 'rto_charge'),
      other_deduction: moneyValue(formData, 'other_deduction'),
      bank_utr: utr, status, created_by: user.id,
    });
    if (error) throw error;
    revalidatePath('/admin/accounts');
    return { success: true };
  } catch (error) { return { success: false, error: safeError(error) }; }
}

export async function addCreditNote(formData: FormData): Promise<AccountEntryResult> {
  try {
    const { user } = await requireAdminUser();
    const supabase = await createServerSupabaseClient();
    const orderNumber = textValue(formData, 'order_number', false);
    let orderId: string | null = null;
    if (orderNumber) {
      const { data, error } = await supabase.from('orders').select('id').eq('order_number', orderNumber).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Order number was not found.');
      orderId = data.id;
    }
    const taxable = moneyValue(formData, 'taxable_amount');
    const cgst = moneyValue(formData, 'cgst');
    const sgst = moneyValue(formData, 'sgst');
    const igst = moneyValue(formData, 'igst');
    const total = Math.round((taxable + cgst + sgst + igst) * 100) / 100;

    const { error } = await supabase.from('credit_notes').insert({
      credit_note_number: textValue(formData, 'credit_note_number'), order_id: orderId,
      issue_date: dateValue(formData, 'issue_date'), reason: textValue(formData, 'reason'),
      taxable_amount: taxable, cgst, sgst, igst, total_amount: total,
      refund_reference: textValue(formData, 'refund_reference', false), created_by: user.id,
    });
    if (error) throw error;
    revalidatePath('/admin/accounts');
    return { success: true };
  } catch (error) { return { success: false, error: safeError(error) }; }
}
