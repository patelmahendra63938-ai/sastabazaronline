'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { sanitizeMarketplaceUrl } from '@/lib/utils';
import { normalizeProductPackage, ProductPackageValidationError } from '@/lib/catalog/product-package';
import { CATEGORY_ENGINE, CategoryAttribute } from '@/lib/category-attributes';
import { 
  Upload, X, Video, Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle2, 
  AlertCircle, Save, Eye, ArrowLeft, Loader2, ArrowUp, ArrowDown, Sparkles, 
  Check, DollarSign, PackageCheck, ShieldCheck, Image as ImageIcon, 
  Film, RefreshCw, UploadCloud 
} from 'lucide-react';

interface VariantRow {
  size: string;
  sku: string;
  weight_kg: number;
  stock: number;
}

// 🎬 Client-side Video Compressor (Canvas/MediaRecorder)
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

      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
      const selectedMimeType = mimeTypes.find(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || 'video/webm';

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(canvas.captureStream(25), {
          mimeType: selectedMimeType,
          videoBitsPerSecond: 1_800_000
        });
      } catch {
        resolve({ compressedBlob: file, originalSizeMB, compressedSizeMB: originalSizeMB, savedPercent: 0 });
        return;
      }

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const compressedBlob = new Blob(chunks, { type: selectedMimeType });
        const compressedSizeMB = +(compressedBlob.size / (1024 * 1024)).toFixed(2);
        const savedPercent = Math.max(0, Math.round(((originalSizeMB - compressedSizeMB) / originalSizeMB) * 100));

        URL.revokeObjectURL(video.src);
        resolve({
          compressedBlob: compressedBlob.size < file.size ? compressedBlob : file,
          originalSizeMB,
          compressedSizeMB: compressedBlob.size < file.size ? compressedSizeMB : originalSizeMB,
          savedPercent: compressedBlob.size < file.size ? savedPercent : 0
        });
      };

      video.playbackRate = 2.0;
      const duration = video.duration || 10;
      let animFrameId: number;

      const drawFrame = () => {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, width, height);
        onProgress(Math.min(98, Math.round((video.currentTime / duration) * 100)));
        animFrameId = requestAnimationFrame(drawFrame);
      };

      mediaRecorder.start(100);
      video.play().then(() => drawFrame()).catch(() => {
        resolve({ compressedBlob: file, originalSizeMB, compressedSizeMB: originalSizeMB, savedPercent: 0 });
      });

      video.onended = () => {
        cancelAnimationFrame(animFrameId);
        ctx.drawImage(video, 0, 0, width, height);
        onProgress(100);
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        }, 150);
      };
    };

    video.onerror = () => {
      resolve({ compressedBlob: file, originalSizeMB, compressedSizeMB: originalSizeMB, savedPercent: 0 });
    };
  });
}

