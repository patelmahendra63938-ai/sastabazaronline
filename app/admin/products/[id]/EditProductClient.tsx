'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, ImagePlus, Loader2, Save, Trash2, Upload, Video } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { normalizeProductPackage, ProductPackageValidationError } from '@/lib/catalog/product-package';
import { compressProductVideo } from '@/lib/catalog/video-compression';

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
};

type VariantForm = {
  id: string;
  size: string;
  sku: string;
  weight_kg: string;
  available_quantity: string;
};

type VideoState = {
  stage: 'idle' | 'compressing' | 'uploading' | 'ready' | 'error';
  progress: number;
  originalSizeMB?: number;
  compressedSizeMB?: number;
  savedPercent?: number;
};

const EMPTY: ProductForm = {
  title: '',
  description: '',
  brand: '',
  price: '',
  mrp: '',
  category: '',
  hsn_code: '',
  gst_rate: '5',
  net_weight_grams: '',
  package_length_cm: '',
  package_width_cm: '',
  package_height_cm: '',
  is_active: false,
  images: [],
  video: '',
};

const fileName = (prefix: string, file: File) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.name.split('.').pop()?.toLowerCase() || (prefix === 'vid' ? 'mp4' : 'jpg')}`;

export default function EditProductClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoState, setVideoState] = useState<VideoState>({ stage: 'idle', progress: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [p, i] = await Promise.all([
        supabase.from('products').select('*').eq('id', id).single(),
        supabase.from('inventory').select('id,size,sku,weight_kg,available_quantity').eq('product_id', id).order('size'),
      ]);
      if (!active) return;
      if (p.error || !p.data) {
        setError(p.error?.message || 'Product could not be loaded.');
      } else {
        const x: any = p.data;
        setForm({
          title: x.title || '',
          description: x.description || '',
          brand: x.brand || '',
          price: String(x.price ?? ''),
          mrp: String(x.mrp ?? ''),
          category: x.category || '',
          hsn_code: x.hsn_code || '',
          gst_rate: String(x.gst_rate ?? 5),
          net_weight_grams: x.net_weight_grams == null ? '' : String(x.net_weight_grams),
          package_length_cm: x.package_length_cm == null ? '' : String(x.package_length_cm),
          package_width_cm: x.package_width_cm == null ? '' : String(x.package_width_cm),
          package_height_cm: x.package_height_cm == null ? '' : String(x.package_height_cm),
          is_active: Boolean(x.is_active),
          images: Array.isArray(x.images) ? x.images.filter(Boolean) : [],
          video: typeof x.video === 'string' ? x.video : typeof x.video_url === 'string' ? x.video_url : '',
        });
        setVariants(
          (i.data || []).map((v) => ({
            id: v.id,
            size: v.size || '',
            sku: v.sku || '',
            weight_kg: String(v.weight_kg ?? ''),
            available_quantity: String(v.available_quantity ?? 0),
          })),
        );
        if (i.error) setError(`Product loaded, but variants could not be loaded: ${i.error.message}`);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const setField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((x) => ({ ...x, [key]: value }));
    setError('');
    setSuccess('');
  };

  const setVariant = (index: number, key: keyof VariantForm, value: string) => {
    setVariants((x) => x.map((v, n) => (n === index ? { ...v, [key]: value } : v)));
    setError('');
    setSuccess('');
  };

  async function uploadImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (form.images.length + files.length > 5) {
      setError('Maximum 5 product images are allowed. Remove an old image first.');
      e.target.value = '';
      return;
    }
    setUploadingImages(true);
    setError('');
    try {
      const urls: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
        const name = fileName('prod', file);
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(name, file, { contentType: file.type || undefined, upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('product-images').getPublicUrl(name);
        if (!data?.publicUrl) throw new Error('Image URL could not be created.');
        urls.push(data.publicUrl);
      }
      setForm((x) => ({ ...x, images: [...x.images, ...urls] }));
      setSuccess('Images uploaded. Click Save Product to attach the changes.');
    } catch (err: any) {
      setError(`Image upload failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setUploadingImages(false);
      if (imageInput.current) imageInput.current.value = '';
    }
  }

  async function uploadVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid MP4, WEBM or MOV video.');
      e.target.value = '';
      return;
    }

    setUploadingVideo(true);
    setError('');
    setSuccess('');
    setVideoState({ stage: file.size > 4 * 1024 * 1024 ? 'compressing' : 'uploading', progress: 0 });

    try {
      const result = await compressProductVideo(file, (progress) =>
        setVideoState((prev) => ({ ...prev, stage: 'compressing', progress })),
      );

      setVideoState({
        stage: 'uploading',
        progress: 100,
        originalSizeMB: result.originalSizeMB,
        compressedSizeMB: result.compressedSizeMB,
        savedPercent: result.savedPercent,
      });

      const ext = result.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const name = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(name, result.blob, {
        contentType: result.mimeType || 'video/webm',
        upsert: false,
      });
      if (uploadError) throw new Error(`Supabase Storage: ${uploadError.message}`);

      const { data } = supabase.storage.from('product-images').getPublicUrl(name);
      if (!data?.publicUrl) throw new Error('Supabase uploaded the video but did not return a public URL.');

      const { error: dbError } = await supabase.from('products').update({ video: data.publicUrl }).eq('id', id);
      if (dbError) throw new Error(`Video uploaded, but product could not be linked: ${dbError.message}`);

      setForm((x) => ({ ...x, video: data.publicUrl }));
      setVideoState({
        stage: 'ready',
        progress: 100,
        originalSizeMB: result.originalSizeMB,
        compressedSizeMB: result.compressedSizeMB,
        savedPercent: result.savedPercent,
      });
      setSuccess(
        `Video uploaded to Supabase and attached to this product${result.savedPercent ? ` (${result.originalSizeMB} MB → ${result.compressedSizeMB} MB, ${result.savedPercent}% smaller)` : ''}.`,
      );
    } catch (err: any) {
      setVideoState((prev) => ({ ...prev, stage: 'error' }));
      setError(`Video upload failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setUploadingVideo(false);
      if (videoInput.current) videoInput.current.value = '';
    }
  }

  async function removeVideo() {
    setError('');
    setSuccess('');
    const { error: dbError } = await supabase.from('products').update({ video: null }).eq('id', id);
    if (dbError) {
      setError(`Video could not be removed from product: ${dbError.message}`);
      return;
    }
    setForm((x) => ({ ...x, video: '' }));
    setVideoState({ stage: 'idle', progress: 0 });
    setSuccess('Video removed from this product. The old Storage file was not deleted.');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const weight = Number(form.net_weight_grams);
    if (!form.net_weight_grams.trim() || !Number.isInteger(weight) || weight < 1) {
      setError('Exact Physical Weight must be a positive whole number of grams.');
      return;
    }
    const dims = [form.package_length_cm, form.package_width_cm, form.package_height_cm];
    const anyDims = dims.some((v) => v.trim() !== '');
    let pkg: any = null;
    if (form.is_active || anyDims) {
      try {
        pkg = normalizeProductPackage(form);
      } catch (err) {
        setError(err instanceof ProductPackageValidationError ? err.message : 'Valid package dimensions are required.');
        return;
      }
    }
    const price = Number(form.price);
    const mrp = Number(form.mrp);
    if (!form.title.trim() || !Number.isFinite(price) || price <= 0) {
      setError('Product title and valid selling price are required.');
      return;
    }
    if (form.mrp && (!Number.isFinite(mrp) || mrp < price)) {
      setError('MRP must be greater than or equal to selling price.');
      return;
    }
    if (!form.images.length) {
      setError('At least one product image is required.');
      return;
    }
    for (const v of variants) {
      const stock = Number(v.available_quantity);
      if (!v.size.trim() || !Number.isInteger(stock) || stock < 0) {
        setError('Every variant needs a size and non-negative whole-number stock.');
        return;
      }
    }

    setSaving(true);
    const { error: pErr } = await supabase
      .from('products')
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        brand: form.brand.trim() || null,
        price,
        mrp: form.mrp ? mrp : price,
        category: form.category.trim(),
        hsn_code: form.hsn_code.trim() || null,
        gst_rate: Number(form.gst_rate),
        net_weight_grams: weight,
        package_length_cm: pkg?.length ?? null,
        package_width_cm: pkg?.width ?? null,
        package_height_cm: pkg?.height ?? null,
        images: form.images,
        video: form.video || null,
        is_active: form.is_active,
      })
      .eq('id', id);

    if (pErr) {
      setError(`Product was not saved: ${pErr.message}`);
      setSaving(false);
      return;
    }

    if (variants.length) {
      const { error: iErr } = await supabase.from('inventory').upsert(
        variants.map((v) => ({
          id: v.id,
          product_id: id,
          size: v.size.trim(),
          sku: v.sku.trim() || null,
          weight_kg: v.weight_kg === '' ? null : Number(v.weight_kg),
          available_quantity: Number(v.available_quantity),
        })),
      );
      if (iErr) {
        setError(`Product saved, but stock failed: ${iErr.message}`);
        setSaving(false);
        return;
      }
    }

    setSuccess('Product, images, video, shipping details and stock saved successfully.');
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="animate-spin" size={18} /> Loading product…
        </div>
        <Footer />
      </main>
    );
  }

  const videoStageText =
    videoState.stage === 'compressing'
      ? `Compressing video… ${videoState.progress}%`
      : videoState.stage === 'uploading'
        ? 'Uploading compressed video to Supabase…'
        : videoState.stage === 'ready'
          ? 'Video uploaded and linked successfully.'
          : videoState.stage === 'error'
            ? 'Video upload failed. See the error above.'
            : '';

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/admin/products" className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-indigo-950">
          <ArrowLeft size={15} /> Back to Product Catalog
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-black text-indigo-950">Edit Product</h1>
          <p className="mt-1 text-xs text-gray-500">Edit product details, photos, video, shipping information and stock at any time.</p>
        </div>

        <form onSubmit={save} className="space-y-6">
          {error && (
            <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div role="status" className="flex gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-xs font-bold text-green-700">
              <CheckCircle2 size={16} /> {success}
            </div>
          )}

          <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:grid-cols-2">
            <h2 className="sm:col-span-2 text-sm font-black text-indigo-950">Product Details</h2>
            <label className="sm:col-span-2 text-xs font-bold text-gray-700">Product Title *<input required value={form.title} onChange={(e) => setField('title', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
            <label className="text-xs font-bold text-gray-700">Brand<input value={form.brand} onChange={(e) => setField('brand', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
            <label className="text-xs font-bold text-gray-700">Category<input value={form.category} onChange={(e) => setField('category', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
            <label className="text-xs font-bold text-gray-700">Selling Price *<input type="number" min="0.01" step="0.01" required value={form.price} onChange={(e) => setField('price', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
            <label className="text-xs font-bold text-gray-700">MRP<input type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => setField('mrp', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
            <label className="sm:col-span-2 text-xs font-bold text-gray-700">Description<textarea rows={6} value={form.description} onChange={(e) => setField('description', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-indigo-950">Product Images</h2>
                <p className="mt-1 text-xs text-gray-500">Add or remove photos. Maximum 5.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-950 px-4 py-2.5 text-xs font-black text-white">
                {uploadingImages ? <Loader2 className="animate-spin" size={15} /> : <ImagePlus size={15} />}
                {uploadingImages ? 'Uploading…' : 'Add Images'}
                <input ref={imageInput} type="file" accept="image/*" multiple disabled={uploadingImages} onChange={uploadImages} className="hidden" />
              </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {form.images.map((url, n) => (
                <div key={`${url}-${n}`} className="relative overflow-hidden rounded-xl border bg-gray-50">
                  <img src={url} alt={`Product image ${n + 1}`} className="aspect-square w-full object-cover" />
                  <button type="button" onClick={() => setField('images', form.images.filter((_, i) => i !== n))} className="absolute right-2 top-2 rounded-full bg-white p-2 text-red-600 shadow" aria-label={`Remove image ${n + 1}`}>
                    <Trash2 size={14} />
                  </button>
                  <div className="p-2 text-center text-[10px] font-bold text-gray-500">Image {n + 1}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-black text-indigo-950"><Video size={16} /> Product Video</h2>
                <p className="mt-1 text-xs text-gray-500">Videos over 4 MB are compressed automatically before upload to Supabase.</p>
              </div>
              <label className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white ${uploadingVideo ? 'cursor-not-allowed bg-orange-300' : 'cursor-pointer bg-orange-500'}`}>
                {uploadingVideo ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
                {uploadingVideo ? 'Processing…' : form.video ? 'Replace Video' : 'Upload Video'}
                <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime,video/*" disabled={uploadingVideo} onChange={uploadVideo} className="hidden" />
              </label>
            </div>

            {videoStageText && (
              <div className="mt-4 rounded-xl border bg-gray-50 p-3 text-xs font-bold text-gray-700">
                {videoStageText}
                {videoState.stage === 'compressing' && (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full bg-indigo-950 transition-all" style={{ width: `${Math.min(100, videoState.progress)}%` }} />
                  </div>
                )}
              </div>
            )}

            {form.video ? (
              <div className="mt-4 space-y-3">
                <video src={form.video} controls playsInline preload="metadata" className="max-h-[420px] w-full rounded-xl bg-black object-contain" />
                <button type="button" onClick={removeVideo} disabled={uploadingVideo} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-xs font-black text-red-700 disabled:opacity-50">
                  <Trash2 size={14} /> Remove Video From Product
                </button>
                <p className="text-[11px] text-gray-500">Removing detaches the product URL immediately. The old Storage file is kept to avoid deleting the wrong file.</p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed p-8 text-center text-xs text-gray-500">No video attached. Choose a video; successful uploads are linked to this product automatically.</div>
            )}
          </section>

          <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-indigo-950">Shipping / Package Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 text-xs font-bold text-gray-700">Exact Physical Weight (grams) *<input type="number" required min="1" step="1" value={form.net_weight_grams} onChange={(e) => setField('net_weight_grams', e.target.value)} className="mt-1 w-full rounded-xl border border-orange-300 px-3 py-3" /></label>
              <label className="text-xs font-bold text-gray-700">Package Length (cm)<input type="number" required={form.is_active} min="0.01" step="0.01" value={form.package_length_cm} onChange={(e) => setField('package_length_cm', e.target.value)} className="mt-1 w-full rounded-xl border border-orange-300 px-3 py-3" /></label>
              <label className="text-xs font-bold text-gray-700">Package Width (cm)<input type="number" required={form.is_active} min="0.01" step="0.01" value={form.package_width_cm} onChange={(e) => setField('package_width_cm', e.target.value)} className="mt-1 w-full rounded-xl border border-orange-300 px-3 py-3" /></label>
              <label className="text-xs font-bold text-gray-700">Package Height (cm)<input type="number" required={form.is_active} min="0.01" step="0.01" value={form.package_height_cm} onChange={(e) => setField('package_height_cm', e.target.value)} className="mt-1 w-full rounded-xl border border-orange-300 px-3 py-3" /></label>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-indigo-950">Tax and Listing</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-xs font-bold text-gray-700">HSN Code<input value={form.hsn_code} onChange={(e) => setField('hsn_code', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
              <label className="text-xs font-bold text-gray-700">GST Rate (%)<input type="number" min="0" step="0.01" value={form.gst_rate} onChange={(e) => setField('gst_rate', e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
              <label className="flex items-center gap-2 pt-6 text-xs font-bold text-gray-700"><input type="checkbox" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} className="size-5 accent-indigo-950" /> Active / purchasable</label>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-indigo-950">Existing Variants and Stock</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead><tr className="border-b bg-gray-50 text-[10px] uppercase text-gray-500"><th className="p-3">Size</th><th className="p-3">SKU</th><th className="p-3">Legacy Weight (kg)</th><th className="p-3">Available Stock</th></tr></thead>
                <tbody>
                  {variants.map((v, n) => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="p-2"><input required value={v.size} onChange={(e) => setVariant(n, 'size', e.target.value)} className="w-full rounded-lg border px-2.5 py-2" /></td>
                      <td className="p-2"><input value={v.sku} onChange={(e) => setVariant(n, 'sku', e.target.value)} className="w-full rounded-lg border px-2.5 py-2" /></td>
                      <td className="p-2"><input type="number" step="0.001" value={v.weight_kg} onChange={(e) => setVariant(n, 'weight_kg', e.target.value)} className="w-full rounded-lg border px-2.5 py-2" /></td>
                      <td className="p-2"><input type="number" min="0" step="1" value={v.available_quantity} onChange={(e) => setVariant(n, 'available_quantity', e.target.value)} className="w-full rounded-lg border px-2.5 py-2" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="sticky bottom-3 flex justify-end rounded-2xl border bg-white/95 p-3 shadow-lg backdrop-blur">
            <button type="submit" disabled={saving || uploadingImages || uploadingVideo} className="inline-flex items-center gap-2 rounded-xl bg-indigo-950 px-5 py-3 text-xs font-black text-white disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} {saving ? 'Saving…' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </main>
  );
}
