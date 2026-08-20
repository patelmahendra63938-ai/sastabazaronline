'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Save } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';

interface ProductForm {
  title: string; description: string; brand: string; price: string; mrp: string;
  category: string; hsn_code: string; gst_rate: string; net_weight_grams: string;
  is_active: boolean;
}

interface VariantForm {
  id: string; size: string; sku: string; weight_kg: string; available_quantity: string;
}

const EMPTY_PRODUCT: ProductForm = { title: '', description: '', brand: '', price: '', mrp: '', category: '', hsn_code: '', gst_rate: '5', net_weight_grams: '', is_active: false };

export default function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [form, setForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const [productResult, inventoryResult] = await Promise.all([
        supabase.from('products').select('title, description, brand, price, mrp, category, hsn_code, gst_rate, net_weight_grams, is_active').eq('id', id).single(),
        supabase.from('inventory').select('id, size, sku, weight_kg, available_quantity').eq('product_id', id).order('size'),
      ]);
      if (!active) return;
      if (productResult.error || !productResult.data) {
        setError(productResult.error?.message || 'Product could not be loaded.');
      } else {
        const product = productResult.data;
        setForm({
          title: product.title || '', description: product.description || '', brand: product.brand || '',
          price: String(product.price ?? ''), mrp: String(product.mrp ?? ''), category: product.category || '',
          hsn_code: product.hsn_code || '', gst_rate: String(product.gst_rate ?? 5),
          net_weight_grams: product.net_weight_grams == null ? '' : String(product.net_weight_grams),
          is_active: Boolean(product.is_active),
        });
        setVariants((inventoryResult.data || []).map((variant) => ({ id: variant.id, size: variant.size || '', sku: variant.sku || '', weight_kg: String(variant.weight_kg ?? ''), available_quantity: String(variant.available_quantity ?? 0) })));
        if (inventoryResult.error) setError(`Product loaded, but variants could not be loaded: ${inventoryResult.error.message}`);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [id]);

  function updateField<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(''); setSuccess('');
  }

  function updateVariant(index: number, key: keyof VariantForm, value: string) {
    setVariants((current) => current.map((variant, variantIndex) => variantIndex === index ? { ...variant, [key]: value } : variant));
    setError(''); setSuccess('');
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault(); setError(''); setSuccess('');
    const exactWeight = Number(form.net_weight_grams);
    if (!form.net_weight_grams.trim() || !Number.isInteger(exactWeight) || exactWeight < 1) {
      setError('Exact Physical Weight is required and must be a positive whole number of grams.');
      return;
    }
    const price = Number(form.price); const mrp = Number(form.mrp);
    if (!form.title.trim() || !Number.isFinite(price) || price <= 0) { setError('Product title and a valid positive selling price are required.'); return; }
    if (form.mrp && (!Number.isFinite(mrp) || mrp < price)) { setError('MRP must be a valid amount greater than or equal to the selling price.'); return; }
    for (const variant of variants) {
      const stock = Number(variant.available_quantity);
      if (!variant.size.trim() || !Number.isInteger(stock) || stock < 0) { setError('Every variant needs a size and a non-negative whole-number stock quantity.'); return; }
    }

    setSaving(true);
    const { error: productError } = await supabase.from('products').update({
      title: form.title.trim(), description: form.description.trim() || null, brand: form.brand.trim() || null,
      price, mrp: form.mrp ? mrp : price, category: form.category.trim(), hsn_code: form.hsn_code.trim() || null,
      gst_rate: Number(form.gst_rate), net_weight_grams: exactWeight, is_active: form.is_active,
    }).eq('id', id);
    if (productError) { setError(`Product was not saved: ${productError.message}`); setSaving(false); return; }

    if (variants.length) {
      const { error: inventoryError } = await supabase.from('inventory').upsert(variants.map((variant) => ({
        id: variant.id, product_id: id, size: variant.size.trim(), sku: variant.sku.trim() || null,
        weight_kg: variant.weight_kg === '' ? null : Number(variant.weight_kg), available_quantity: Number(variant.available_quantity),
      })));
      if (inventoryError) { setError(`Product details were saved, but variant stock failed to save: ${inventoryError.message}`); setSaving(false); return; }
    }
    setSuccess('Product details and exact physical weight saved successfully.');
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col"><Header />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/admin/products" className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-indigo-950"><ArrowLeft size={15} /> Back to Product Catalog</Link>
        <div className="mb-6"><h1 className="text-2xl font-black text-indigo-950">Edit Product</h1><p className="mt-1 text-xs text-gray-500">Manage catalog details, exact shipping weight, and existing variant stock.</p></div>
        {loading ? <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white p-16 text-xs text-gray-500"><Loader2 className="animate-spin" size={16} /> Loading product…</div> :
        <form onSubmit={saveProduct} className="space-y-6">
          {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700"><AlertCircle size={16} className="shrink-0" />{error}</div>}
          {success && <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-xs font-bold text-green-700"><CheckCircle2 size={16} className="shrink-0" />{success}</div>}
          <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:grid-cols-2">
            <h2 className="sm:col-span-2 text-sm font-black text-indigo-950">Product Details</h2>
            <label className="sm:col-span-2 text-xs font-bold text-gray-700">Product Title *<input required value={form.title} onChange={(e) => updateField('title', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-medium" /></label>
            <label className="text-xs font-bold text-gray-700">Brand<input value={form.brand} onChange={(e) => updateField('brand', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-medium" /></label>
            <label className="text-xs font-bold text-gray-700">Category<input value={form.category} onChange={(e) => updateField('category', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-medium" /></label>
            <label className="text-xs font-bold text-gray-700">Selling Price *<input type="number" min="0.01" step="0.01" required value={form.price} onChange={(e) => updateField('price', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
            <label className="text-xs font-bold text-gray-700">MRP<input type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => updateField('mrp', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
            <label className="sm:col-span-2 text-xs font-bold text-gray-700">Description<textarea rows={4} value={form.description} onChange={(e) => updateField('description', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-medium" /></label>
          </section>

          <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-indigo-950">Shipping / Physical Details</h2>
            <p className="mt-1 text-xs text-gray-500">This product-level value is the authoritative shipping weight. Variant inventory weight is not used for shipping pricing.</p>
            <label className="mt-4 block max-w-md text-xs font-bold text-gray-700">Exact Physical Weight (grams) *
              <input type="number" required min="1" step="1" inputMode="numeric" value={form.net_weight_grams} onChange={(e) => updateField('net_weight_grams', e.target.value)} placeholder="e.g. 720" className="mt-1 w-full rounded-xl border border-orange-300 px-3 py-3 text-sm font-black focus:ring-2 focus:ring-orange-500" />
              <span className="mt-1.5 block font-normal text-gray-500">Enter the exact product weight in grams, e.g. 720 for 720 g.</span>
            </label>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-indigo-950">Tax and Listing</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-xs font-bold text-gray-700">HSN Code<input value={form.hsn_code} onChange={(e) => updateField('hsn_code', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
              <label className="text-xs font-bold text-gray-700">GST Rate (%)<input type="number" min="0" step="0.01" value={form.gst_rate} onChange={(e) => updateField('gst_rate', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
              <label className="flex items-center gap-2 pt-6 text-xs font-bold text-gray-700"><input type="checkbox" checked={form.is_active} onChange={(e) => updateField('is_active', e.target.checked)} className="size-5 accent-indigo-950" /> Active / purchasable</label>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-indigo-950">Existing Variants and Stock</h2>
            <p className="mt-1 text-xs text-gray-500">Stock and legacy inventory weight remain editable. Inventory weight does not determine shipping charges.</p>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="border-b bg-gray-50 text-[10px] uppercase text-gray-500"><th className="p-3">Size</th><th className="p-3">SKU</th><th className="p-3">Legacy Weight (kg)</th><th className="p-3">Available Stock</th></tr></thead><tbody>
              {variants.map((variant, index) => <tr key={variant.id} className="border-b last:border-0"><td className="p-2"><input required value={variant.size} onChange={(e) => updateVariant(index, 'size', e.target.value)} className="w-full rounded-lg border px-2.5 py-2" /></td><td className="p-2"><input value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value)} className="w-full rounded-lg border px-2.5 py-2" /></td><td className="p-2"><input type="number" step="0.001" value={variant.weight_kg} onChange={(e) => updateVariant(index, 'weight_kg', e.target.value)} className="w-full rounded-lg border px-2.5 py-2" /></td><td className="p-2"><input type="number" min="0" step="1" required value={variant.available_quantity} onChange={(e) => updateVariant(index, 'available_quantity', e.target.value)} className="w-full rounded-lg border px-2.5 py-2 font-bold" /></td></tr>)}
              {!variants.length && <tr><td colSpan={4} className="p-6 text-center text-gray-500">No inventory variants exist for this product.</td></tr>}
            </tbody></table></div>
          </section>
          <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white hover:bg-orange-600 disabled:opacity-50 sm:w-auto">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Saving…' : 'Save Product'}</button>
        </form>}
      </div><Footer />
    </main>
  );
}
