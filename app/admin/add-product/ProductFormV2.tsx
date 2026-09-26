'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { sanitizeMarketplaceUrl } from '@/lib/utils';
import { normalizeProductPackage, ProductPackageValidationError } from '@/lib/catalog/product-package';
import { optimizeProductImageBeforeUpload } from '@/lib/catalog/image-compression';
import { CATEGORY_ENGINE, CategoryAttribute } from '@/lib/category-attributes';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  DollarSign,
  Film,
  Image as ImageIcon,
  Loader2,
  PackageCheck,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
  Video,
  X
} from 'lucide-react';

type SellingFormat = 'single' | 'multiple' | 'set';
type ColourSelectionMode = 'none' | 'customer' | 'assorted';

type VariantRow = {
  size: string;
  sku: string;
  stock: number;
};

type SetContentRow = {
  name: string;
  quantity: number;
};

async function compressVideoFile(
  file: File,
  onProgress: (percent: number) => void
): Promise<{ compressedBlob: Blob; originalSizeMB: number; compressedSizeMB: number; savedPercent: number }> {
  const originalSizeMB = +(file.size / (1024 * 1024)).toFixed(2);
  if (file.size <= 4 * 1024 * 1024) {
    onProgress(100);
    return { compressedBlob: file, originalSizeMB, compressedSizeMB: originalSizeMB, savedPercent: 0 };
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      let width = video.videoWidth || 1280;
      let height = video.videoHeight || 720;
      const maxDim = 1080;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      width = width % 2 === 0 ? width : width - 1;
      height = height % 2 === 0 ? height : height - 1;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        resolve({ compressedBlob: file, originalSizeMB, compressedSizeMB: originalSizeMB, savedPercent: 0 });
        return;
      }

      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const mimeType = mimeTypes.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || 'video/webm';
      let recorder: MediaRecorder;

      try {
        recorder = new MediaRecorder(canvas.captureStream(25), { mimeType, videoBitsPerSecond: 1_800_000 });
      } catch {
        resolve({ compressedBlob: file, originalSizeMB, compressedSizeMB: originalSizeMB, savedPercent: 0 });
        return;
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const compressed = new Blob(chunks, { type: mimeType });
        const useCompressed = compressed.size > 0 && compressed.size < file.size;
        const output = useCompressed ? compressed : file;
        const compressedSizeMB = +(output.size / (1024 * 1024)).toFixed(2);
        const savedPercent = Math.max(0, Math.round(((originalSizeMB - compressedSizeMB) / originalSizeMB) * 100));
        URL.revokeObjectURL(video.src);
        resolve({ compressedBlob: output, originalSizeMB, compressedSizeMB, savedPercent });
      };

      const duration = video.duration || 10;
      let frameId = 0;
      const draw = () => {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, width, height);
        onProgress(Math.min(98, Math.round((video.currentTime / duration) * 100)));
        frameId = requestAnimationFrame(draw);
      };

      recorder.start(100);
      video.playbackRate = 2;
      video.play().then(draw).catch(() => {
        resolve({ compressedBlob: file, originalSizeMB, compressedSizeMB: originalSizeMB, savedPercent: 0 });
      });
      video.onended = () => {
        cancelAnimationFrame(frameId);
        ctx.drawImage(video, 0, 0, width, height);
        onProgress(100);
        if (recorder.state !== 'inactive') recorder.stop();
      };
    };

    video.onerror = () => {
      resolve({ compressedBlob: file, originalSizeMB, compressedSizeMB: originalSizeMB, savedPercent: 0 });
    };
  });
}