export default function AdminAddProductPage() {
  const router = useRouter();

  // --- Form & UI Global States ---
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  // Category Engine State
  const [selectedCategory, setSelectedCategory] = useState<string>('Fashion & Apparel');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('Women Ethnic Wear');
  const [selectedProductType, setSelectedProductType] = useState<string>('Kurtis & Kurta Sets');
  const [dynamicAttrs, setDynamicAttrs] = useState<Record<string, string>>({});
  const [showCategoryChangeConfirm, setShowCategoryChangeConfirm] = useState<string | null>(null);

  // 1. Basic Product Info & Pricing
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    brand: '',
    price: '',
    mrp: '',
    hsn_code: '6204',
    gst_rate: '5',
    net_weight_grams: '',
    package_length_cm: '',
    package_width_cm: '',
    package_height_cm: '',
    status: 'Active',
    amazon_url: '',
    flipkart_url: '',
    meesho_url: '',
    other_marketplace_url: '',
    other_marketplace_name: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: ''
  });

  // 2. Photos State (Supabase Storage bucket 'product-images')
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [imageQualityNotes, setImageQualityNotes] = useState<string[]>([]);

  // 3. Optional Video State
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoState, setVideoState] = useState<{
    isProcessing: boolean;
    stage: 'idle' | 'compressing' | 'uploading' | 'ready' | 'error';
    progress: number;
    stats?: { originalSizeMB: number; compressedSizeMB: number; savedPercent: number };
  }>({
    isProcessing: false,
    stage: 'idle',
    progress: 0
  });

  // 4. Multi-Size Variants & Inventory Ledger
  const [variants, setVariants] = useState<VariantRow[]>([
    { size: 'Free Size', sku: '', weight_kg: 0.5, stock: 10 }
  ]);

  // 5. Lightbox & Preview Modals
  const [lightbox, setLightbox] = useState({ isOpen: false, index: 0 });
  const [showCustomerPreview, setShowCustomerPreview] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Load existing categories from database
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (data && data.length > 0) {
        const catNames = data.map(c => c.name);
        setCategories(catNames);
        if (!catNames.includes(selectedCategory)) {
          setSelectedCategory(catNames[0]);
        }
      } else {
        setCategories(Object.keys(CATEGORY_ENGINE));
      }
    }
    fetchCategories();
  }, []);

  const currentCategoryConfig = CATEGORY_ENGINE[selectedCategory] || CATEGORY_ENGINE['Fashion & Apparel'];

  const handleCategorySelect = (newCat: string) => {
    if (Object.keys(dynamicAttrs).length > 0 && newCat !== selectedCategory) {
      setShowCategoryChangeConfirm(newCat);
    } else {
      applyCategoryChange(newCat);
    }
  };

  const applyCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    const config = CATEGORY_ENGINE[newCat];
    if (config) {
      setSelectedSubCategory(config.subcategories[0]?.name || '');
      setSelectedProductType(config.subcategories[0]?.productTypes[0] || '');
      setFormData(prev => ({
        ...prev,
        hsn_code: config.defaultHsn,
        gst_rate: String(config.defaultGst)
      }));
    }
    setDynamicAttrs({});
    setShowCategoryChangeConfirm(null);
  };

  const handleSubCategorySelect = (subName: string) => {
    setSelectedSubCategory(subName);
    const sub = currentCategoryConfig.subcategories.find(s => s.name === subName);
    if (sub) {
      setSelectedProductType(sub.productTypes[0] || '');
    }
  };

  const activeAttributes = useMemo(() => {
    const list: CategoryAttribute[] = [...(currentCategoryConfig?.generalAttributes || [])];
    const sub = currentCategoryConfig?.subcategories.find(s => s.name === selectedSubCategory);
    if (sub) {
      sub.attributes.forEach(attr => {
        if (!attr.productTypes || attr.productTypes.includes(selectedProductType)) {
          list.push(attr);
        }
      });
    }
    return list;
  }, [currentCategoryConfig, selectedSubCategory, selectedProductType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDynamicAttrChange = (key: string, value: string) => {
    setDynamicAttrs(prev => ({ ...prev, [key]: value }));
  };

  // -------------------------------------------------------------
  // 🚨 SUPABASE STORAGE DIRECT IMAGE UPLOADER
  // -------------------------------------------------------------
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (photoUrls.length + files.length > 5) {
        setErrorMsg('You can upload a maximum of 5 product photos.');
        return;
      }

      setUploadingPhoto(true);
      setErrorMsg('');

      const newUploadedUrls: string[] = [];
      const notes: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        notes.push(file.size < 40 * 1024 ? `${file.name}: Low resolution detected.` : `${file.name}: ✓ Verified resolution.`);

        const fileExt = file.name.split('.').pop();
        const randStr = Math.random().toString(36).substring(2, 8);
        const fileName = `prod-${Date.now()}-${randStr}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        if (data?.publicUrl) newUploadedUrls.push(data.publicUrl);
      }

      setPhotoUrls(prev => [...prev, ...newUploadedUrls]);
      setImageQualityNotes(notes);
    } catch (err: any) {
      setErrorMsg('Image upload failed: ' + err.message);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotoUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const movePhotoOrder = (index: number, direction: 'up' | 'down') => {
    const newPhotos = [...photoUrls];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPhotos.length) return;
    const temp = newPhotos[index];
    newPhotos[index] = newPhotos[targetIndex];
    newPhotos[targetIndex] = temp;
    setPhotoUrls(newPhotos);
  };

  // -------------------------------------------------------------
  // 🎬 OPTIONAL VIDEO (CLIENT-SIDE COMPRESS + SUPABASE UPLOAD)
  // -------------------------------------------------------------
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid video file (MP4, WEBM, MOV).');
      return;
    }

    try {
      setVideoState({ isProcessing: true, stage: 'compressing', progress: 10 });
      setErrorMsg('');

      const { compressedBlob, originalSizeMB, compressedSizeMB, savedPercent } = await compressVideoFile(
        file,
        (progress) => setVideoState(prev => ({ ...prev, progress }))
      );

      setVideoState(prev => ({
        ...prev,
        stage: 'uploading',
        progress: 99,
        stats: { originalSizeMB, compressedSizeMB, savedPercent }
      }));

      const fileExt = compressedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, compressedBlob, {
          contentType: compressedBlob.type || 'video/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (data?.publicUrl) {
        setVideoUrl(data.publicUrl);
        setVideoState({
          isProcessing: false,
          stage: 'ready',
          progress: 100,
          stats: { originalSizeMB, compressedSizeMB, savedPercent }
        });
      }
    } catch (err: any) {
      console.error('Video compression/upload error:', err);
      setVideoState({ isProcessing: false, stage: 'error', progress: 0 });
    } finally {
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const removeVideo = () => {
    setVideoUrl('');
    setVideoState({ isProcessing: false, stage: 'idle', progress: 0 });
  };

  // Variant Helpers
  const handleVariantChange = (index: number, field: keyof VariantRow, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const addVariantRow = (sizeName: string = '') => {
    setVariants([...variants, { size: sizeName || '', sku: '', weight_kg: 0.5, stock: 10 }]);
  };

  const removeVariantRow = (index: number) => {
    if (variants.length <= 1) {
      alert('At least one size variant is required.');
      return;
    }
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const addPresetSizes = () => {
    const presets = selectedCategory === 'Footwear' ? ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'] : ['S', 'M', 'L', 'XL', 'XXL'];
    setVariants(presets.map(size => ({ size, sku: '', weight_kg: 0.5, stock: 10 })));
  };

  // Calculations & Quality Score
  const totalStock = useMemo(() => variants.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0), [variants]);
  const mrpNum = parseFloat(formData.mrp) || 0;
  const priceNum = parseFloat(formData.price) || 0;
  const discountPercent = mrpNum > priceNum && mrpNum > 0 ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0;
  const savingsAmount = mrpNum > priceNum ? (mrpNum - priceNum).toFixed(2) : 0;

  const qualityScore = useMemo(() => {
    let score = 0;
    if (formData.title.trim().length >= 10) score += 20;
    if (photoUrls.length >= 1) score += 20;
    if (photoUrls.length >= 3) score += 10;
    if (priceNum > 0) score += 15;
    if (mrpNum >= priceNum && mrpNum > 0) score += 5;
    if (formData.description.trim().length >= 30) score += 10;
    if (Object.keys(dynamicAttrs).length >= 3) score += 15;
    if (variants.length > 0 && totalStock > 0) score += 5;
    return Math.min(100, score);
  }, [formData, photoUrls, priceNum, mrpNum, dynamicAttrs, variants, totalStock]);

  const openLightbox = (index: number) => setLightbox({ isOpen: true, index });
  const closeLightbox = () => setLightbox({ isOpen: false, index: 0 });
  const nextLightboxImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox(prev => ({ ...prev, index: (prev.index + 1) % photoUrls.length }));
  };
  const prevLightboxImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox(prev => ({ ...prev, index: prev.index === 0 ? photoUrls.length - 1 : prev.index - 1 }));
  };

  // -------------------------------------------------------------
  // 🚀 PUBLISH PRODUCT
  // -------------------------------------------------------------
  const executePublish = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setShowPublishModal(false);

    if (!formData.title.trim()) {
      setErrorMsg('Product title is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!formData.price || isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('Valid selling price is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let productPackage;
    try {
      productPackage = normalizeProductPackage(formData);
    } catch (validationError) {
      setErrorMsg(
        validationError instanceof ProductPackageValidationError
          ? validationError.message
          : 'Valid physical weight and package dimensions are required.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (photoUrls.length === 0) {
      setErrorMsg('Please upload at least 1 product image.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let structuredDescription = formData.description.trim();
    const attrEntries = Object.entries(dynamicAttrs).filter(([_, v]) => v && v.trim());
    if (attrEntries.length > 0) {
      const formattedSpecs = attrEntries.map(([k, v]) => `• ${k}: ${v}`).join('\n');
      if (!structuredDescription.includes('Product Specifications:')) {
        structuredDescription += `\n\nProduct Specifications:\n${formattedSpecs}`;
      }
    }

    setLoading(true);

    try {
      const productPayload: Record<string, any> = {
        title: formData.title.trim(),
        description: structuredDescription,
        category: selectedCategory,
        brand: formData.brand.trim() || null,
        price: priceNum,
        mrp: mrpNum ? mrpNum : priceNum,
        stock: totalStock,
        hsn_code: formData.hsn_code.trim() || '6204',
        gst_rate: parseFloat(formData.gst_rate) || 5.00,
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

      if (videoUrl) {
        productPayload.video = videoUrl;
      }

      let { data: productData, error: productError } = await supabase
        .from('products')
        .insert([productPayload])
        .select('id, title')
        .single();

      if (productError && (productError.message?.includes('column "video"') || productError.message?.includes('video_url'))) {
        delete productPayload.video;
        const retry = await supabase
          .from('products')
          .insert([productPayload])
          .select('id, title')
          .single();
        productData = retry.data;
        productError = retry.error;
      }

      if (productError || !productData) {
        throw productError || new Error('Failed to create product record.');
      }

      const newProductId = productData.id;

      const inventoryInserts = variants.map(v => ({
        product_id: newProductId,
        size: v.size.trim(),
        sku: v.sku.trim() || `${formData.title.slice(0, 3).toUpperCase()}-${v.size.trim()}-${Math.floor(100 + Math.random() * 900)}`,
        weight_kg: Number(v.weight_kg) || 0.5,
        available_quantity: Number(v.stock) || 0,
        reserved_quantity: 0,
        sold_quantity: 0,
        reorder_level: 5
      }));

      const { error: invError } = await supabase
        .from('inventory')
        .upsert(inventoryInserts, { onConflict: 'product_id,size' });

      if (invError) throw invError;

      setSuccessMsg('🎉 Product published successfully! It is now live on SASTABAZARONLINE.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Publish Error:', err);
      setErrorMsg(err.message || 'Failed to create product.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] flex flex-col font-sans pb-28">
      <Header />

      {/* Top Enterprise Action Header */}
      <div className="bg-white border-b border-gray-200/80 sticky top-0 z-30 shadow-2xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/products" className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-600 border border-gray-200 shadow-2xs">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-indigo-950">Add New Product</h1>
                <span className="bg-indigo-50 text-indigo-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-indigo-100">
                  SASTABAZARONLINE Enterprise Studio
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden sm:block">
                Category Engine • Direct Supabase Storage • Video Compressor • Size Variants
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowCustomerPreview(true)}
              className="px-3.5 py-2 text-xs font-bold text-indigo-950 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Eye size={15} />
              <span>Preview Customer View</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              disabled={loading || uploadingPhoto || videoState.isProcessing}
              className="px-5 py-2 text-xs font-black text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition shadow-md shadow-orange-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              <span>Publish to Catalog</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        
        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-start gap-3 shadow-2xs">
            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600"><X size={14} /></button>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-5 rounded-2xl text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-black">{successMsg}</p>
                <p className="text-[11px] font-normal text-green-700 mt-0.5">Catalog data and size inventory have been stored in Supabase.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/products" className="px-3.5 py-1.5 bg-white border border-green-300 rounded-xl text-green-800 hover:bg-green-100 transition text-xs font-bold">
                View in Catalog
              </Link>
              <button onClick={() => window.location.reload()} className="px-3.5 py-1.5 bg-green-700 text-white rounded-xl hover:bg-green-800 transition text-xs font-bold">
                + Add Another Product
              </button>
            </div>
          </div>
        )}

        {/* Quality Progress Indicator */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-indigo-950 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-indigo-600" />
                Category-Aware Listing Quality
              </span>
              <span className={qualityScore >= 80 ? 'text-green-600' : qualityScore >= 50 ? 'text-orange-500' : 'text-gray-400'}>
                {qualityScore} / 100 ({qualityScore >= 80 ? 'High Quality' : qualityScore >= 50 ? 'Good' : 'Needs Attributes'})
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  qualityScore >= 80 ? 'bg-green-500' : qualityScore >= 50 ? 'bg-orange-500' : 'bg-gray-400'
                }`}
                style={{ width: `${qualityScore}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-500">
            <span className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 ${formData.title ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
              <Check size={12} /> Title
            </span>
            <span className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 ${photoUrls.length >= 1 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
              <Check size={12} /> Photos ({photoUrls.length}/5)
            </span>
            <span className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 ${videoUrl ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-50 text-gray-400'}`}>
              <Film size={12} /> Video {videoUrl ? '✓' : '(Optional)'}
            </span>
            <span className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 ${Object.keys(dynamicAttrs).length >= 2 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
              <Check size={12} /> Attributes ({Object.keys(dynamicAttrs).length})
            </span>
          </div>
        </div>

        {/* 🏢 Main Workspace Layout */}
        <form onSubmit={(e) => { e.preventDefault(); setShowPublishModal(true); }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-8 space-y-6">

            {/* 1. CATEGORY & TAXONOMIC SELECTION */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-950 flex items-center justify-center font-bold text-xs">1</div>
                  <div>
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Category & Classification Engine</h2>
                    <p className="text-[11px] text-gray-500">Adapts specifications and sizes to your exact product type.</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-indigo-950 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  Level: {selectedCategory}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Primary Category *</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-gray-300 rounded-xl bg-gray-50 focus:bg-white text-gray-800"
                  >
                    {Object.keys(CATEGORY_ENGINE).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Subcategory</label>
                  <select
                    value={selectedSubCategory}
                    onChange={(e) => handleSubCategorySelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-xl bg-gray-50 focus:bg-white text-gray-800"
                  >
                    {currentCategoryConfig.subcategories.map(sub => (
                      <option key={sub.name} value={sub.name}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Type</label>
                  <select
                    value={selectedProductType}
                    onChange={(e) => setSelectedProductType(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-xl bg-gray-50 focus:bg-white text-gray-800"
                  >
                    {currentCategoryConfig.subcategories.find(s => s.name === selectedSubCategory)?.productTypes.map(pt => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. BASIC PRODUCT IDENTITY */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-950 flex items-center justify-center font-bold text-xs">2</div>
                  <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Product Identity & Title</h2>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">* Required</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Women Silk Embroidered Kurti with Bottom Set"
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-gray-300 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Brand Name</label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    placeholder="e.g. SASTABAZARONLINE / Adhyey"
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-gray-300 rounded-xl bg-gray-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">HSN Statutory Code</label>
                  <input
                    type="text"
                    name="hsn_code"
                    value={formData.hsn_code}
                    onChange={handleChange}
                    placeholder="6204"
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-gray-300 rounded-xl bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4 sm:p-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950">Shipping / Package Details</h3>
                <p className="mt-1 text-[10px] text-gray-500">Enter measured product package values only. No shipping value is inferred from inventory variants.</p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase sm:col-span-2">Exact Physical Weight (grams) *
                    <input type="number" name="net_weight_grams" required min="1" step="1" inputMode="numeric" value={formData.net_weight_grams} onChange={handleChange} placeholder="e.g. 720" className="mt-1 w-full px-3.5 py-2.5 text-sm font-black border border-orange-300 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden transition" />
                    <span className="mt-1 block text-[10px] font-normal normal-case text-gray-500">Enter the exact product weight in grams, e.g. 720 for 720 g.</span>
                  </label>
                  <label className="block text-xs font-bold text-gray-700 uppercase">Package Length (cm) *
                    <input type="number" name="package_length_cm" required min="0.01" step="0.01" inputMode="decimal" value={formData.package_length_cm} onChange={handleChange} placeholder="e.g. 28" className="mt-1 w-full px-3.5 py-2.5 text-sm border border-orange-300 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden transition" />
                  </label>
                  <label className="block text-xs font-bold text-gray-700 uppercase">Package Width (cm) *
                    <input type="number" name="package_width_cm" required min="0.01" step="0.01" inputMode="decimal" value={formData.package_width_cm} onChange={handleChange} placeholder="e.g. 20" className="mt-1 w-full px-3.5 py-2.5 text-sm border border-orange-300 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden transition" />
                  </label>
                  <label className="block text-xs font-bold text-gray-700 uppercase sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">Package Height (cm) *
                    <input type="number" name="package_height_cm" required min="0.01" step="0.01" inputMode="decimal" value={formData.package_height_cm} onChange={handleChange} placeholder="e.g. 4" className="mt-1 w-full px-3.5 py-2.5 text-sm border border-orange-300 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden transition" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">General Description</label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Provide styling details, packaging contents, wash/care instructions, and customer benefits..."
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-gray-300 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden transition"
                />
              </div>
            </div>

            {/* 3. DYNAMIC CATEGORY ATTRIBUTES */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-950 flex items-center justify-center font-bold text-xs">3</div>
                  <div>
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">{selectedProductType || selectedCategory} Specifications</h2>
                    <p className="text-[11px] text-gray-500">Tailored fields for {selectedCategory} sellers.</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                  Dynamic Matrix Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeAttributes.map(attr => (
                  <div key={attr.key}>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                      <span>{attr.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-normal ${attr.level === 'required' ? 'text-red-500' : 'text-gray-400'}`}>
                        {attr.level.toUpperCase()}
                      </span>
                    </label>

                    {attr.type === 'select' && attr.options ? (
                      <select
                        value={dynamicAttrs[attr.key] || ''}
                        onChange={(e) => handleDynamicAttrChange(attr.key, e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium border border-gray-300 rounded-xl bg-gray-50 focus:bg-white"
                      >
                        <option value="">Select {attr.label}...</option>
                        {attr.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={attr.placeholder || `Enter ${attr.label}`}
                        value={dynamicAttrs[attr.key] || ''}
                        onChange={(e) => handleDynamicAttrChange(attr.key, e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium border border-gray-300 rounded-xl bg-gray-50 focus:bg-white"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. PRODUCT MEDIA SHOWCASE */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-950 flex items-center justify-center font-bold text-xs">4</div>
                  <div>
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Product Media Showcase</h2>
                    <p className="text-[11px] text-gray-500">Stored in Supabase Storage Bucket ('product-images').</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                  {photoUrls.length} / 5 Photos
                </span>
              </div>

              {/* Photos Uploader */}
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                multiple
                ref={photoInputRef}
                onChange={handlePhotoSelect}
                className="hidden"
              />

              <div 
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-indigo-500 bg-gray-50/60 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition group select-none"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto text-orange-500 shadow-2xs group-hover:scale-105 transition mb-2">
                  <UploadCloud size={22} />
                </div>
                <p className="text-xs font-black text-indigo-950">Click or Drag & Drop Images to Upload</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Existing Supabase storage pipeline preserved (JPG, PNG, WEBP)</p>
                {uploadingPhoto && <p className="text-xs text-indigo-600 font-bold animate-pulse mt-2">Uploading photos...</p>}
              </div>

              {photoUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {photoUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-square border-2 border-gray-200 rounded-2xl overflow-hidden group bg-white shadow-2xs flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 bg-indigo-950/85 backdrop-blur-xs text-white text-[10px] font-black text-center py-1 z-10 flex items-center justify-between px-2">
                        <span>#{idx + 1} {idx === 0 ? 'MAIN' : ''}</span>
                        <div className="flex items-center gap-1">
                          {idx > 0 && (
                            <button type="button" onClick={() => movePhotoOrder(idx, 'up')} className="hover:bg-white/20 p-0.5 rounded transition">
                              <ArrowUp size={11} />
                            </button>
                          )}
                          {idx < photoUrls.length - 1 && (
                            <button type="button" onClick={() => movePhotoOrder(idx, 'down')} className="hover:bg-white/20 p-0.5 rounded transition">
                              <ArrowDown size={11} />
                            </button>
                          )}
                        </div>
                      </div>

                      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover pt-6" />

                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button type="button" onClick={() => openLightbox(idx)} className="p-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 shadow-md">
                          <Eye size={14} />
                        </button>
                        <button type="button" onClick={() => removePhoto(idx)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 🎬 Video Section */}
              <div className="pt-5 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-black text-gray-800 uppercase flex items-center gap-1.5">
                      <Film size={15} className="text-indigo-600" />
                      Product Video <span className="text-[10px] text-gray-400 font-normal">(100% Optional)</span>
                    </label>
                    <p className="text-[11px] text-gray-500">Auto-compressed to 1080p WebM/MP4 before upload.</p>
                  </div>
                  {videoUrl && (
                    <span className="bg-green-50 text-green-700 text-[10px] font-black px-2 py-0.5 rounded border border-green-200">
                      Video Ready ✓
                    </span>
                  )}
                </div>

                <input 
                  type="file" 
                  accept="video/mp4,video/webm,video/quicktime" 
                  ref={videoInputRef}
                  onChange={handleVideoSelect}
                  className="hidden"
                />

                {videoState.isProcessing && (
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                      <span className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-indigo-600" />
                        {videoState.stage === 'compressing' ? 'Optimizing video locally (1080p)...' : 'Uploading video to Supabase...'}
                      </span>
                      <span>{videoState.progress}%</span>
                    </div>
                    <div className="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${videoState.progress}%` }} />
                    </div>
                  </div>
                )}

                {videoUrl && (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                    <div className="relative w-full sm:w-80 aspect-video bg-black rounded-xl overflow-hidden shadow-xs">
                      <video src={videoUrl} controls className="w-full h-full object-cover" />
                    </div>
                    {videoState.stats && (
                      <div className="flex items-center gap-3 text-[11px] text-gray-600 font-medium">
                        <span>Original: <strong>{videoState.stats.originalSizeMB} MB</strong></span>
                        <span>→</span>
                        <span>Optimized: <strong className="text-green-700">{videoState.stats.compressedSizeMB} MB</strong></span>
                        {videoState.stats.savedPercent > 0 && (
                          <span className="bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {videoState.stats.savedPercent}% Saved
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button type="button" onClick={() => videoInputRef.current?.click()} className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1 transition">
                        <RefreshCw size={12} /> Replace Video
                      </button>
                      <button type="button" onClick={removeVideo} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold text-red-600 flex items-center gap-1 transition">
                        <Trash2 size={12} /> Remove Video
                      </button>
                    </div>
                  </div>
                )}

                {!videoUrl && !videoState.isProcessing && (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="px-4 py-3 border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-2xl flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-indigo-50/20 transition cursor-pointer"
                  >
                    <Video size={16} className="text-orange-500" />
                    <span>Select Video from Computer (Optional)</span>
                  </button>
                )}
              </div>
            </div>

            {/* 5. SIZES & INVENTORY LEDGER */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-950 flex items-center justify-center font-bold text-xs">5</div>
                  <div>
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Sizes & Inventory Ledger</h2>
                    <p className="text-[11px] text-gray-500">Total Stock Available: <span className="font-black text-indigo-950">{totalStock} Units</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={addPresetSizes} className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-900 rounded-lg hover:bg-indigo-100 transition cursor-pointer">
                    + Load Preset Sizes
                  </button>
                  <button type="button" onClick={() => addVariantRow('')} className="px-2.5 py-1 text-[11px] font-bold bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition flex items-center gap-1 cursor-pointer">
                    <Plus size={12} /> Add Size
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] uppercase font-black text-gray-500">
                      <th className="p-3">Size Variant *</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Weight (KG)</th>
                      <th className="p-3">Stock Units</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {variants.map((v, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-2.5">
                          <input
                            type="text"
                            required
                            value={v.size}
                            onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                            placeholder="e.g. M"
                            className="w-24 px-2.5 py-1.5 border rounded-xl font-black text-gray-900 bg-white"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                            placeholder="Auto-generated"
                            className="w-32 px-2.5 py-1.5 border rounded-xl font-mono text-gray-600 text-[11px] bg-white"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.05"
                            value={v.weight_kg}
                            onChange={(e) => handleVariantChange(idx, 'weight_kg', parseFloat(e.target.value) || 0.5)}
                            className="w-20 px-2.5 py-1.5 border rounded-xl text-gray-800 bg-white"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) => handleVariantChange(idx, 'stock', parseInt(e.target.value) || 0)}
                            className="w-20 px-2.5 py-1.5 border rounded-xl font-black text-indigo-950 bg-white"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <button type="button" onClick={() => removeVariantRow(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. CUSTOMER TRUST & BRAND VERIFICATION */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-950 flex items-center justify-center font-bold text-xs">6</div>
                <div>
                  <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Customer Trust & Brand Verification</h2>
                  <p className="text-[11px] text-gray-500">
                    Help customers verify your brand across trusted marketplaces and official channels.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amazon Product Link</label>
                  <input
                    type="url"
                    name="amazon_url"
                    value={formData.amazon_url}
                    onChange={handleChange}
                    placeholder="https://www.amazon.in/dp/..."
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Meesho Product Link</label>
                  <input
                    type="url"
                    name="meesho_url"
                    value={formData.meesho_url}
                    onChange={handleChange}
                    placeholder="https://www.meesho.com/..."
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Flipkart Product Link</label>
                  <input
                    type="url"
                    name="flipkart_url"
                    value={formData.flipkart_url}
                    onChange={handleChange}
                    placeholder="https://www.flipkart.com/..."
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Official Website / Other</label>
                  <input
                    type="url"
                    name="other_marketplace_url"
                    value={formData.other_marketplace_url}
                    onChange={handleChange}
                    placeholder="https://www.yourbrand.com/product/..."
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right 4 Columns: Pricing & Submission */}
          <div className="lg:col-span-4 space-y-6">

            {/* Pricing Card */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={16} className="text-green-600" />
                Pricing & Statutory GST
              </h2>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  required
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="e.g. 499"
                  className="w-full px-3.5 py-2.5 text-base font-black border border-gray-300 rounded-xl bg-gray-50 focus:bg-white text-indigo-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">MRP Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleChange}
                  placeholder="e.g. 1299"
                  className="w-full px-3.5 py-2 text-xs font-medium border border-gray-300 rounded-xl bg-gray-50 focus:bg-white text-gray-500"
                />
              </div>

              {discountPercent > 0 && (
                <div className="p-3 bg-green-50/70 border border-green-200 rounded-xl flex items-center justify-between text-xs font-black text-green-800">
                  <span>Customer Saves: ₹{savingsAmount}</span>
                  <span className="bg-green-600 text-white px-2 py-0.5 rounded-md text-[10px]">{discountPercent}% OFF</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">GST Rate (%)</label>
                <select
                  name="gst_rate"
                  value={formData.gst_rate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-gray-50 focus:bg-white"
                >
                  <option value="5">5% (Garments &lt; ₹1000 / Essentials)</option>
                  <option value="12">12% (Garments &gt; ₹1000 / Home & Kitchen)</option>
                  <option value="18">18% (Electronics / Accessories)</option>
                  <option value="0">0% (Exempted)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Listing Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs font-black border rounded-xl bg-gray-50 focus:bg-white text-indigo-950"
                >
                  <option value="Active">Active (Visible)</option>
                  <option value="Draft">Draft (Hidden)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || uploadingPhoto || videoState.isProcessing}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{loading ? 'Publishing...' : 'Save & Publish Product'}</span>
                </button>
              </div>
            </div>

            {/* Live Storefront Card Preview */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-gray-700 uppercase tracking-wider">Live Storefront Card</span>
                <span className="text-[10px] text-gray-400">Real-time</span>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs max-w-xs mx-auto">
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {photoUrls[0] ? (
                    <img src={photoUrls[0]} alt="Card Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                      <ImageIcon size={32} />
                      <span className="text-[10px] font-bold mt-1">Upload Photo</span>
                    </div>
                  )}
                  {discountPercent > 0 && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-[10px] font-black text-orange-600 uppercase">{formData.brand || 'SASTABAZARONLINE'}</p>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{formData.title || 'Product Title'}</h4>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-sm font-black text-indigo-950">₹{priceNum || 0}</span>
                    {mrpNum > priceNum && <span className="text-[10px] text-gray-400 line-through">₹{mrpNum}</span>}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>

      <Footer />

      {/* MODAL 1: LIGHTBOX */}
      {lightbox.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-center z-50">
            <span className="text-white font-bold tracking-widest text-xs sm:text-sm bg-black/50 px-4 py-2 rounded-full">
              {lightbox.index + 1} / {photoUrls.length}
            </span>
            <button type="button" onClick={closeLightbox} className="text-white bg-white/10 hover:bg-white/20 p-2 sm:p-3 rounded-full transition backdrop-blur-md cursor-pointer">
              <X size={24} />
            </button>
          </div>

          {photoUrls.length > 1 && (
            <>
              <button type="button" onClick={prevLightboxImage} className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 sm:p-4 rounded-full transition backdrop-blur-md z-50 cursor-pointer">
                <ChevronLeft size={32} />
              </button>
              <button type="button" onClick={nextLightboxImage} className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 sm:p-4 rounded-full transition backdrop-blur-md z-50 cursor-pointer">
                <ChevronRight size={32} />
              </button>
            </>
          )}

          <div className="w-full h-full p-4 sm:p-12 md:p-24 flex items-center justify-center cursor-zoom-out" onClick={closeLightbox}>
            <img src={photoUrls[lightbox.index]} alt="Full Screen Preview" className="max-w-full max-h-full object-contain select-none shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOMER VIEW PREVIEW */}
      {showCustomerPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Customer View Preview</span>
                <h3 className="text-base font-black text-indigo-950">How Buyers Will See This Product</h3>
              </div>
              <button onClick={() => setShowCustomerPreview(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden border">
                {photoUrls[0] ? (
                  <img src={photoUrls[0]} alt="Customer Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">No Photo Uploaded</div>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold text-orange-600 uppercase">{formData.brand || 'SASTABAZARONLINE Wholesale'}</p>
                <h2 className="text-xl font-black text-gray-900 leading-snug">{formData.title || 'Product Title'}</h2>
                
                <div className="flex items-baseline gap-3 border-y py-3">
                  <span className="text-3xl font-black text-indigo-950">₹{priceNum || 0}</span>
                  {mrpNum > priceNum && <span className="text-sm text-gray-400 line-through">₹{mrpNum}</span>}
                  {discountPercent > 0 && <span className="text-xs font-black text-green-700 bg-green-100 px-2 py-0.5 rounded">{discountPercent}% OFF</span>}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-700 uppercase">Available Sizes:</p>
                  <div className="flex gap-2 flex-wrap">
                    {variants.map((v, i) => (
                      <span key={i} className="px-3 py-1.5 border rounded-xl text-xs font-bold bg-white text-gray-800">
                        {v.size} ({v.stock} in stock)
                      </span>
                    ))}
                  </div>
                </div>

                {videoUrl && (
                  <div className="p-3 bg-gray-50 border rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-indigo-900 uppercase">Video Attached:</p>
                    <video src={videoUrl} controls className="w-full aspect-video rounded-lg" />
                  </div>
                )}

                {/* Customer Trust Channels in Preview */}
                {(formData.amazon_url || formData.meesho_url || formData.flipkart_url || formData.other_marketplace_url) && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-700 uppercase">Trusted Shopping & Brand Verification:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.amazon_url && <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-lg">Amazon →</span>}
                      {formData.meesho_url && <span className="px-2.5 py-1 bg-pink-100 text-pink-900 text-[10px] font-bold rounded-lg">Meesho →</span>}
                      {formData.flipkart_url && <span className="px-2.5 py-1 bg-blue-100 text-blue-900 text-[10px] font-bold rounded-lg">Flipkart →</span>}
                      {formData.other_marketplace_url && <span className="px-2.5 py-1 bg-gray-200 text-gray-800 text-[10px] font-bold rounded-lg">Brand Website →</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CATEGORY SWITCH WARNING */}
      {showCategoryChangeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <h3 className="text-base font-black text-indigo-950">Change Category?</h3>
            <p className="text-xs text-gray-500">
              Switching from <strong>{selectedCategory}</strong> to <strong>{showCategoryChangeConfirm}</strong> will reset category-specific specifications. Continue?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCategoryChangeConfirm(null)}
                className="flex-1 py-2.5 border rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applyCategoryChange(showCategoryChangeConfirm)}
                className="flex-1 py-2.5 bg-indigo-950 text-white text-xs font-bold rounded-xl hover:bg-indigo-900"
              >
                Change Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PUBLISH CONFIRMATION */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
              <PackageCheck size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-indigo-950">Ready to Publish Product?</h3>
              <p className="text-xs text-gray-500">Review catalog parameters before publishing to SASTABAZARONLINE.</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border text-xs space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Title:</span> <span className="font-bold text-gray-800 truncate max-w-[200px]">{formData.title}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Category:</span> <span className="font-bold text-indigo-950">{selectedCategory}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Price:</span> <span className="font-black text-indigo-950">₹{priceNum}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Exact Weight:</span> <span className="font-bold text-indigo-950">{formData.net_weight_grams || '—'} g</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Photos:</span> <span className="font-bold">{photoUrls.length} / 5</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Video:</span> <span className="font-bold">{videoUrl ? 'Yes (Optimized)' : 'No (Optional)'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Stock:</span> <span className="font-bold">{totalStock} Units</span></div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowPublishModal(false)} className="flex-1 py-3 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50">
                Back to Edit
              </button>
              <button type="button" onClick={executePublish} className="flex-1 py-3 bg-orange-500 text-white text-xs font-black rounded-xl hover:bg-orange-600 shadow-md shadow-orange-500/20">
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
