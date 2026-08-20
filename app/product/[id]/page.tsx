'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard, { Product } from '@/components/ProductCard';
import { SellerMarketplaceTrust } from '@/components/SellerMarketplaceTrust';
import { supabase } from '@/lib/supabase';
import { sanitizeMarketplaceUrl, sanitizeMarketplaceName } from '@/lib/utils';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';
import { 
  getActiveCampaigns, 
  calculateDiscountedPrice, 
  Campaign, 
  OfferOption 
} from '@/lib/promotions';
import { 
  ShoppingCart, Zap, Truck, ShieldCheck, RotateCcw, Star, Check, 
  Heart, ExternalLink, ChevronRight, ChevronLeft, X, Plus, Minus, 
  AlertCircle, Eye, MapPin, FileText, PlayCircle, Globe, Tag, 
  Share2, Sparkles, History, CheckCircle2, Copy, CheckCheck, PackageCheck
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
  net_weight?: number | string | null;
  style_code?: string | null;
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

  // --- Main Product & Data States ---
  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Interaction & Media States ---
  const [selectedMedia, setSelectedMedia] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [selectedSize, setSelectedSize] = useState<string>('Standard');
  const [quantity, setQuantity] = useState<number>(1);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [addedToCart, setAddedToCart] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // --- Offer & Promotion States ---
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');
  const [couponError, setCouponError] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  // --- Pincode Checker State ---
  const [pincode, setPincode] = useState<string>('');
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  // --- Full-Screen Lightbox Modal State ---
  const [lightbox, setLightbox] = useState<{ isOpen: boolean; index: number }>({
    isOpen: false,
    index: 0
  });

  // 1. Initial Data Fetching
  useEffect(() => {
    async function loadProductData() {
      if (!productId) return;
      setLoading(true);
      setErrorMsg(null);

      try {
        // A. Fetch current product record
        const { data: prodData, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (prodErr || !prodData) {
          throw new Error('Product not found or currently unavailable on SASTABAZARONLINE.');
        }

        setProduct(prodData);

        const initialImg = (prodData.images && prodData.images.length > 0)
          ? prodData.images[0]
          : prodData.image;
        setSelectedMedia(resolveStorefrontImageSrc(initialImg));
        setMediaType('image');

        // B. Fetch active promotions & campaigns
        const { data: rawPromos } = await supabase
          .from('promotions')
          .select('*')
          .eq('is_enabled', true);

        const activePromos = getActiveCampaigns(rawPromos || []);
        setActiveCampaigns(activePromos);

        // C. Sync Wishlist from LocalStorage
        if (typeof window !== 'undefined') {
          try {
            const wishlist = JSON.parse(localStorage.getItem('sastabazar_wishlist') || '[]');
            setIsWishlisted(wishlist.some((item: any) => item.id === prodData.id || item.product_id === prodData.id));
          } catch {
            setIsWishlisted(false);
          }
        }

        // D. Fetch Inventory & Multi-Size Variants
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

        // E. Manage Recently Viewed Items in LocalStorage
        if (typeof window !== 'undefined') {
          try {
            const recent = localStorage.getItem('sastabazar_recent');
            let recentList = recent ? JSON.parse(recent) : [];
            recentList = recentList.filter((p: any) => p.id !== prodData.id);
            recentList.unshift({
              id: prodData.id,
              title: prodData.title,
              price: prodData.price,
              mrp: prodData.mrp ?? null,
              category: prodData.category,
              image: resolveStorefrontImageSrc(prodData.images?.[0] || prodData.image || initialImg),
            });
            if (recentList.length > 6) recentList.pop();
            localStorage.setItem('sastabazar_recent', JSON.stringify(recentList));
            setRecentlyViewed(recentList.filter((p: any) => p.id !== prodData.id));
          } catch (e) {
            console.error('Recently viewed storage error:', e);
          }
        }

        // F. Fetch Similar Category Products
        const { data: similar } = await supabase
          .from('products')
          .select('id, title, price, mrp, category, images, stock')
          .eq('is_active', true)
          .eq('category', prodData.category || 'General')
          .neq('id', productId)
          .limit(4);

        setSimilarProducts(similar || []);

      } catch (err: any) {
        console.error('Error loading product details:', err);
        setErrorMsg(err.message || 'Failed to load product details.');
      } finally {
        setLoading(false);
      }
    }

    loadProductData();
  }, [productId]);

  // Derived Media Lists
  const imagesList: string[] = product?.images && product.images.length > 0
    ? product.images.map((image: string) => resolveStorefrontImageSrc(image))
    : product?.image
      ? [resolveStorefrontImageSrc(product.image)]
      : [resolveStorefrontImageSrc(null)];

  const videoSource = product?.video || product?.video_url || null;

  // Active Variant & Stock Analysis
  const activeVariant = variants.find(v => v.size === selectedSize);
  const maxAvailableStock = variants.length > 0 
    ? (activeVariant ? activeVariant.available_quantity : 0)
    : (product?.stock ?? 99);
  const isOutOfStock = maxAvailableStock <= 0;

  // 2. Strict Pricing & Single-Offer Calculation
  const originalPrice = product ? Number(product.price || 0) : 0;
  const mrpVal = product?.mrp ? Number(product.mrp) : Math.round(originalPrice * 1.35);

  const { finalPrice, appliedOffer, availableOffers } = calculateDiscountedPrice(
    originalPrice,
    activeCampaigns,
    product?.category || '',
    product?.id,
    appliedCoupon,
    selectedCampaignId
  );

  const totalDiscountAmount = Math.max(0, originalPrice - finalPrice);
  const totalMrpDiscountPct = mrpVal > finalPrice && mrpVal > 0 
    ? Math.round(((mrpVal - finalPrice) / mrpVal) * 100) 
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

  // Keyboard navigation & scroll locking for lightbox
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

  // Coupon Submission Handler
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    const matchedCampaign = activeCampaigns.find(
      c => c.coupon_code && c.coupon_code.toUpperCase() === code
    );

    if (!matchedCampaign) {
      setCouponError('Invalid or expired coupon code for this product.');
      return;
    }

    setAppliedCoupon(code);
    setSelectedCampaignId(matchedCampaign.id);
    setCouponInput('');
  };

  // Add to Cart Action
  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;

    const cartItem = {
      id: product.id,
      product_id: product.id,
      title: product.title,
      price: finalPrice,
      original_price: originalPrice,
      mrp: mrpVal,
      applied_offer_label: appliedOffer?.offerLabel || null,
      selected_campaign_id: appliedOffer?.campaignId || null,
      image: (product.images && product.images[0]) || product.image || selectedMedia,
      size: selectedSize || 'Free Size',
      weight_kg: activeVariant?.weight_kg || 0.5,
      quantity: quantity,
      hsn_code: product.hsn_code || '6204',
      gst_rate: product.gst_rate || 5
    };

    try {
      const existingCart = JSON.parse(localStorage.getItem('sastabazar_cart') || '[]');
      const existingIndex = existingCart.findIndex(
        (item: any) => (item.id === cartItem.id || item.product_id === cartItem.product_id) && item.size === cartItem.size
      );

      if (existingIndex > -1) {
        existingCart[existingIndex].quantity += quantity;
        existingCart[existingIndex].price = finalPrice;
        existingCart[existingIndex].applied_offer_label = cartItem.applied_offer_label;
        existingCart[existingIndex].selected_campaign_id = cartItem.selected_campaign_id;
      } else {
        existingCart.push(cartItem);
      }

      localStorage.setItem('sastabazar_cart', JSON.stringify(existingCart));
      window.dispatchEvent(new Event('cartUpdated'));

      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2200);
    } catch (e) {
      console.error('Cart synchronization error:', e);
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
          price: finalPrice,
          mrp: mrpVal,
          image: imagesList[0]
        });
        setIsWishlisted(true);
      }

      localStorage.setItem('sastabazar_wishlist', JSON.stringify(wishlist));
      window.dispatchEvent(new Event('wishlistUpdated'));
    } catch (e) {
      console.error('Wishlist error:', e);
    }
  };

  const handleShareProduct = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const checkDeliveryPincode = () => {
    const trimmed = pincode.trim();
    if (trimmed.length === 6 && /^\d+$/.test(trimmed)) {
      setPincodeStatus('checking');
      setTimeout(() => {
        setPincodeStatus('valid');
      }, 400);
    } else {
      setPincodeStatus('invalid');
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 w-full animate-pulse">
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
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // Not Found Error Screen
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

  // Sanitized external marketplace URLs
  const amazonUrl = sanitizeMarketplaceUrl(product.amazon_url);
  const flipkartUrl = sanitizeMarketplaceUrl(product.flipkart_url);
  const meeshoUrl = sanitizeMarketplaceUrl(product.meesho_url);
  const otherUrl = sanitizeMarketplaceUrl(product.other_marketplace_url);
  const otherName = sanitizeMarketplaceName(product.other_marketplace_name, 'Official Website');
  const hasExternalLinks = Boolean(amazonUrl || flipkartUrl || meeshoUrl || otherUrl);

  return (
    <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          
          {/* Breadcrumb Navigation */}
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

          {/* Product Showcase Master Card */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-8 lg:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* LEFT COLUMN: Gallery Viewport & Thumbnails */}
            <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-4">
              
              {/* Thumbnail Strip */}
              {(imagesList.length > 1 || videoSource) && (
                <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto max-h-[520px] scrollbar-none py-1">
                  {imagesList.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedMedia(img); setMediaType('image'); }}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all duration-200 cursor-pointer ${
                        selectedMedia === img && mediaType === 'image'
                          ? 'border-orange-500 ring-2 ring-orange-100 shadow-xs scale-98'
                          : 'border-gray-200 hover:border-gray-300 opacity-80 hover:opacity-100'
                      }`}
                      aria-label={`View thumbnail ${idx + 1}`}
                    >
                      <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                    </button>
                  ))}

                  {/* Optional Video Thumbnail */}
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
                      <PlayCircle className="absolute text-white" size={24} />
                    </button>
                  )}
                </div>
              )}

              {/* Main Viewport Container */}
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
                    <Image
                      src={selectedMedia || imagesList[0]} 
                      alt={product.title} 
                      fill
                      sizes="(max-width: 1024px) calc(100vw - 2rem), 42vw"
                      fetchPriority="high"
                      className="object-cover transition-transform duration-300 group-hover:scale-103"
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

                {/* Badges Overlay */}
                <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                  <span className="bg-indigo-950/90 backdrop-blur-xs text-white text-[10px] font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider shadow-xs">
                    {product.category || 'General'}
                  </span>
                  {appliedOffer && (
                    <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md shadow-sm">
                      {appliedOffer.offerLabel}
                    </span>
                  )}
                </div>

                {/* Wishlist & Share Quick Action Buttons */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist();
                    }}
                    className="w-9 h-9 bg-white/90 hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer"
                    aria-label="Add to wishlist"
                  >
                    <Heart 
                      size={18} 
                      className={isWishlisted ? 'fill-red-500 text-red-500 transition-colors' : 'text-gray-600 transition-colors'} 
                    />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareProduct();
                    }}
                    className="w-9 h-9 bg-white/90 hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer"
                    aria-label="Copy share link"
                  >
                    {copiedLink ? <CheckCheck size={16} className="text-green-600" /> : <Share2 size={16} />}
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Details, Pricing, Offers & Actions */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                
                {/* Brand & Title Header */}
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
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs font-semibold text-indigo-950">
                      GSTIN: 24AKBPD1704F1Z1
                    </span>
                  </div>
                </div>

                {/* PRICING PRESENTATION BOX */}
                <div className="p-5 bg-gray-50/90 rounded-2xl border border-gray-200 space-y-1.5">
                  {appliedOffer ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 line-through">
                          ₹{originalPrice.toLocaleString()}
                        </span>
                        {mrpVal > originalPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            MRP ₹{mrpVal.toLocaleString()}
                          </span>
                        )}
                      </div>
                      
                      {/* Prominent Offer Name & Percentage */}
                      <div className="text-sm font-black text-green-700 flex items-center gap-1.5">
                        <Tag size={15} />
                        <span>{appliedOffer.offerLabel}</span>
                      </div>

                      {/* Final Price After Offer */}
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-3xl sm:text-4xl font-black text-indigo-950">
                          ₹{finalPrice.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-500">
                          Inclusive of all GST ({product.gst_rate ?? 5}%)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                      <div className="flex items-baseline gap-3">
                        <span className="text-3xl sm:text-4xl font-black text-indigo-950">
                          ₹{originalPrice.toLocaleString()}
                        </span>
                        {mrpVal > originalPrice && (
                          <span className="text-sm text-gray-400 line-through font-semibold">
                            ₹{mrpVal.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-gray-500">
                        Inclusive of all GST ({product.gst_rate ?? 5}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* AVAILABLE OFFERS SELECTION (Select ONE Offer) */}
                {availableOffers.length > 0 && (
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 uppercase flex items-center gap-1.5">
                        <Tag size={14} className="text-indigo-600" /> Available Offers (Select One)
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold">Only one offer applies</span>
                    </div>

                    <div className="space-y-2">
                      {availableOffers.map((offer) => {
                        const isSelected = appliedOffer?.campaignId === offer.campaignId;
                        return (
                          <label
                            key={offer.campaignId}
                            onClick={() => setSelectedCampaignId(offer.campaignId)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                              isSelected 
                                ? 'bg-white border-indigo-600 shadow-xs text-indigo-950' 
                                : 'bg-transparent border-gray-200 text-gray-600 hover:bg-white/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name="product_offer_choice"
                                checked={isSelected}
                                onChange={() => setSelectedCampaignId(offer.campaignId)}
                                className="text-indigo-900 focus:ring-indigo-900"
                              />
                              <span>{offer.offerLabel}</span>
                            </div>
                            <span className="text-indigo-950 font-black">
                              ₹{offer.finalPrice.toLocaleString()}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* COUPON CODE INPUT */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 space-y-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Have a Coupon or Promo Code?</label>
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="e.g. FESTIVE15"
                      className="flex-1 px-3.5 py-2 text-xs border rounded-xl font-mono uppercase bg-gray-50 focus:bg-white outline-none"
                    />
                    <button 
                      type="submit" 
                      className="bg-indigo-950 hover:bg-indigo-900 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                  {couponError && <p className="text-xs font-bold text-red-600">{couponError}</p>}
                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-xs text-green-700 pt-1">
                      <span>Applied: <b className="font-mono">{appliedCoupon}</b></span>
                      <button 
                        type="button" 
                        onClick={() => { setAppliedCoupon(''); setSelectedCampaignId(''); }} 
                        className="text-red-500 hover:underline font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* SIZE VARIANTS SELECTOR */}
                {variants.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Select Variant / Size:
                      </label>
                      {activeVariant && (
                        <span className={`text-xs font-bold ${activeVariant.available_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {activeVariant.available_quantity > 0 
                            ? `${activeVariant.available_quantity} Units In Stock` 
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

                {/* QUANTITY SELECTOR */}
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

                {/* ACTION BUTTONS (Add to Cart / Buy Now) */}
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

                {/* PINCODE & DELIVERY ESTIMATE CHECKER */}
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

                  {pincodeStatus === 'checking' && (
                    <p className="text-[11px] font-bold text-gray-500 animate-pulse">Checking pincode serviceability...</p>
                  )}
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

                {/* TRUST BADGES */}
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

          {/* PRODUCT SPECIFICATIONS & DESCRIPTION */}
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
              
              <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500 border-t border-gray-100">
                {product.hsn_code && <div><span className="font-bold text-gray-700">HSN Code:</span> {product.hsn_code}</div>}
                <div><span className="font-bold text-gray-700">GST Rate:</span> {product.gst_rate ?? 5}%</div>
                {product.net_weight && <div><span className="font-bold text-gray-700">Weight:</span> {product.net_weight} kg</div>}
                <div><span className="font-bold text-gray-700">Dispatch:</span> Surat Warehouse</div>
              </div>
            </div>
          )}

          {/* Marketplace Trust Component Added Here on Product Page */}
          <SellerMarketplaceTrust 
            amazonUrl="https://www.amazon.in/l/27943762031?me=AXKNNYVWLT32Y&tag=ShopReferral_d451e877-492b-4a44-8989-d4151cfc4c54&ref=sf_seller_app_share_new_ls_srb"
            flipkartUrl="https://www.flipkart.com/adhyey-brothers-women-crop-top-skirt-ethnic-jacket-set/p/itm2881ff260ebcc?pid=ETHHJNJYHKNYXZPM"
            meeshoUrl="https://www.meesho.com/Adhyey?ms=2"
          />

          {/* SIMILAR PRODUCTS */}
          {similarProducts.length > 0 && (
            <div className="mt-14 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-indigo-950">You May Also Like</h3>
                  <p className="text-xs text-gray-500">Popular items from the {product.category || 'same'} collection</p>
                </div>
                <Link 
                  href={`/category/${encodeURIComponent(product.category)}`}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  View All <ChevronRight size={14} />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {similarProducts.map((item) => (
                  <ProductCard key={item.id} product={item} activeCampaigns={activeCampaigns} />
                ))}
              </div>
            </div>
          )}

          {/* RECENTLY VIEWED PRODUCTS */}
          {recentlyViewed.length > 0 && (
            <div className="mt-14 space-y-6 border-t border-gray-200 pt-10">
              <div className="flex items-center gap-2">
                <History size={20} className="text-indigo-900" />
                <h3 className="text-xl font-black text-indigo-950">Recently Viewed Items</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {recentlyViewed.map((item) => (
                  <ProductCard key={item.id} product={item} activeCampaigns={activeCampaigns} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <Footer />

      {/* LIGHTBOX FULLSCREEN MODAL */}
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
            <div className="relative w-full h-full">
              <Image
                src={imagesList[lightbox.index]}
                alt={`Product preview ${lightbox.index + 1}`}
                fill
                sizes="100vw"
                className="object-contain select-none shadow-2xl transition-transform duration-200"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[10px] text-gray-500 font-bold uppercase">Total Price</p>
          <p className="text-base font-black text-indigo-950">₹{finalPrice.toLocaleString()}</p>
        </div>
        <button 
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="flex-1 bg-indigo-950 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
        >
          <ShoppingCart size={15} /> Add to Cart
        </button>
        <button 
          onClick={handleBuyNow}
          disabled={isOutOfStock}
          className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
        >
          <Zap size={15} /> Buy Now
        </button>
      </div>
    </main>
  );
}
