'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard, { Product } from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { sanitizeMarketplaceUrl, sanitizeMarketplaceName } from '@/lib/utils';
import { 
  ShoppingCart, 
  Zap, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Star, 
  Check, 
  Heart,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Minus,
  AlertCircle,
  Eye,
  MapPin,
  FileText,
  PlayCircle
} from 'lucide-react';

interface Variant {
  id: string;
  size: string;
  sku: string;
  weight_kg: number;
  available_quantity: number;
}

interface ProductDetailType {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  mrp?: number | null;
  category: string;
  brand?: string | null;
  images?: string[] | null;
  image?: string | null;
  video?: string | null;
  video_url?: string | null;
  hsn_code?: string | null;
  gst_rate?: number | null;
  stock?: number | null;
  amazon_url?: string | null;
  flipkart_url?: string | null;
  meesho_url?: string | null;
  other_marketplace_url?: string | null;
  other_marketplace_name?: string | null;
}

export default function ProductDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> | { id: string } 
}) {
  const router = useRouter();
  const resolvedParams = typeof (params as any)?.then === 'function' 
    ? use(params as Promise<{ id: string }>) 
    : (params as { id: string });
  const productId = resolvedParams?.id;

  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [addedToCart, setAddedToCart] = useState<boolean>(false);

  const [pincode, setPincode] = useState<string>('');
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const [lightbox, setLightbox] = useState<{ isOpen: boolean; index: number }>({
    isOpen: false,
    index: 0
  });

  useEffect(() => {
    async function loadProductData() {
      if (!productId) return;
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: prodData, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (prodErr || !prodData) {
          throw new Error('Product not found or currently unavailable.');
        }

        setProduct(prodData);

        const initialImg = (prodData.images && prodData.images.length > 0)
          ? prodData.images[0]
          : prodData.image || 'https://images.unsplash.com/photo-1584990347426-c7853cd4afc9?w=600';
        setSelectedMedia(initialImg);
        setMediaType('image');

        if (typeof window !== 'undefined') {
          try {
            const wishlist = JSON.parse(localStorage.getItem('sastabazar_wishlist') || '[]');
            setIsWishlisted(wishlist.some((item: any) => item.id === prodData.id || item.product_id === prodData.id));
          } catch {
            setIsWishlisted(false);
          }
        }

        const { data: invData } = await supabase
          .from('inventory')
          .select('*')
          .eq('product_id', productId);

        if (invData && invData.length > 0) {
          setVariants(invData);
          const inStock = invData.find(v => v.available_quantity > 0);
          setSelectedSize(inStock ? inStock.size : invData[0].size);
        } else {
          setVariants([]);
          setSelectedSize('Standard');
        }

        const { data: similar } = await supabase
          .from('products')
          .select('*')
          .eq('category', prodData.category || 'General')
          .neq('id', productId)
          .limit(4);

        setSimilarProducts(similar || []);

      } catch (err: any) {
        console.error('Error loading product detail:', err);
        setErrorMsg(err.message || 'Failed to load product details.');
      } finally {
        setLoading(false);
      }
    }

    loadProductData();
  }, [productId]);

  const imagesList: string[] = product?.images && product.images.length > 0
    ? product.images
    : product?.image
      ? [product.image]
      : ['https://images.unsplash.com/photo-1584990347426-c7853cd4afc9?w=600'];

  // Gracefully supports schema 'video' or legacy 'video_url'
  const videoSource = product?.video || product?.video_url || null;

  const activeVariant = variants.find(v => v.size === selectedSize);
  const maxAvailableStock = variants.length > 0 
    ? (activeVariant ? activeVariant.available_quantity : 0)
    : (product?.stock ?? 99);
  const isOutOfStock = maxAvailableStock <= 0;

  const mrpVal = product?.mrp ? Number(product.mrp) : (product ? Number(product.price) : 0);
  const priceVal = product ? Number(product.price) : 0;
  const discountPct = mrpVal > priceVal && mrpVal > 0 
    ? Math.round(((mrpVal - priceVal) / mrpVal) * 100) 
    : 0;

  // Lightbox Handlers
  const openLightbox = (url: string) => {
    const foundIdx = imagesList.indexOf(url);
    setLightbox({ isOpen: true, index: foundIdx >= 0 ? foundIdx : 0 });
  };

  const closeLightbox = useCallback(() => {
    setLightbox(prev => ({ ...prev, isOpen: false }));
  }, []);

  const nextLightboxImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLightbox(prev => ({ ...prev, index: (prev.index + 1) % imagesList.length }));
  }, [imagesList.length]);

  const prevLightboxImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLightbox(prev => ({
      ...prev,
      index: prev.index === 0 ? imagesList.length - 1 : prev.index - 1
    }));
  }, [imagesList.length]);

  useEffect(() => {
    if (!lightbox.isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightboxImage();
      if (e.key === 'ArrowLeft') prevLightboxImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightbox.isOpen, closeLightbox, nextLightboxImage, prevLightboxImage]);

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;

    const cartItem = {
      id: product.id,
      product_id: product.id,
      title: product.title,
      price: product.price,
      mrp: product.mrp || product.price,
      image: (product.images && product.images[0]) || product.image || selectedMedia,
      size: selectedSize || 'Free Size',
      weight_kg: activeVariant?.weight_kg || 0.5,
      quantity: quantity
    };

    try {
      const existingCart = JSON.parse(localStorage.getItem('sastabazar_cart') || '[]');
      const existingIndex = existingCart.findIndex(
        (item: any) => (item.id === cartItem.id || item.product_id === cartItem.product_id) && item.size === cartItem.size
      );

      if (existingIndex > -1) {
        existingCart[existingIndex].quantity += quantity;
      } else {
        existingCart.push(cartItem);
      }

      localStorage.setItem('sastabazar_cart', JSON.stringify(existingCart));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('cartUpdated'));

      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2200);
    } catch (e) {
      console.error('Cart error:', e);
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    handleAddToCart();
    router.push('/checkout');
  };

  const toggleWishlist = () => {
    if (!product) return;
    try {
      let wishlist = JSON.parse(localStorage.getItem('sastabazar_wishlist') || '[]');
      const exists = wishlist.some((item: any) => item.id === product.id || item.product_id === product.id);

      if (exists) {
        wishlist = wishlist.filter((item: any) => (item.id || item.product_id) !== product.id);
        setIsWishlisted(false);
      } else {
        wishlist.push({
          id: product.id,
          product_id: product.id,
          title: product.title,
          price: product.price,
          mrp: product.mrp,
          image: imagesList[0]
        });
        setIsWishlisted(true);
      }

      localStorage.setItem('sastabazar_wishlist', JSON.stringify(wishlist));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Wishlist error:', e);
    }
  };

  const checkDeliveryPincode = () => {
    const trimmed = pincode.trim();
    if (trimmed.length === 6 && /^\d+$/.test(trimmed)) {
      setPincodeStatus('valid');
    } else {
      setPincodeStatus('invalid');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 w-full animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-8" />
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-4">
              <div className="flex sm:flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-xl" />
                ))}
              </div>
              <div className="flex-1 aspect-square bg-gray-200 rounded-2xl" />
            </div>
            <div className="lg:col-span-6 space-y-6">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-10 bg-gray-200 rounded w-48" />
              <div className="h-12 bg-gray-200 rounded-2xl" />
              <div className="h-14 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (errorMsg || !product) {
    return (
      <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between">
        <Header />
        <div className="max-w-xl mx-auto py-24 px-4 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Product Not Found</h2>
          <p className="text-xs text-gray-500">{errorMsg || 'The requested product is currently unavailable.'}</p>
          <Link
            href="/"
            className="inline-block mt-4 px-6 py-3 bg-indigo-950 text-white font-bold text-xs rounded-xl shadow-md hover:bg-indigo-900 transition"
          >
            Back to Storefront
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const amazonUrl = sanitizeMarketplaceUrl(product.amazon_url);
  const flipkartUrl = sanitizeMarketplaceUrl(product.flipkart_url);
  const meeshoUrl = sanitizeMarketplaceUrl(product.meesho_url);
  const otherUrl = sanitizeMarketplaceUrl(product.other_marketplace_url);
  const otherName = sanitizeMarketplaceName(product.other_marketplace_name, 'Marketplace');
  const hasExternalLinks = Boolean(amazonUrl || flipkartUrl || meeshoUrl || otherUrl);

  return (
    <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-6 flex-wrap">
            <Link href="/" className="hover:text-indigo-950 font-medium transition">Home</Link>
            <ChevronRight size={12} className="text-gray-400" />
            <Link 
              href={`/category/${encodeURIComponent(product.category)}`}
              className="hover:text-indigo-950 font-medium transition capitalize"
            >
              {product.category || 'Collection'}
            </Link>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="font-bold text-gray-800 truncate max-w-xs">{product.title}</span>
          </nav>

          {/* Product Showcase Card */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-8 lg:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Gallery Column */}
            <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-4">
              
              {/* Thumbnail Strip: Displays video ONLY IF videoSource exists */}
              {(imagesList.length > 1 || videoSource) && (
                <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto max-h-[500px] scrollbar-none py-1">
                  {imagesList.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedMedia(img); setMediaType('image'); }}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all duration-200 cursor-pointer ${
                        selectedMedia === img && mediaType === 'image'
                          ? 'border-orange-500 ring-2 ring-orange-100 shadow-xs scale-98'
                          : 'border-gray-200 hover:border-gray-300 opacity-80 hover:opacity-100'
                      }`}
                      aria-label={`View thumbnail ${idx + 1}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}

                  {/* Optional Video Thumbnail (Completely omitted if no video exists) */}
                  {videoSource && (
                    <button
                      onClick={() => { setSelectedMedia(videoSource); setMediaType('video'); }}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 relative bg-gray-900 flex items-center justify-center transition-all cursor-pointer ${
                        mediaType === 'video' 
                          ? 'border-orange-500 ring-2 ring-orange-100 shadow-xs' 
                          : 'border-gray-200 opacity-80 hover:opacity-100'
                      }`}
                      aria-label="View product demonstration video"
                    >
                      <video src={videoSource} className="w-full h-full object-cover opacity-50 pointer-events-none" />
                      <PlayCircle className="absolute text-white" size={24} />
                    </button>
                  )}
                </div>
              )}

              {/* Main Viewport */}
              <div 
                className="flex-1 bg-gray-50/70 rounded-2xl overflow-hidden border border-gray-200/80 relative aspect-square sm:aspect-[4/5] flex items-center justify-center group cursor-zoom-in select-none"
                onClick={() => {
                  if (mediaType === 'image') {
                    openLightbox(selectedMedia || imagesList[0]);
                  }
                }}
              >
                {mediaType === 'image' ? (
                  <>
                    <img 
                      src={selectedMedia || imagesList[0]} 
                      alt={product.title} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                    />
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition shadow-sm">
                      <Eye size={13} /> Click to expand
                    </div>
                  </>
                ) : (
                  <video 
                    src={selectedMedia} 
                    controls 
                    autoPlay 
                    muted
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                )}

                <span className="absolute top-4 left-4 bg-indigo-950/90 backdrop-blur-xs text-white text-[10px] font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider shadow-xs">
                  {product.category || 'General'}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist();
                  }}
                  className="absolute top-4 right-4 w-9 h-9 bg-white/90 hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer"
                  aria-label="Add to wishlist"
                >
                  <Heart 
                    size={18} 
                    className={isWishlisted ? 'fill-red-500 text-red-500 transition-colors' : 'text-gray-600 transition-colors'} 
                  />
                </button>
              </div>

            </div>

            {/* Details & Actions Column */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                <div>
                  {product.brand && (
                    <span className="text-[11px] font-black uppercase tracking-widest text-orange-600">
                      {product.brand}
                    </span>
                  )}
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 leading-snug mt-0.5">
                    {product.title}
                  </h1>

                  <div className="flex items-center gap-2.5 mt-2.5">
                    <div className="flex items-center bg-green-700 text-white text-xs px-2.5 py-0.5 rounded-lg font-bold gap-1 shadow-2xs">
                      <span>4.5</span> <Star size={11} fill="white" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Verified Customer Feedback</span>
                  </div>
                </div>

                {/* Price Box */}
                <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 flex items-baseline justify-between flex-wrap gap-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-indigo-950">₹{priceVal}</span>
                    {mrpVal > priceVal && (
                      <>
                        <span className="text-sm text-gray-400 line-through font-semibold">₹{mrpVal}</span>
                        <span className="text-xs font-black text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-md">
                          {discountPct}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">
                    Inclusive of all GST ({product.gst_rate ?? 5}%)
                  </span>
                </div>

                {/* Variants */}
                {variants.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Select Variant / Size:
                      </label>
                      {activeVariant && (
                        <span className={`text-xs font-bold ${activeVariant.available_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {activeVariant.available_quantity > 0 
                            ? `${activeVariant.available_quantity} Units Available` 
                            : 'Out of Stock'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {variants.map(v => {
                        const isSelected = selectedSize === v.size;
                        const isStocked = v.available_quantity > 0;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={!isStocked}
                            onClick={() => setSelectedSize(v.size)}
                            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-950 text-white border-indigo-950 shadow-xs ring-2 ring-indigo-950/15'
                                : isStocked
                                ? 'bg-white text-gray-800 border-gray-200 hover:border-gray-400'
                                : 'bg-gray-100 text-gray-400 border-gray-200 line-through cursor-not-allowed'
                            }`}
                          >
                            {v.size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center gap-4 pt-1">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Quantity:</span>
                  <div className="inline-flex items-center border border-gray-200 rounded-xl bg-white shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="px-3 py-1.5 text-gray-700 hover:bg-gray-50 font-bold text-sm transition disabled:opacity-40"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-4 text-xs font-bold text-gray-900 min-w-[28px] text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(maxAvailableStock, quantity + 1))}
                      disabled={quantity >= maxAvailableStock || isOutOfStock}
                      className="px-3 py-1.5 text-gray-700 hover:bg-gray-50 font-bold text-sm transition disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className="w-full py-3.5 px-4 bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer active:scale-98"
                  >
                    {addedToCart ? <Check size={16} className="text-green-400" /> : <ShoppingCart size={16} />}
                    <span>{addedToCart ? 'Added to Cart!' : 'Add to Cart'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={isOutOfStock}
                    className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer active:scale-98"
                  >
                    <Zap size={16} />
                    <span>Buy Now</span>
                  </button>
                </div>

                {/* Pincode Check */}
                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-indigo-950" />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Delivery & Pincode Check</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        maxLength={6}
                        value={pincode}
                        onChange={e => setPincode(e.target.value)}
                        placeholder="Enter 6-digit Pincode"
                        className="w-full pl-8 pr-3 py-2 text-xs border rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={checkDeliveryPincode}
                      className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
                    >
                      Check
                    </button>
                  </div>

                  {pincodeStatus === 'valid' && (
                    <p className="text-[11px] font-bold text-green-700 flex items-center gap-1">
                      <Check size={13} /> Serviceable! Fast doorstep delivery with GST invoice.
                    </p>
                  )}
                  {pincodeStatus === 'invalid' && (
                    <p className="text-[11px] font-bold text-red-500">
                      Please enter a valid 6-digit postal pincode.
                    </p>
                  )}
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs text-gray-600">
                  <div className="flex flex-col items-center gap-1 p-2.5 bg-white rounded-xl border border-gray-200">
                    <Truck size={18} className="text-indigo-950" />
                    <span className="text-[10px] font-bold">Fast Dispatch</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2.5 bg-white rounded-xl border border-gray-200">
                    <ShieldCheck size={18} className="text-green-600" />
                    <span className="text-[10px] font-bold">100% Genuine</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2.5 bg-white rounded-xl border border-gray-200">
                    <RotateCcw size={18} className="text-orange-500" />
                    <span className="text-[10px] font-bold">7-Day Return</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Description & Specifications */}
          {product.description && (
            <div className="mt-10 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText size={18} className="text-indigo-950" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Product Specifications & Details
                </h3>
              </div>
              <div className="text-xs sm:text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {product.description}
              </div>
              {product.hsn_code && (
                <div className="pt-2 text-xs text-gray-400 font-mono">
                  HSN: {product.hsn_code} | Tax Rate: {product.gst_rate ?? 5}%
                </div>
              )}
            </div>
          )}

          {/* Marketplace Links */}
          {hasExternalLinks && (
            <div className="mt-8 bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-3">
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Also Available On
                </h4>
                <p className="text-[11px] text-gray-500">
                  Compare prices and verified reviews on leading e-commerce platforms
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {amazonUrl && (
                  <a
                    href={amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition shadow-2xs"
                  >
                    Buy on Amazon <ExternalLink size={12} className="text-amber-700" />
                  </a>
                )}

                {flipkartUrl && (
                  <a
                    href={flipkartUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition shadow-2xs"
                  >
                    Buy on Flipkart <ExternalLink size={12} className="text-blue-700" />
                  </a>
                )}

                {meeshoUrl && (
                  <a
                    href={meeshoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-pink-900 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl transition shadow-2xs"
                  >
                    Buy on Meesho <ExternalLink size={12} className="text-pink-700" />
                  </a>
                )}

                {otherUrl && (
                  <a
                    href={otherUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl transition shadow-2xs"
                  >
                    Buy on {otherName} <ExternalLink size={12} className="text-gray-600" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Similar Products */}
          {similarProducts.length > 0 && (
            <div className="mt-14 space-y-6">
              <div>
                <h3 className="text-xl font-black text-indigo-950">You May Also Like</h3>
                <p className="text-xs text-gray-500">Popular items from the {product.category || 'same'} collection</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {similarProducts.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <Footer />

      {/* Lightbox Modal */}
      {lightbox.isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center backdrop-blur-sm transition-opacity"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-center z-50">
            <span className="text-white font-bold tracking-widest text-xs sm:text-sm bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
              {lightbox.index + 1} / {imagesList.length}
            </span>
            <button 
              type="button"
              onClick={closeLightbox} 
              className="text-white bg-white/10 hover:bg-white/20 p-2.5 sm:p-3 rounded-full transition backdrop-blur-md cursor-pointer shadow-lg"
              aria-label="Close fullscreen viewer"
            >
              <X size={24} />
            </button>
          </div>

          {imagesList.length > 1 && (
            <>
              <button 
                type="button"
                onClick={prevLightboxImage} 
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 sm:p-4 rounded-full transition backdrop-blur-md z-50 cursor-pointer shadow-lg"
                aria-label="Previous product image"
              >
                <ChevronLeft size={30} />
              </button>
              <button 
                type="button"
                onClick={nextLightboxImage} 
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 sm:p-4 rounded-full transition backdrop-blur-md z-50 cursor-pointer shadow-lg"
                aria-label="Next product image"
              >
                <ChevronRight size={30} />
              </button>
            </>
          )}

          <div 
            className="w-full h-full p-4 sm:p-12 md:p-20 flex items-center justify-center cursor-zoom-out"
            onClick={closeLightbox}
          >
            <img 
              src={imagesList[lightbox.index]} 
              alt={`Product preview ${lightbox.index + 1}`} 
              className="max-w-full max-h-full object-contain select-none shadow-2xl transition-transform duration-200" 
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </main>
  );
}