'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Check, ArrowRight } from 'lucide-react';
import { Campaign, calculateDiscountedPrice } from '@/lib/promotions';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';
import ProductRatingTag from '@/components/ProductRatingTag';

interface ProductInventoryItem {
  size?: string | null;
  available_quantity?: number | null;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  mrp?: number | null;
  category?: string;
  images?: string[] | null;
  image?: string | null;
  stock?: number | null;
  inventory?: ProductInventoryItem[] | null;
}

interface ProductCardProps {
  product: Product;
  activeCampaigns?: Campaign[];
  priorityImage?: boolean;
}

const SIZE_ORDER = ['XS','S','M','L','XL','XXL','XXXL','FREE SIZE','STANDARD'];

function getSizeOrder(size: string) {
  const normalized = size.trim().toUpperCase();
  const index = SIZE_ORDER.indexOf(normalized);
  return index === -1 ? SIZE_ORDER.length : index;
}

export default function ProductCard({ product, activeCampaigns = [], priorityImage = false }: ProductCardProps) {
  const [added, setAdded] = useState(false);

  const rawImageUrl = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.image;
  const imageUrl = resolveStorefrontImageSrc(rawImageUrl);
  const originalPrice = Number(product.price || product.mrp || 0);
  const mrpValue = Number(product.mrp || 0);
  const { finalPrice, appliedOffer } = calculateDiscountedPrice(originalPrice, activeCampaigns, product.category, product.id);

  const inventoryItems = Array.isArray(product.inventory) ? product.inventory : [];
  const availableInventory = inventoryItems.filter(item => Number(item.available_quantity || 0) > 0);
  const availableSizes = Array.from(new Set(availableInventory.map(item => String(item.size || '').trim()).filter(Boolean))).sort((a, b) => {
    const orderDifference = getSizeOrder(a) - getSizeOrder(b);
    return orderDifference !== 0 ? orderDifference : a.localeCompare(b);
  });

  const hasInventoryVariants = inventoryItems.length > 0;
  const hasKnownProductStock = typeof product.stock === 'number' && Number.isFinite(product.stock);
  const isOutOfStock = hasInventoryVariants ? availableInventory.length === 0 : hasKnownProductStock && Number(product.stock) <= 0;
  const canDirectAddToCart = !hasInventoryVariants && hasKnownProductStock && Number(product.stock) > 0;
  const hasRealMrp = mrpValue > 0 && mrpValue > finalPrice;
  const discountPercent = hasRealMrp ? Math.round(((mrpValue - finalPrice) / mrpValue) * 100) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canDirectAddToCart) return;

    try {
      const existing = JSON.parse(localStorage.getItem('sastabazar_cart') || '[]');
      const itemIndex = existing.findIndex((item: any) => (item.id || item.product_id) === product.id);
      const cartItem = {
        id: product.id,
        product_id: product.id,
        title: product.title,
        price: finalPrice,
        original_price: originalPrice,
        mrp: product.mrp || originalPrice,
        applied_offer_label: appliedOffer?.offerLabel || null,
        selected_campaign_id: appliedOffer?.campaignId || null,
        image: imageUrl,
        quantity: 1,
      };

      if (itemIndex > -1) {
        existing[itemIndex].quantity += 1;
        existing[itemIndex].price = finalPrice;
        existing[itemIndex].applied_offer_label = cartItem.applied_offer_label;
      } else {
        existing.push(cartItem);
      }

      localStorage.setItem('sastabazar_cart', JSON.stringify(existing));
      window.dispatchEvent(new Event('cartUpdated'));
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error('Add to cart error:', err);
    }
  };

  return (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#ead8b8] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d7aa5b] hover:shadow-xl">
      <ProductRatingTag productId={product.id} />

      <Link href={`/product/${product.id}`} className="relative block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b]" aria-label={`View ${product.title}`}>
        <div className="relative aspect-square overflow-hidden bg-[#fffaf5]">
          <Image src={imageUrl} alt={product.title} fill sizes="(max-width: 640px) calc(50vw - 24px), (max-width: 1024px) 33vw, 25vw" loading={priorityImage ? 'eager' : 'lazy'} fetchPriority={priorityImage ? 'high' : 'auto'} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          {appliedOffer && !isOutOfStock && <span className="absolute left-2.5 top-2.5 rounded-md bg-[#741f23] px-2 py-0.5 text-[10px] font-black text-white shadow-sm">{appliedOffer.offerLabel}</span>}
          {isOutOfStock && <span className="absolute left-2.5 top-2.5 rounded-md bg-stone-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">Out of Stock</span>}
          {discountPercent > 0 && !isOutOfStock && <span className="absolute right-2.5 top-2.5 rounded-md bg-[#fff7e8] px-2 py-0.5 text-[10px] font-black text-[#741f23] shadow-sm">{discountPercent}% OFF</span>}
        </div>

        <div className="space-y-2 p-3.5">
          {product.category && <p className="text-[10px] font-bold uppercase tracking-wider text-[#b5843d]">{product.category}</p>}
          <h3 className="line-clamp-2 min-h-[2.5rem] text-xs font-bold leading-5 text-stone-900 transition group-hover:text-[#741f23] sm:text-sm">{product.title}</h3>
          <div className="space-y-1 pt-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-base font-black text-[#741f23]">₹{finalPrice.toLocaleString('en-IN')}</span>
              {hasRealMrp && <span className="text-[11px] text-stone-500 line-through">₹{mrpValue.toLocaleString('en-IN')}</span>}
            </div>
            <p className="text-[10px] font-semibold text-stone-500">Inclusive of applicable GST</p>
          </div>

          {hasInventoryVariants && (
            <div className="pt-1">
              {availableSizes.length > 0 ? (
                <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {availableSizes.slice(0, 6).map(size => <span key={size} className="shrink-0 rounded-md border border-[#ead8b8] bg-[#fffaf5] px-2 py-1 text-[10px] font-bold text-stone-700">{size}</span>)}
                  {availableSizes.length > 6 && <span className="shrink-0 text-[10px] font-bold text-[#741f23]">+{availableSizes.length - 6}</span>}
                </div>
              ) : <p className="text-[10px] font-bold text-red-600">No size currently available</p>}
            </div>
          )}
        </div>
      </Link>

      <div className="p-3.5 pt-0">
        {isOutOfStock ? (
          <button type="button" disabled className="flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-xl bg-stone-200 px-3 text-xs font-bold text-stone-500">Out of Stock</button>
        ) : hasInventoryVariants ? (
          <Link href={`/product/${product.id}`} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[#741f23] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#5e171b] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b] focus-visible:ring-offset-2"><span>Select Size</span><ArrowRight size={14} aria-hidden="true" /></Link>
        ) : canDirectAddToCart ? (
          <button type="button" onClick={handleAddToCart} aria-label={`${added ? 'Added' : 'Add'} ${product.title} to cart`} className={`flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-white shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b] focus-visible:ring-offset-2 ${added ? 'bg-green-700 hover:bg-green-800' : 'bg-[#741f23] hover:bg-[#5e171b]'}`}>
            {added ? <Check size={14} className="text-white" aria-hidden="true" /> : <ShoppingCart size={14} aria-hidden="true" />}
            <span>{added ? 'Added!' : 'Add to Cart'}</span>
          </button>
        ) : (
          <Link href={`/product/${product.id}`} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#d7aa5b] bg-[#fff7e8] px-3 text-xs font-bold text-[#741f23] shadow-sm transition hover:bg-[#fff2dc] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b] focus-visible:ring-offset-2"><span>View Product</span><ArrowRight size={14} aria-hidden="true" /></Link>
        )}
      </div>
    </div>
  );
}
