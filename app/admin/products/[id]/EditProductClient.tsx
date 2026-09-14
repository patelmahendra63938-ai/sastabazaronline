'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Plus, Save, Trash2, Upload, Video, X } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { normalizeProductPackage, ProductPackageValidationError } from '@/lib/catalog/product-package';
import { compressProductVideo } from '@/lib/catalog/video-compression';
import { buildInventoryVariantLabel, normalizeColours, parseInventoryVariant } from '@/lib/catalog/inventory-variant';

type ColourMode = 'none' | 'customer' | 'assorted';

type ProductForm = {
  title: string;
  description: string;
  brand: string;
  price: string;
  mrp: string;
  category: string;
  hsn_code: string;
  gst_rate: string;
  net_weight_grams: string;
  package_length_cm: string;
  package_width_cm: string;
  package_height_cm: string;
  is_active: boolean;
  images: string[];
  video: string;
  colour_selection_mode: ColourMode;
  available_colours: string[];
};

type VariantForm = {
  id?: string;
  original_size: string;
  size: string;
  colour: string;
  sku: string;
  weight_kg: string;
  available_quantity: string;
  original_available_quantity: number;
  is_new?: boolean;
};

const EMPTY: ProductForm = {
  title: '', description: '', brand: '', price: '', mrp: '', category: '', hsn_code: '', gst_rate: '5',
  net_weight_grams: '', package_length_cm: '', package_width_cm: '', package_height_cm: '',
  is_active: false, images: [], video: '', colour_selection_mode: 'none', available_colours: [],
};

const fieldClass = 'w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-xs text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600';
const labelClass = 'mb-1 block text-[10px] font-black uppercase tracking-wide text-gray-600';

