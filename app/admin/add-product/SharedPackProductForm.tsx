'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CATEGORY_ENGINE } from '@/lib/category-attributes';
import { normalizeProductPackage, ProductPackageValidationError } from '@/lib/catalog/product-package';
import { optimizeProductImageBeforeUpload } from '@/lib/catalog/image-compression';
import { SHARED_STOCK_SIZE } from '@/lib/catalog/pack-options';
import { AlertCircle, ArrowLeft, CheckCircle2, Image as ImageIcon, Loader2, Plus, Save, Trash2, UploadCloud } from 'lucide-react';

type PackRow = {
  label: string;
  pieces: number;
  price: string;
  mrp: string;
  sku: string;
};

const fieldClass = 'w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600';
const labelClass = 'mb-1 block text-xs font-bold uppercase text-gray-700';

export default function SharedPackProductForm() {
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdProductId, setCreatedProductId] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('Home & Kitchen');
  const initialConfig = CATEGORY_ENGINE['Home & Kitchen'] || CATEGORY_ENGINE['Fashion & Apparel'];
  const [selectedSubCategory, setSelectedSubCategory] = useState(initialConfig.subcategories[0]?.name || '');
  const [selectedProductType, setSelectedProductType] = useState(initialConfig.subcategories[0]?.productTypes[0] || '');

  const [form, setForm] = useState({
    title: '',
    brand: '',
    base_sku: '',
    description: '',
    hsn_code: '',
    gst_rate: '',
    net_weight_grams: '',
    package_length_cm: '',
    package_width_cm: '',
    package_height_cm: '',
    physical_stock: '0',
    status: 'Active',
  });

  const [packs, setPacks] = useState<PackRow[]>([
    { label: 'Set of 4', pieces: 4, price: '', mrp: '', sku: '' },
    { label: 'Set of 6', pieces: 6, price: '', mrp: '', sku: '' },
    { label: 'Set of 9', pieces: 9, price: '', mrp: '', sku: '' },
  ]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const currentCategoryConfig = CATEGORY_ENGINE[selectedCategory] || initialConfig;
  const lowestPrice = useMemo(() => {
    const prices = packs.map((row) => Number(row.price)).filter((value) => Number.isFinite(value) && value > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [packs]);

  const updateForm = (name: string, value: string) => setForm((current) => ({ ...current, [name]: value }));

  const applyCategory = (category: string) => {
    const config = CATEGORY_ENGINE[category];
    if (!config) return;
    setSelectedCategory(category);
    setSelectedSubCategory(config.subcategories[0]?.name || '');
    setSelectedProductType(config.subcategories[0]?.productTypes[0] || '');
    setForm((current) => ({ ...current, hsn_code: category === 'Home & Kitchen' ? '' : config.defaultHsn, gst_rate: '' }));
  };

  const applySubCategory = (subcategory: string) => {
    setSelectedSubCategory(subcategory);
    const sub = currentCategoryConfig.subcategories.find((item) => item.name === subcategory);
    setSelectedProductType(sub?.productTypes[0] || '');
  };

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    if (photoUrls.length + files.length > 5) return setErrorMsg('You can upload a maximum of 5 product photos.');

    setUploadingPhoto(true);
    setErrorMsg('');
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const optimized = await optimizeProductImageBeforeUpload(file);
        const fileName = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${optimized.extension}`;
        const { error } = await supabase.storage.from('product-images').upload(fileName, optimized.blob, {
          contentType: optimized.mimeType,
          cacheControl: '31536000',
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        if (data?.publicUrl) uploaded.push(data.publicUrl);
      }
      setPhotoUrls((current) => [...current, ...uploaded]);
    } catch (error: any) {
      setErrorMsg(`Image upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const publishProduct = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setCreatedProductId('');

    if (!form.title.trim()) return setErrorMsg('Product title is required.');
    if (!form.hsn_code.trim()) return setErrorMsg('Verified HSN code is required.');
    if (!form.gst_rate) return setErrorMsg('Select the verified GST rate.');
    if (!photoUrls.length) return setErrorMsg('Upload at least one product image.');
    if (!Number.isInteger(Number(form.physical_stock)) || Number(form.physical_stock) < 0) return setErrorMsg('Physical stock must be a whole number of pieces.');
    if (packs.length < 2) return setErrorMsg('Add at least two pack / set options.');

    const normalizedPacks = packs.map((row, index) => ({
      label: row.label.trim(),
      pieces: Math.floor(Number(row.pieces)),
      price: Number(row.price),
      mrp: row.mrp.trim() ? Number(row.mrp) : null,
      sku: row.sku.trim() || null,
      display_order: index,
    }));

    if (normalizedPacks.some((row) => !row.label || !Number.isInteger(row.pieces) || row.pieces <= 0 || !Number.isFinite(row.price) || row.price <= 0)) {
      return setErrorMsg('Every pack option needs a label, pieces count and valid selling price.');
    }
    if (new Set(normalizedPacks.map((row) => row.label.toLowerCase())).size !== normalizedPacks.length) return setErrorMsg('Pack labels must be unique.');
    if (normalizedPacks.some((row) => row.mrp !== null && (!Number.isFinite(row.mrp) || row.mrp < row.price))) return setErrorMsg('MRP cannot be lower than the selling price.');

    let productPackage;
    try {
      productPackage = normalizeProductPackage(form);
    } catch (error) {
      if (error instanceof ProductPackageValidationError) return setErrorMsg(error.message);
      return setErrorMsg('Please verify the physical weight and dimensions.');
    }

    const cheapest = [...normalizedPacks].sort((a, b) => a.price - b.price)[0];
    const descriptionLines = [
      form.description.trim(),
      `Catalog Subcategory: ${selectedSubCategory}`,
      `Product Type: ${selectedProductType}`,
      'Selling Details:',
      '• Selling Unit: Customer selects a pack / set option',
      '• Inventory Mode: Shared Physical Pieces',
      `• Pack Options: ${normalizedPacks.map((row) => `${row.label} (${row.pieces} pieces) – ₹${row.price}`).join(' | ')}`,
    ].filter(Boolean);

    setLoading(true);
    let productId = '';
    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          title: form.title.trim(),
          description: descriptionLines.join('\n\n'),
          category: selectedCategory,
          brand: form.brand.trim() || null,
          sku: form.base_sku.trim() || null,
          price: cheapest.price,
          mrp: cheapest.mrp || cheapest.price,
          stock: Number(form.physical_stock),
          hsn_code: form.hsn_code.trim(),
          gst_rate: Number(form.gst_rate),
          net_weight_grams: productPackage.weight,
          package_length_cm: productPackage.length,
          package_width_cm: productPackage.width,
          package_height_cm: productPackage.height,
          images: photoUrls,
          is_active: form.status === 'Active',
          status: form.status === 'Active' ? 'ACTIVE' : 'DRAFT',
          selling_mode: 'shared_pack',
        })
        .select('id')
        .single();

      if (productError || !product) throw productError || new Error('Failed to create product.');
      productId = product.id;

      const { error: packError } = await supabase.from('product_pack_options').insert(
        normalizedPacks.map((row) => ({
          product_id: productId,
          label: row.label,
          pieces_per_unit: row.pieces,
          price: row.price,
          mrp: row.mrp,
          sku: row.sku,
          display_order: row.display_order,
          is_active: true,
        }))
      );
      if (packError) throw packError;

      const { error: inventoryError } = await supabase.from('inventory').insert({
        product_id: productId,
        size: SHARED_STOCK_SIZE,
        sku: form.base_sku.trim() || `${form.title.slice(0, 3).toUpperCase()}-SHARED`,
        weight_kg: Math.max(0.001, Number(productPackage.weight) / 1000),
        available_quantity: Number(form.physical_stock),
        reserved_quantity: 0,
        sold_quantity: 0,
        reorder_level: 5,
      });
      if (inventoryError) throw inventoryError;

      setCreatedProductId(productId);
      setSuccessMsg('Product created as one listing with editable pack prices and one shared physical stock pool.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      if (productId) await supabase.from('products').delete().eq('id', productId);
      setErrorMsg(error.message || 'Failed to create shared-pack product.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] pb-24">
      
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin/add-product" className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"><ArrowLeft size={18} /></Link>
            <div><h1 className="text-lg font-black text-indigo-950">Add Product — Multiple Pack / Set Options</h1><p className="text-[11px] text-gray-500">One product • editable pack prices • shared physical piece stock</p></div>
          </div>
          <button type="button" onClick={publishProduct} disabled={loading || uploadingPhoto} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Product</button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {errorMsg && <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700"><AlertCircle size={17} /><span>{errorMsg}</span></div>}
        {successMsg && <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-xs font-bold text-green-800"><CheckCircle2 size={20} /><span>{successMsg}</span>{createdProductId && <Link href={`/product/${createdProductId}`} className="ml-auto rounded-lg border border-green-300 bg-white px-3 py-1.5">View Product</Link>}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="mb-4 text-sm font-black uppercase tracking-wider">1. Product & Category</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div><label className={labelClass}>Primary Category *</label><select value={selectedCategory} onChange={(e) => applyCategory(e.target.value)} className={fieldClass}>{Object.keys(CATEGORY_ENGINE).map((category) => <option key={category}>{category}</option>)}</select></div>
                <div><label className={labelClass}>Subcategory</label><select value={selectedSubCategory} onChange={(e) => applySubCategory(e.target.value)} className={fieldClass}>{currentCategoryConfig.subcategories.map((sub) => <option key={sub.name}>{sub.name}</option>)}</select></div>
                <div><label className={labelClass}>Product Type</label><select value={selectedProductType} onChange={(e) => setSelectedProductType(e.target.value)} className={fieldClass}>{currentCategoryConfig.subcategories.find((sub) => sub.name === selectedSubCategory)?.productTypes.map((type) => <option key={type}>{type}</option>)}</select></div>
              </div>
              <div className="mt-4 space-y-4">
                <div><label className={labelClass}>Product Title *</label><input value={form.title} onChange={(e) => updateForm('title', e.target.value)} className={fieldClass} /></div>
                <div className="grid gap-4 sm:grid-cols-3"><div><label className={labelClass}>Brand</label><input value={form.brand} onChange={(e) => updateForm('brand', e.target.value)} className={fieldClass} /></div><div><label className={labelClass}>Base SKU</label><input value={form.base_sku} onChange={(e) => updateForm('base_sku', e.target.value)} placeholder="e.g. N0028" className={fieldClass} /></div><div><label className={labelClass}>HSN *</label><input value={form.hsn_code} onChange={(e) => updateForm('hsn_code', e.target.value)} className={fieldClass} /></div></div>
                <div><label className={labelClass}>Description</label><textarea rows={5} value={form.description} onChange={(e) => updateForm('description', e.target.value)} className={fieldClass} /></div>
              </div>
            </section>

            <section className="rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-4"><h2 className="text-sm font-black uppercase tracking-wider">2. Multiple Pack / Set Prices</h2><p className="mt-1 text-[11px] text-gray-500">Each row is a customer-selectable option. Price is independent for every pack.</p></div>
              <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-xs"><thead><tr className="border-b bg-indigo-50 text-[10px] uppercase text-gray-600"><th className="p-2">Label</th><th className="p-2">Pieces</th><th className="p-2">Selling Price</th><th className="p-2">MRP</th><th className="p-2">Variant SKU</th><th></th></tr></thead><tbody>{packs.map((row, index) => <tr key={index} className="border-b"><td className="p-2"><input value={row.label} onChange={(e) => setPacks((current) => current.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} className={fieldClass} /></td><td className="p-2"><input type="number" min="1" value={row.pieces} onChange={(e) => setPacks((current) => current.map((item, i) => i === index ? { ...item, pieces: Math.max(1, parseInt(e.target.value) || 1) } : item))} className={fieldClass} /></td><td className="p-2"><input type="number" min="0.01" step="0.01" value={row.price} onChange={(e) => setPacks((current) => current.map((item, i) => i === index ? { ...item, price: e.target.value } : item))} className={fieldClass} /></td><td className="p-2"><input type="number" min="0" step="0.01" value={row.mrp} onChange={(e) => setPacks((current) => current.map((item, i) => i === index ? { ...item, mrp: e.target.value } : item))} className={fieldClass} /></td><td className="p-2"><input value={row.sku} onChange={(e) => setPacks((current) => current.map((item, i) => i === index ? { ...item, sku: e.target.value } : item))} placeholder={`${form.base_sku || 'SKU'}-${row.pieces}`} className={fieldClass} /></td><td className="p-2"><button type="button" disabled={packs.length <= 2} onClick={() => setPacks((current) => current.filter((_, i) => i !== index))} className="rounded-lg p-2 text-red-500 disabled:opacity-30"><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
              <button type="button" onClick={() => setPacks((current) => [...current, { label: `Set of ${current.length + 1}`, pieces: 1, price: '', mrp: '', sku: '' }])} className="mt-3 flex items-center gap-1 rounded-xl bg-indigo-950 px-3 py-2 text-[11px] font-black text-white"><Plus size={13} /> Add Pack Option</button>
            </section>

            <section className="rounded-3xl border border-orange-200 bg-orange-50/40 p-5 shadow-sm sm:p-7">
              <h2 className="mb-4 text-sm font-black uppercase tracking-wider">3. Shared Physical Stock & Shipping</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={labelClass}>Physical Stock (individual pieces) *</label><input type="number" min="0" step="1" value={form.physical_stock} onChange={(e) => updateForm('physical_stock', e.target.value)} className={fieldClass} /><p className="mt-1 text-[10px] text-gray-600">Example: 100 physical coasters. Set of 6 order reduces this to 94.</p></div>
                <div><label className={labelClass}>Exact Weight of ONE physical piece (grams) *</label><input type="number" min="1" step="1" value={form.net_weight_grams} onChange={(e) => updateForm('net_weight_grams', e.target.value)} className={fieldClass} /></div>
                <div><label className={labelClass}>ONE-piece Length (cm) *</label><input type="number" min="0.01" step="0.01" value={form.package_length_cm} onChange={(e) => updateForm('package_length_cm', e.target.value)} className={fieldClass} /></div>
                <div><label className={labelClass}>ONE-piece Width (cm) *</label><input type="number" min="0.01" step="0.01" value={form.package_width_cm} onChange={(e) => updateForm('package_width_cm', e.target.value)} className={fieldClass} /></div>
                <div><label className={labelClass}>ONE-piece Height (cm) *</label><input type="number" min="0.01" step="0.01" value={form.package_height_cm} onChange={(e) => updateForm('package_height_cm', e.target.value)} className={fieldClass} /></div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-black uppercase tracking-wider">4. Product Images</h2><p className="text-[11px] text-gray-500">Maximum 5 images. First image is main.</p></div><span className="text-xs font-black">{photoUrls.length}/5</span></div>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoSelect} className="hidden" />
              <button type="button" onClick={() => photoInputRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6"><UploadCloud size={24} className="mx-auto mb-2 text-orange-500" /><span className="text-xs font-black">{uploadingPhoto ? 'Uploading…' : 'Upload Product Photos'}</span></button>
              {photoUrls.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">{photoUrls.map((url, index) => <div key={url} className="relative aspect-square overflow-hidden rounded-xl border"><img src={url} alt={`Product ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => setPhotoUrls((current) => current.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded bg-red-600 p-1 text-white"><Trash2 size={11} /></button></div>)}</div>}
            </section>
          </div>

          <aside className="space-y-5 lg:col-span-4">
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-black uppercase tracking-wider">GST & Status</h2>
              <div className="space-y-4"><div><label className={labelClass}>GST Rate *</label><select value={form.gst_rate} onChange={(e) => updateForm('gst_rate', e.target.value)} className={fieldClass}><option value="">Select verified GST…</option><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></select></div><div><label className={labelClass}>Listing Status</label><select value={form.status} onChange={(e) => updateForm('status', e.target.value)} className={fieldClass}><option>Active</option><option>Draft</option></select></div></div>
            </section>

            <section className="rounded-3xl border border-indigo-200 bg-indigo-50/60 p-5 text-xs text-indigo-950">
              <h2 className="mb-3 font-black uppercase">Customer Preview</h2>
              <div className="aspect-square overflow-hidden rounded-2xl bg-white">{photoUrls[0] ? <img src={photoUrls[0]} alt="Preview" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-gray-300"><ImageIcon size={32} />No image</div>}</div>
              <p className="mt-3 text-[10px] font-black uppercase text-orange-600">{form.brand || 'Brand'}</p>
              <p className="font-black">{form.title || 'Product Title'}</p>
              <p className="mt-2 text-xl font-black">{lowestPrice ? `From ₹${lowestPrice}` : 'Set pack prices'}</p>
              <div className="mt-3 space-y-1">{packs.filter((row) => Number(row.price) > 0).map((row, index) => <div key={index} className="flex justify-between rounded-lg bg-white px-3 py-2"><span>{row.label} · {row.pieces} pcs</span><strong>₹{Number(row.price).toLocaleString('en-IN')}</strong></div>)}</div>
              <p className="mt-3 rounded-xl bg-white p-3"><strong>Shared stock:</strong> {Number(form.physical_stock) || 0} physical pieces</p>
            </section>
          </aside>
        </div>
      </div>
      
    </main>
  );
}