export default function ProductFormV2() {
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('Fashion & Apparel');
  const initialConfig = CATEGORY_ENGINE['Fashion & Apparel'];
  const [selectedSubCategory, setSelectedSubCategory] = useState(initialConfig.subcategories[0]?.name || '');
  const [selectedProductType, setSelectedProductType] = useState(initialConfig.subcategories[0]?.productTypes[0] || '');
  const [dynamicAttrs, setDynamicAttrs] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    brand: '',
    price: '',
    mrp: '',
    hsn_code: '6204',
    gst_rate: '',
    net_weight_grams: '',
    package_length_cm: '',
    package_width_cm: '',
    package_height_cm: '',
    status: 'Active',
    amazon_url: '',
    flipkart_url: '',
    meesho_url: '',
    other_marketplace_url: '',
    other_marketplace_name: ''
  });

  const [sellingFormat, setSellingFormat] = useState<SellingFormat>('single');
  const [sellingQuantity, setSellingQuantity] = useState(1);
  const [setContents, setSetContents] = useState<SetContentRow[]>([]);
  const [colourSelectionMode, setColourSelectionMode] = useState<ColourSelectionMode>('none');
  const [availableColours, setAvailableColours] = useState<string[]>([]);
  const [newColour, setNewColour] = useState('');

  const [variants, setVariants] = useState<VariantRow[]>([
    { size: 'Free Size', sku: '', stock: 10 }
  ]);

  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoState, setVideoState] = useState<{
    isProcessing: boolean;
    stage: 'idle' | 'compressing' | 'uploading' | 'ready' | 'error';
    progress: number;
    stats?: { originalSizeMB: number; compressedSizeMB: number; savedPercent: number };
  }>({ isProcessing: false, stage: 'idle', progress: 0 });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const currentCategoryConfig = CATEGORY_ENGINE[selectedCategory] || CATEGORY_ENGINE['Fashion & Apparel'];
  const isApparelCategory = selectedCategory === 'Fashion & Apparel';

  const activeAttributes = useMemo(() => {
    const attrs: CategoryAttribute[] = [...(currentCategoryConfig.generalAttributes || [])];
    const sub = currentCategoryConfig.subcategories.find((item) => item.name === selectedSubCategory);
    sub?.attributes.forEach((attr) => {
      if (!attr.productTypes || attr.productTypes.includes(selectedProductType)) attrs.push(attr);
    });
    return attrs;
  }, [currentCategoryConfig, selectedSubCategory, selectedProductType]);

  const totalStock = useMemo(
    () => variants.reduce((total, row) => total + (Number(row.stock) || 0), 0),
    [variants]
  );

  const priceNum = parseFloat(formData.price) || 0;
  const mrpNum = parseFloat(formData.mrp) || 0;
  const discountPercent = mrpNum > priceNum && mrpNum > 0 ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0;

  const sellingUnitLabel = sellingFormat === 'set'
    ? `1 Set of ${sellingQuantity} ${sellingQuantity === 1 ? 'Piece' : 'Pieces'}`
    : sellingFormat === 'multiple'
      ? `${sellingQuantity} ${sellingQuantity === 1 ? 'Piece' : 'Pieces'}`
      : '1 Piece';

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const applyCategory = (category: string) => {
    const config = CATEGORY_ENGINE[category];
    if (!config) return;
    setSelectedCategory(category);
    setSelectedSubCategory(config.subcategories[0]?.name || '');
    setSelectedProductType(config.subcategories[0]?.productTypes[0] || '');
    setDynamicAttrs({});
    setFormData((current) => ({
      ...current,
      hsn_code: category === 'Home & Kitchen' ? '' : config.defaultHsn,
      gst_rate: ''
    }));
    setVariants((current) => {
      if (current.length !== 1) return current;
      if (category === 'Fashion & Apparel' && current[0].size === 'Standard') return [{ ...current[0], size: 'Free Size' }];
      if (category !== 'Fashion & Apparel' && current[0].size === 'Free Size') return [{ ...current[0], size: 'Standard' }];
      return current;
    });
  };

  const applySubCategory = (subCategory: string) => {
    setSelectedSubCategory(subCategory);
    const sub = currentCategoryConfig.subcategories.find((item) => item.name === subCategory);
    setSelectedProductType(sub?.productTypes[0] || '');
    setDynamicAttrs({});
  };

  const addColour = () => {
    const colour = newColour.trim();
    if (!colour) return;
    if (!availableColours.some((existing) => existing.toLowerCase() === colour.toLowerCase())) {
      setAvailableColours((current) => [...current, colour]);
    }
    setNewColour('');
  };

  const addSetContentRow = () => setSetContents((current) => [...current, { name: '', quantity: 1 }]);

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    if (photoUrls.length + files.length > 5) {
      setErrorMsg('You can upload a maximum of 5 product photos.');
      return;
    }

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

  const movePhoto = (index: number, delta: number) => {
    setPhotoUrls((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const handleVideoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please select a valid video file.');
      return;
    }

    setErrorMsg('');
    try {
      setVideoState({ isProcessing: true, stage: 'compressing', progress: 10 });
      const result = await compressVideoFile(file, (progress) => {
        setVideoState((current) => ({ ...current, progress }));
      });
      setVideoState((current) => ({ ...current, stage: 'uploading', progress: 99, stats: result }));
      const ext = result.compressedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(fileName, result.compressedBlob, {
        contentType: result.compressedBlob.type || 'video/webm',
        upsert: false
      });
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      setVideoUrl(data?.publicUrl || '');
      setVideoState({ isProcessing: false, stage: 'ready', progress: 100, stats: result });
    } catch (error: any) {
      setVideoState({ isProcessing: false, stage: 'error', progress: 0 });
      setErrorMsg(`Video upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const validateAndBuildDescription = () => {
    const validSetContents = setContents.filter((row) => row.name.trim() && Number(row.quantity) > 0);
    if (sellingFormat === 'set' && validSetContents.length > 0) {
      const sum = validSetContents.reduce((total, row) => total + Number(row.quantity), 0);
      if (sum !== sellingQuantity) throw new Error(`Set contents total (${sum}) must match Pieces in Set (${sellingQuantity}).`);
    }

    let description = formData.description.trim();
    const specs = Object.entries(dynamicAttrs).filter(([, value]) => value?.trim());
    if (specs.length) {
      description += `${description ? '\n\n' : ''}Product Specifications:\n${specs.map(([key, value]) => `• ${key}: ${value}`).join('\n')}`;
    }

    const sellingLines = [
      `• Selling Unit: ${sellingUnitLabel}`,
      `• Colour Mode: ${colourSelectionMode === 'customer' ? 'Customer Selects Colour' : colourSelectionMode === 'assorted' ? 'Assorted / Mixed Colours' : 'Not Applicable'}`
    ];
    if (availableColours.length) sellingLines.push(`• Available Colours: ${availableColours.join(', ')}`);
    if (colourSelectionMode === 'assorted') sellingLines.push('• Colour Note: Assorted colours are dispatched subject to stock availability; exact colours may vary.');
    if (validSetContents.length) sellingLines.push(`• Set Contents: ${validSetContents.map((row) => `${row.quantity} × ${row.name.trim()}`).join(' + ')}`);
    description += `${description ? '\n\n' : ''}Selling Details:\n${sellingLines.join('\n')}`;
    return description;
  };

  const publishProduct = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.title.trim()) return setErrorMsg('Product title is required.');
    if (!priceNum || priceNum <= 0) return setErrorMsg('Valid selling price is required.');
    if (!formData.hsn_code.trim()) return setErrorMsg('Verified HSN code is required. Use the supplier/source sheet value.');
    if (!formData.gst_rate) return setErrorMsg('Select the verified GST rate before publishing.');
    if (photoUrls.length === 0) return setErrorMsg('Please upload at least 1 product image.');
    if (sellingQuantity < 1) return setErrorMsg('Selling unit quantity must be at least 1.');
    if (colourSelectionMode !== 'none' && availableColours.length === 0) return setErrorMsg('Add at least one available colour.');
    if (!variants.length || totalStock < 0) return setErrorMsg('At least one inventory row is required.');

    let productPackage;
    let description;
    try {
      productPackage = normalizeProductPackage(formData);
      description = validateAndBuildDescription();
    } catch (error) {
      if (error instanceof ProductPackageValidationError) return setErrorMsg(error.message);
      return setErrorMsg(error instanceof Error ? error.message : 'Please review the product data.');
    }

    setLoading(true);
    try {
      const productPayload: Record<string, any> = {
        title: formData.title.trim(),
        description,
        category: selectedCategory,
        brand: formData.brand.trim() || null,
        price: priceNum,
        mrp: mrpNum > 0 ? mrpNum : priceNum,
        stock: totalStock,
        hsn_code: formData.hsn_code.trim(),
        gst_rate: parseFloat(formData.gst_rate),
        net_weight_grams: productPackage.weight,
        package_length_cm: productPackage.length,
        package_width_cm: productPackage.width,
        package_height_cm: productPackage.height,
        images: photoUrls,
        is_active: formData.status === 'Active',
        amazon_url: sanitizeMarketplaceUrl(formData.amazon_url),
        flipkart_url: sanitizeMarketplaceUrl(formData.flipkart_url),
        meesho_url: sanitizeMarketplaceUrl(formData.meesho_url),
        other_marketplace_url: sanitizeMarketplaceUrl(formData.other_marketplace_url),
        other_marketplace_name: formData.other_marketplace_url ? (formData.other_marketplace_name.trim() || 'Marketplace') : null
      };
      if (videoUrl) productPayload.video = videoUrl;

      let response = await supabase.from('products').insert([productPayload]).select('id, title').single();
      if (response.error && (response.error.message?.includes('column "video"') || response.error.message?.includes('video_url'))) {
        delete productPayload.video;
        response = await supabase.from('products').insert([productPayload]).select('id, title').single();
      }
      if (response.error || !response.data) throw response.error || new Error('Failed to create product record.');

      const productId = response.data.id;
      const defaultNonApparelLabel = sellingFormat === 'set'
        ? `Set of ${sellingQuantity}`
        : sellingFormat === 'multiple'
          ? `Pack of ${sellingQuantity}`
          : 'Standard';

      const inventoryInserts = variants.map((row) => {
        const typedLabel = row.size.trim();
        const optionLabel = !isApparelCategory && (!typedLabel || typedLabel === 'Free Size' || typedLabel === 'Standard')
          ? defaultNonApparelLabel
          : typedLabel;
        return {
          product_id: productId,
          size: optionLabel,
          sku: row.sku.trim() || `${formData.title.slice(0, 3).toUpperCase()}-${optionLabel.replace(/\s+/g, '-').toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          weight_kg: Math.max(0.001, Number(productPackage.weight) / 1000),
          available_quantity: Number(row.stock) || 0,
          reserved_quantity: 0,
          sold_quantity: 0,
          reorder_level: 5
        };
      });

      const { error: inventoryError } = await supabase.from('inventory').upsert(inventoryInserts, { onConflict: 'product_id,size' });
      if (inventoryError) throw inventoryError;

      setSuccessMsg('Product published successfully. The structured selling unit, colour details and inventory were saved.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to create product.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = 'w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600';
  const labelClass = 'mb-1 block text-xs font-bold uppercase text-gray-700';

  return (
    <main className="min-h-screen bg-[#F8F9FB] font-sans pb-24">
      

      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin/products" className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"><ArrowLeft size={18} /></Link>
            <div>
              <h1 className="text-lg font-black text-indigo-950">Add New Product</h1>
              <p className="text-[11px] text-gray-500">Structured selling unit • Editable colours • Category-aware specifications</p>
            </div>
          </div>
          <button type="button" onClick={publishProduct} disabled={loading || uploadingPhoto || videoState.isProcessing} className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-orange-600 disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Publish Product
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {errorMsg && <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700"><AlertCircle size={17} className="shrink-0" /><span>{errorMsg}</span><button className="ml-auto" onClick={() => setErrorMsg('')}><X size={14} /></button></div>}
        {successMsg && <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-xs font-bold text-green-800"><CheckCircle2 size={20} className="text-green-600" /><span>{successMsg}</span><Link href="/admin/products" className="ml-auto rounded-lg border border-green-300 bg-white px-3 py-1.5">View Catalog</Link></div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-900">1. Category & Classification</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div><label className={labelClass}>Primary Category *</label><select value={selectedCategory} onChange={(e) => applyCategory(e.target.value)} className={fieldClass}>{Object.keys(CATEGORY_ENGINE).map((category) => <option key={category}>{category}</option>)}</select></div>
                <div><label className={labelClass}>Subcategory</label><select value={selectedSubCategory} onChange={(e) => applySubCategory(e.target.value)} className={fieldClass}>{currentCategoryConfig.subcategories.map((sub) => <option key={sub.name}>{sub.name}</option>)}</select></div>
                <div><label className={labelClass}>Product Type</label><select value={selectedProductType} onChange={(e) => { setSelectedProductType(e.target.value); setDynamicAttrs({}); }} className={fieldClass}>{currentCategoryConfig.subcategories.find((sub) => sub.name === selectedSubCategory)?.productTypes.map((type) => <option key={type}>{type}</option>)}</select></div>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-900">2. Product Identity & Shipping</h2>
              <div><label className={labelClass}>Product Title *</label><input name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Drain Pipe Gutter Seal Ring – Leak & Odor Guard" className={fieldClass} /></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className={labelClass}>Brand</label><input name="brand" value={formData.brand} onChange={handleChange} placeholder="e.g. PEPPLO" className={fieldClass} /></div>
                <div><label className={labelClass}>HSN Code *</label><input name="hsn_code" value={formData.hsn_code} onChange={handleChange} placeholder="Use verified source-sheet HSN" className={fieldClass} /></div>
              </div>
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-orange-200 bg-orange-50/50 p-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className={labelClass}>Exact Physical Weight (grams) *</label><input type="number" min="1" step="1" name="net_weight_grams" value={formData.net_weight_grams} onChange={handleChange} placeholder="e.g. 720" className={fieldClass} /></div>
                <div><label className={labelClass}>Package Length (cm) *</label><input type="number" min="0.01" step="0.01" name="package_length_cm" value={formData.package_length_cm} onChange={handleChange} className={fieldClass} /></div>
                <div><label className={labelClass}>Package Width (cm) *</label><input type="number" min="0.01" step="0.01" name="package_width_cm" value={formData.package_width_cm} onChange={handleChange} className={fieldClass} /></div>
                <div><label className={labelClass}>Package Height (cm) *</label><input type="number" min="0.01" step="0.01" name="package_height_cm" value={formData.package_height_cm} onChange={handleChange} className={fieldClass} /></div>
              </div>
              <div><label className={labelClass}>General Description</label><textarea rows={5} name="description" value={formData.description} onChange={handleChange} placeholder="Describe verified product features, use, care and benefits. Do not repeat the store name." className={fieldClass} /></div>
            </section>

            <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div><h2 className="text-sm font-black uppercase tracking-wider text-gray-900">3. {selectedProductType || selectedCategory} Specifications</h2><p className="mt-1 text-[11px] text-gray-500">Only relevant fields are shown for the chosen product type.</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {activeAttributes.map((attr) => (
                  <div key={attr.key}>
                    <label className={labelClass}>{attr.label} <span className="text-[9px] font-normal text-gray-400">({attr.level})</span></label>
                    {attr.type === 'select' && attr.options ? (
                      <select value={dynamicAttrs[attr.key] || ''} onChange={(e) => setDynamicAttrs((current) => ({ ...current, [attr.key]: e.target.value }))} className={fieldClass}><option value="">Select...</option>{attr.options.map((option) => <option key={option}>{option}</option>)}</select>
                    ) : (
                      <input type={attr.type === 'number' ? 'number' : 'text'} value={dynamicAttrs[attr.key] || ''} onChange={(e) => setDynamicAttrs((current) => ({ ...current, [attr.key]: e.target.value }))} placeholder={attr.placeholder} className={fieldClass} />
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div><h2 className="text-sm font-black uppercase tracking-wider text-gray-900">4. Selling Unit & Colours</h2><p className="mt-1 text-[11px] text-gray-500">Define exactly what the customer receives in one purchase.</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className={labelClass}>Selling Format *</label><select value={sellingFormat} onChange={(e) => { const value = e.target.value as SellingFormat; setSellingFormat(value); if (value === 'single') setSellingQuantity(1); }} className={fieldClass}><option value="single">Single Piece</option><option value="multiple">Multiple Pieces / Pack</option><option value="set">Set</option></select></div>
                <div><label className={labelClass}>{sellingFormat === 'set' ? 'Pieces in Set *' : 'Pieces in Selling Unit *'}</label><input type="number" min="1" step="1" disabled={sellingFormat === 'single'} value={sellingFormat === 'single' ? 1 : sellingQuantity} onChange={(e) => setSellingQuantity(Math.max(1, parseInt(e.target.value) || 1))} className={fieldClass} /></div>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs"><span className="font-semibold text-gray-500">Customer receives: </span><span className="font-black text-indigo-950">{sellingUnitLabel}</span></div>

              {sellingFormat === 'set' && (
                <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-gray-800">Set Contents <span className="font-normal normal-case text-gray-400">(optional)</span></p><p className="text-[10px] text-gray-500">For mixed sets such as bowls + spoons + plates. Leave blank if all pieces are the same item.</p></div><button type="button" onClick={addSetContentRow} className="flex items-center gap-1 rounded-xl border bg-white px-3 py-1.5 text-[11px] font-black"><Plus size={12} /> Add Item</button></div>
                  {setContents.map((row, index) => (
                    <div key={index} className="grid grid-cols-[1fr_90px_36px] gap-2">
                      <input value={row.name} onChange={(e) => setSetContents((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, name: e.target.value } : item))} placeholder="e.g. Bowl" className={fieldClass} />
                      <input type="number" min="1" value={row.quantity} onChange={(e) => setSetContents((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, quantity: Math.max(1, parseInt(e.target.value) || 1) } : item))} className={fieldClass} />
                      <button type="button" onClick={() => setSetContents((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={15} className="mx-auto" /></button>
                    </div>
                  ))}
                </div>
              )}

              <div><label className={labelClass}>Colour Selection Mode *</label><select value={colourSelectionMode} onChange={(e) => setColourSelectionMode(e.target.value as ColourSelectionMode)} className={fieldClass}><option value="none">Not Applicable / No Colour Choice</option><option value="customer">Customer Selects Colour</option><option value="assorted">Assorted / Mixed Colours</option></select></div>
              {colourSelectionMode !== 'none' && (
                <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap gap-2">{availableColours.map((colour) => <span key={colour} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-[11px] font-bold">{colour}<button type="button" onClick={() => setAvailableColours((current) => current.filter((item) => item !== colour))} className="text-gray-400 hover:text-red-500"><X size={12} /></button></span>)}</div>
                  <div className="flex gap-2"><input value={newColour} onChange={(e) => setNewColour(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColour(); } }} placeholder="e.g. Black" className={fieldClass} /><button type="button" onClick={addColour} className="flex shrink-0 items-center gap-1 rounded-xl bg-indigo-950 px-3 text-xs font-black text-white"><Plus size={13} /> Add Colour</button></div>
                  {colourSelectionMode === 'assorted' && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-900">Customer does not select an exact colour. The set is dispatched in assorted/mixed colours from the available colour pool.</p>}
                </div>
              )}
            </section>

            <section className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between"><div><h2 className="text-sm font-black uppercase tracking-wider text-gray-900">5. Product Media</h2><p className="text-[11px] text-gray-500">Maximum 5 photos. First photo is the main catalog image.</p></div><span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-900">{photoUrls.length}/5</span></div>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoSelect} className="hidden" />
              <button type="button" onClick={() => photoInputRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:border-indigo-500"><UploadCloud size={24} className="mx-auto mb-2 text-orange-500" /><span className="text-xs font-black text-indigo-950">{uploadingPhoto ? 'Uploading...' : 'Upload Product Photos'}</span></button>
              {photoUrls.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{photoUrls.map((url, index) => <div key={url} className="relative aspect-square overflow-hidden rounded-xl border bg-gray-50"><img src={url} alt={`Product ${index + 1}`} className="h-full w-full object-cover" /><div className="absolute inset-x-1 top-1 flex justify-between"><span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-black text-white">{index === 0 ? 'MAIN' : `#${index + 1}`}</span><div className="flex gap-1">{index > 0 && <button type="button" onClick={() => movePhoto(index, -1)} className="rounded bg-white/90 p-1"><ArrowUp size={11} /></button>}{index < photoUrls.length - 1 && <button type="button" onClick={() => movePhoto(index, 1)} className="rounded bg-white/90 p-1"><ArrowDown size={11} /></button>}<button type="button" onClick={() => setPhotoUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded bg-red-600 p-1 text-white"><Trash2 size={11} /></button></div></div></div>)}</div>}

              <div className="border-t pt-4"><input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoSelect} className="hidden" />{videoState.isProcessing ? <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs font-bold text-indigo-900"><Loader2 size={14} className="mr-2 inline animate-spin" />{videoState.stage === 'compressing' ? 'Compressing' : 'Uploading'} video… {videoState.progress}%</div> : videoUrl ? <div className="space-y-2"><video src={videoUrl} controls className="w-full max-w-sm rounded-xl bg-black" /><button type="button" onClick={() => { setVideoUrl(''); setVideoState({ isProcessing: false, stage: 'idle', progress: 0 }); }} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">Remove Video</button></div> : <button type="button" onClick={() => videoInputRef.current?.click()} className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-600"><Video size={16} className="text-orange-500" /> Add Product Video (Optional)</button>}</div>
            </section>

            <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black uppercase tracking-wider text-gray-900">6. {isApparelCategory ? 'Sizes & Inventory' : 'Inventory'}</h2><p className="text-[11px] text-gray-500">Total stock: <strong>{totalStock}</strong></p></div><button type="button" onClick={() => setVariants((current) => [...current, { size: '', sku: '', stock: 10 }])} className="flex items-center gap-1 rounded-xl bg-orange-50 px-3 py-1.5 text-[11px] font-black text-orange-700"><Plus size={12} /> {isApparelCategory ? 'Add Size' : 'Add Option'}</button></div>
              <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b bg-gray-50 text-[10px] uppercase text-gray-500"><th className="p-3">{isApparelCategory ? 'Size' : 'Inventory Option'}</th><th className="p-3">SKU</th><th className="p-3">Stock</th><th className="p-3"></th></tr></thead><tbody>{variants.map((row, index) => <tr key={index} className="border-b"><td className="p-2"><input value={row.size} onChange={(e) => setVariants((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, size: e.target.value } : item))} placeholder={isApparelCategory ? 'e.g. M' : sellingFormat === 'set' ? `Set of ${sellingQuantity}` : 'Standard'} className={fieldClass} /></td><td className="p-2"><input value={row.sku} onChange={(e) => setVariants((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, sku: e.target.value } : item))} placeholder="e.g. N0001" className={fieldClass} /></td><td className="p-2"><input type="number" min="0" value={row.stock} onChange={(e) => setVariants((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, stock: Math.max(0, parseInt(e.target.value) || 0) } : item))} className={fieldClass} /></td><td className="p-2 text-right"><button type="button" disabled={variants.length === 1} onClick={() => setVariants((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-lg p-2 text-red-500 disabled:opacity-30"><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
            </section>

            <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-900">7. Marketplace Verification Links</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className={labelClass}>Amazon</label><input type="url" name="amazon_url" value={formData.amazon_url} onChange={handleChange} className={fieldClass} /></div><div><label className={labelClass}>Meesho</label><input type="url" name="meesho_url" value={formData.meesho_url} onChange={handleChange} className={fieldClass} /></div><div><label className={labelClass}>Flipkart</label><input type="url" name="flipkart_url" value={formData.flipkart_url} onChange={handleChange} className={fieldClass} /></div><div><label className={labelClass}>Other Website</label><input type="url" name="other_marketplace_url" value={formData.other_marketplace_url} onChange={handleChange} className={fieldClass} /></div></div>
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-gray-900"><DollarSign size={16} className="text-green-600" /> Pricing & GST</h2>
              <div><label className={labelClass}>Selling Price (₹) *</label><input type="number" step="0.01" min="0" name="price" value={formData.price} onChange={handleChange} className={`${fieldClass} text-base font-black text-indigo-950`} /></div>
              <div><label className={labelClass}>MRP (₹)</label><input type="number" step="0.01" min="0" name="mrp" value={formData.mrp} onChange={handleChange} className={fieldClass} /></div>
              {discountPercent > 0 && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-black text-green-800">{discountPercent}% OFF</div>}
              <div><label className={labelClass}>GST Rate (%) *</label><select name="gst_rate" value={formData.gst_rate} onChange={handleChange} className={fieldClass}><option value="">Select verified GST rate…</option><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></select><p className="mt-1 text-[10px] font-semibold text-amber-700">Match GST to the verified HSN/source sheet. It is no longer auto-guessed from category.</p></div>
              <div><label className={labelClass}>Listing Status</label><select name="status" value={formData.status} onChange={handleChange} className={fieldClass}><option value="Active">Active (Visible)</option><option value="Draft">Draft (Hidden)</option></select></div>
              <button type="button" onClick={publishProduct} disabled={loading || uploadingPhoto || videoState.isProcessing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-orange-600 disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save & Publish</button>
            </section>

            <section className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-700">Customer Listing Preview</h2>
              <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">{photoUrls[0] ? <img src={photoUrls[0]} alt="Preview" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-gray-300"><ImageIcon size={32} /><span className="mt-1 text-[10px] font-bold">Upload main photo</span></div>}</div>
              <p className="text-[10px] font-black uppercase text-orange-600">{formData.brand || 'Brand'}</p>
              <h3 className="text-sm font-black text-gray-900">{formData.title || 'Product Title'}</h3>
              <div className="flex items-baseline gap-2"><span className="text-xl font-black text-indigo-950">₹{priceNum || 0}</span>{mrpNum > priceNum && <span className="text-xs text-gray-400 line-through">₹{mrpNum}</span>}</div>
              <div className="rounded-xl bg-indigo-50 p-3 text-xs"><p><span className="text-gray-500">Selling Unit:</span> <strong>{sellingUnitLabel}</strong></p><p className="mt-1"><span className="text-gray-500">Colours:</span> <strong>{colourSelectionMode === 'assorted' ? `Assorted (${availableColours.join(', ') || 'add colours'})` : colourSelectionMode === 'customer' ? (availableColours.join(', ') || 'add colours') : 'Not Applicable'}</strong></p></div>
            </section>

            <section className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 text-xs text-indigo-950">
              <div className="mb-2 flex items-center gap-2 font-black"><PackageCheck size={16} /> Home & Kitchen Example</div>
              <p>N0001: Selling Format <strong>Set</strong> → Pieces in Set <strong>3</strong> → Colour Mode <strong>Assorted / Mixed</strong> → add Black, White, Blue, Green, Pink.</p>
            </section>
          </aside>
        </div>
      </div>

      
    </main>
  );
}