const fileName = (prefix: string, file: File) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.name.split('.').pop()?.toLowerCase() || (prefix === 'vid' ? 'mp4' : 'jpg')}`;

export default function EditProductClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [newColour, setNewColour] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [p, i] = await Promise.all([
        supabase.from('products').select('*').eq('id', id).single(),
        supabase.from('inventory').select('id,size,sku,weight_kg,available_quantity,reserved_quantity,sold_quantity').eq('product_id', id).order('size'),
      ]);
      if (!active) return;
      if (p.error || !p.data) {
        setError(p.error?.message || 'Product could not be loaded.');
        setLoading(false);
        return;
      }

      const x: any = p.data;
      const colours = normalizeColours(x.available_colours);
      const mode: ColourMode = ['customer', 'assorted'].includes(x.colour_selection_mode) ? x.colour_selection_mode : 'none';
      setForm({
        title: x.title || '', description: x.description || '', brand: x.brand || '',
        price: String(x.price ?? ''), mrp: String(x.mrp ?? ''), category: x.category || '',
        hsn_code: x.hsn_code || '', gst_rate: String(x.gst_rate ?? 5),
        net_weight_grams: x.net_weight_grams == null ? '' : String(x.net_weight_grams),
        package_length_cm: x.package_length_cm == null ? '' : String(x.package_length_cm),
        package_width_cm: x.package_width_cm == null ? '' : String(x.package_width_cm),
        package_height_cm: x.package_height_cm == null ? '' : String(x.package_height_cm),
        is_active: Boolean(x.is_active),
        images: Array.isArray(x.images) ? x.images.filter(Boolean) : [],
        video: typeof x.video === 'string' ? x.video : typeof x.video_url === 'string' ? x.video_url : '',
        colour_selection_mode: mode,
        available_colours: colours,
      });

      setVariants((i.data || []).map((row: any) => {
        const parsed = parseInventoryVariant(row.size, colours);
        return {
          id: row.id,
          original_size: row.size || 'Standard',
          size: parsed.size,
          colour: parsed.colour,
          sku: row.sku || '',
          weight_kg: row.weight_kg == null ? '' : String(row.weight_kg),
          available_quantity: String(row.available_quantity ?? 0),
          original_available_quantity: Number(row.available_quantity ?? 0),
        };
      }));
      if (i.error) setError(`Product loaded, but inventory variants could not be loaded: ${i.error.message}`);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  const setField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(''); setSuccess('');
  };

  const setVariant = (index: number, key: keyof VariantForm, value: string) => {
    setVariants((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
    setError(''); setSuccess('');
  };

  const addColour = () => {
    const value = newColour.trim();
    if (!value) return;
    setForm((current) => ({ ...current, available_colours: normalizeColours([...current.available_colours, value]) }));
    setNewColour('');
  };

  const addVariant = () => {
    setVariants((current) => [...current, {
      original_size: '', size: 'Standard', colour: '', sku: '',
      weight_kg: form.net_weight_grams ? String(Number(form.net_weight_grams) / 1000) : '',
      available_quantity: '0', original_available_quantity: 0, is_new: true,
    }]);
  };

  async function uploadImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (form.images.length + files.length > 5) {
      setError('Maximum 5 product images are allowed.');
      return;
    }
    setUploadingImages(true); setError('');
    try {
      const urls: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
        const name = fileName('prod', file);
        const { error: uploadError } = await supabase.storage.from('product-images').upload(name, file, { contentType: file.type || undefined, upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('product-images').getPublicUrl(name);
        if (!data?.publicUrl) throw new Error('Image URL could not be created.');
        urls.push(data.publicUrl);
      }
      setForm((current) => ({ ...current, images: [...current.images, ...urls] }));
      setSuccess('Images uploaded. Save Product to attach the changes.');
    } catch (err: any) {
      setError(`Image upload failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setUploadingImages(false);
      if (imageInput.current) imageInput.current.value = '';
    }
  }

  async function uploadVideo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { setError('Please select a valid video file.'); return; }
    setUploadingVideo(true); setError(''); setSuccess('');
    try {
      const result = await compressProductVideo(file, () => undefined);
      const ext = result.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const name = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(name, result.blob, { contentType: result.mimeType || 'video/webm', upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('product-images').getPublicUrl(name);
      if (!data?.publicUrl) throw new Error('Video URL could not be created.');
      setForm((current) => ({ ...current, video: data.publicUrl }));
      setSuccess('Video uploaded. Save Product to attach the change.');
    } catch (err: any) {
      setError(`Video upload failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setUploadingVideo(false);
      if (videoInput.current) videoInput.current.value = '';
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(''); setSuccess('');

    const weight = Number(form.net_weight_grams);
    const price = Number(form.price);
    const mrp = Number(form.mrp || form.price);
    if (!form.title.trim() || !Number.isFinite(price) || price <= 0) return setError('Product title and valid selling price are required.');
    if (!Number.isFinite(mrp) || mrp < price) return setError('MRP must be greater than or equal to selling price.');
    if (!Number.isInteger(weight) || weight < 1) return setError('Exact Physical Weight must be a positive whole number of grams.');
    if (!form.images.length) return setError('At least one product image is required.');

    let pkg: any;
    try { pkg = normalizeProductPackage(form); }
    catch (err) { return setError(err instanceof ProductPackageValidationError ? err.message : 'Valid package dimensions are required.'); }

    const variantKeys = new Set<string>();
    const variantColours: string[] = [];
    for (const row of variants) {
      const stock = Number(row.available_quantity);
      if (!row.size.trim()) return setError('Every inventory variant needs a size or option label.');
      if (!Number.isInteger(stock) || stock < 0) return setError('Variant stock must be a non-negative whole number.');
      if (row.weight_kg !== '' && (!Number.isFinite(Number(row.weight_kg)) || Number(row.weight_kg) <= 0)) return setError('Variant weight must be greater than zero.');
      if (row.colour) variantColours.push(row.colour);
      const label = buildInventoryVariantLabel(row.size, row.colour).toLowerCase();
      if (variantKeys.has(label)) return setError(`Duplicate inventory variant: ${buildInventoryVariantLabel(row.size, row.colour)}.`);
      variantKeys.add(label);
    }

    const colours = normalizeColours([...form.available_colours, ...variantColours]);
    if (form.colour_selection_mode !== 'none' && colours.length === 0) return setError('Add at least one available colour.');

    setSaving(true);
    try {
      const { error: productError } = await supabase.from('products').update({
        title: form.title.trim(), description: form.description.trim() || null, brand: form.brand.trim() || null,
        price, mrp, category: form.category.trim(), hsn_code: form.hsn_code.trim() || null,
        gst_rate: Number(form.gst_rate), net_weight_grams: weight,
        package_length_cm: pkg.length, package_width_cm: pkg.width, package_height_cm: pkg.height,
        images: form.images, video: form.video || null, is_active: form.is_active,
        colour_selection_mode: form.colour_selection_mode, available_colours: colours,
      }).eq('id', id);
      if (productError) throw new Error(`Product was not saved: ${productError.message}`);

      for (const row of variants) {
        const label = buildInventoryVariantLabel(row.size, row.colour);
        const desiredStock = Number(row.available_quantity);
        const weightKg = row.weight_kg === '' ? Math.max(0.001, weight / 1000) : Number(row.weight_kg);

        if (row.is_new || !row.id) {
          const { data: inserted, error: insertError } = await supabase.from('inventory').insert({
            product_id: id, size: label, sku: row.sku.trim() || null, weight_kg: weightKg,
            available_quantity: 0, reserved_quantity: 0, sold_quantity: 0, reorder_level: 5,
          }).select('id').single();
          if (insertError || !inserted) throw new Error(`Could not create variant ${label}: ${insertError?.message || 'Unknown error'}`);
          row.id = inserted.id;
          row.original_available_quantity = 0;
        } else {
          const { error: metadataError } = await supabase.from('inventory').update({
            size: label, sku: row.sku.trim() || null, weight_kg: weightKg,
          }).eq('id', row.id);
          if (metadataError) throw new Error(`Could not update variant ${label}: ${metadataError.message}`);
        }

        const delta = desiredStock - Number(row.original_available_quantity || 0);
        if (delta !== 0) {
          const { error: stockError } = await supabase.rpc('adjust_inventory_stock', {
            p_product_id: id,
            p_size: label,
            p_quantity_delta: delta,
            p_movement_type: 'MANUAL_ADJUSTMENT',
            p_notes: `Edit Product stock adjustment for ${label}`,
            p_created_by: 'ADMIN',
          });
          if (stockError) throw new Error(`Stock update failed for ${label}: ${stockError.message}`);
        }
      }

      setForm((current) => ({ ...current, available_colours: colours }));
      setVariants((current) => current.map((row) => ({ ...row, original_size: buildInventoryVariantLabel(row.size, row.colour), original_available_quantity: Number(row.available_quantity), is_new: false })));
      setSuccess('Product and variant metadata saved. Stock changes were recorded in the inventory ledger.');
    } catch (err: any) {
      setError(err?.message || 'Product could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-gray-50"><Header /><div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={18} className="animate-spin" /> Loading product...</div><Footer /></main>;

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/admin/products" className="mb-5 inline-flex items-center gap-2 text-xs font-black text-indigo-950"><ArrowLeft size={15} /> Back to Product Catalog</Link>
        <div className="mb-6"><h1 className="text-2xl font-black text-indigo-950">Edit Product & Inventory Variants</h1><p className="mt-1 text-xs text-gray-500">Product data, colours, SKU/size options and ledger-safe stock editing.</p></div>

        <form onSubmit={save} className="space-y-6">
          {error && <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700"><AlertCircle size={16} /> {error}</div>}
          {success && <div className="flex gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-xs font-bold text-green-800"><CheckCircle2 size={16} /> {success}</div>}

          <section className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase text-gray-900">Product Details</h2>
            <div><label className={labelClass}>Title *</label><input className={fieldClass} value={form.title} onChange={(e) => setField('title', e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className={labelClass}>Brand</label><input className={fieldClass} value={form.brand} onChange={(e) => setField('brand', e.target.value)} /></div>
              <div><label className={labelClass}>Category</label><input className={fieldClass} value={form.category} onChange={(e) => setField('category', e.target.value)} /></div>
              <div><label className={labelClass}>HSN Code</label><input className={fieldClass} value={form.hsn_code} onChange={(e) => setField('hsn_code', e.target.value)} /></div>
            </div>
            <div><label className={labelClass}>Description</label><textarea rows={5} className={fieldClass} value={form.description} onChange={(e) => setField('description', e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className={labelClass}>Selling Price (₹) *</label><input type="number" className={fieldClass} value={form.price} onChange={(e) => setField('price', e.target.value)} /></div>
              <div><label className={labelClass}>MRP (₹)</label><input type="number" className={fieldClass} value={form.mrp} onChange={(e) => setField('mrp', e.target.value)} /></div>
              <div><label className={labelClass}>GST %</label><select className={fieldClass} value={form.gst_rate} onChange={(e) => setField('gst_rate', e.target.value)}><option>0</option><option>5</option><option>12</option><option>18</option><option>28</option></select></div>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase text-gray-900">Shipping Data</h2>
            <p className="text-[11px] text-gray-500">Keep using your current net/shipping weight method. This editor stores the exact value you enter.</p>
            <div className="grid gap-4 sm:grid-cols-4">
              <div><label className={labelClass}>Net Weight (g) *</label><input type="number" min="1" className={fieldClass} value={form.net_weight_grams} onChange={(e) => setField('net_weight_grams', e.target.value)} /></div>
              <div><label className={labelClass}>Length (cm) *</label><input type="number" step="0.01" className={fieldClass} value={form.package_length_cm} onChange={(e) => setField('package_length_cm', e.target.value)} /></div>
              <div><label className={labelClass}>Width (cm) *</label><input type="number" step="0.01" className={fieldClass} value={form.package_width_cm} onChange={(e) => setField('package_width_cm', e.target.value)} /></div>
              <div><label className={labelClass}>Height (cm) *</label><input type="number" step="0.01" className={fieldClass} value={form.package_height_cm} onChange={(e) => setField('package_height_cm', e.target.value)} /></div>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
            <div><h2 className="text-sm font-black uppercase text-gray-900">Colours</h2><p className="mt-1 text-[11px] text-gray-500">Colours are treated as variant attributes. For existing stock, choose a colour on the exact inventory row below.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={labelClass}>Colour Selection Mode</label><select className={fieldClass} value={form.colour_selection_mode} onChange={(e) => setField('colour_selection_mode', e.target.value as ColourMode)}><option value="none">Not Applicable</option><option value="customer">Customer Selects Colour</option><option value="assorted">Assorted / Mixed Colours</option></select></div>
              <div className="flex items-end gap-2"><div className="flex-1"><label className={labelClass}>Add Available Colour</label><input className={fieldClass} value={newColour} onChange={(e) => setNewColour(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColour(); } }} placeholder="Pink, Blue, Beige..." /></div><button type="button" onClick={addColour} className="rounded-xl bg-indigo-950 px-4 py-2.5 text-xs font-black text-white">Add</button></div>
            </div>
            <div className="flex flex-wrap gap-2">{form.available_colours.map((colour) => <span key={colour} className="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-3 py-1.5 text-xs font-bold">{colour}<button type="button" onClick={() => setField('available_colours', form.available_colours.filter((item) => item !== colour))}><X size={12} /></button></span>)}</div>
          </section>

          <section className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-black uppercase text-gray-900">Inventory Variants</h2><p className="mt-1 text-[11px] text-gray-500">Each row is one sellable variant. Stock changes use the atomic inventory ledger RPC.</p></div><button type="button" onClick={addVariant} className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-700"><Plus size={13} /> Add Variant</button></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead><tr className="border-b bg-gray-50 text-[10px] font-black uppercase text-gray-500"><th className="p-3">Size / Option</th><th className="p-3">Colour</th><th className="p-3">SKU</th><th className="p-3">Weight kg</th><th className="p-3">Available Stock</th><th className="p-3">Ledger</th></tr></thead>
                <tbody className="divide-y">{variants.map((row, index) => (
                  <tr key={row.id || `new-${index}`}>
                    <td className="p-2"><input className={fieldClass} value={row.size} onChange={(e) => setVariant(index, 'size', e.target.value)} placeholder="M / Standard / Set of 3" /></td>
                    <td className="p-2"><select className={fieldClass} value={row.colour} onChange={(e) => setVariant(index, 'colour', e.target.value)}><option value="">No colour</option>{form.available_colours.map((colour) => <option key={colour} value={colour}>{colour}</option>)}</select></td>
                    <td className="p-2"><input className={fieldClass} value={row.sku} onChange={(e) => setVariant(index, 'sku', e.target.value)} /></td>
                    <td className="p-2"><input type="number" step="0.001" min="0.001" className={fieldClass} value={row.weight_kg} onChange={(e) => setVariant(index, 'weight_kg', e.target.value)} /></td>
                    <td className="p-2"><input type="number" min="0" step="1" className={fieldClass} value={row.available_quantity} onChange={(e) => setVariant(index, 'available_quantity', e.target.value)} /></td>
                    <td className="p-2"><span className="rounded bg-green-50 px-2 py-1 text-[10px] font-black text-green-700">{row.is_new ? 'NEW ROW' : `CURRENT ${row.original_available_quantity}`}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase text-gray-900">Media & Visibility</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{form.images.map((url, index) => <div key={url} className="relative aspect-square overflow-hidden rounded-xl border"><img src={url} alt="" className="h-full w-full object-cover" /><button type="button" onClick={() => setField('images', form.images.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded bg-red-600 p-1 text-white"><Trash2 size={12} /></button></div>)}</div>
            <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={uploadImages} />
            <button type="button" onClick={() => imageInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold"><Upload size={14} /> {uploadingImages ? 'Uploading...' : 'Add Images'}</button>
            <div className="border-t pt-4"><input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={uploadVideo} />{form.video ? <div className="space-y-2"><video src={form.video} controls className="max-w-sm rounded-xl bg-black" /><button type="button" onClick={() => setField('video', '')} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">Remove Video</button></div> : <button type="button" onClick={() => videoInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold"><Video size={14} /> {uploadingVideo ? 'Uploading...' : 'Add Video'}</button>}</div>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} /> Product is active / visible</label>
          </section>

          <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-4 text-sm font-black text-white disabled:opacity-50"><Save size={17} /> {saving ? 'Saving...' : 'Save Product & Inventory'}</button>
        </form>
      </div>
      <Footer />
    </main>
  );
}
