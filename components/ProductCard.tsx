'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Check } from 'lucide-react';
import { Campaign, calculateDiscountedPrice } from '@/lib/promotions';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';

export interface Product {
  id: string;
  title: string;
  price: number;
  mrp?: number | null;
  category?: string;
  images?: string[] | null;
  image?: string | null;
  stock?: number | null;
}

interface ProductCardProps {
  product: Product;
  activeCampaigns?: Campaign[];
  priorityImage?: boolean;
}

export default function ProductCard({
  product,
  activeCampaigns = [],
  priorityImage = false,
}: ProductCardProps) {
  const [added, setAdded] = useState(false);

  const rawImageUrl =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : product.image;

  const imageUrl = resolveStorefrontImageSrc(rawImageUrl);

  const originalPrice = Number(product.price || product.mrp || 0);

  const { finalPrice, appliedOffer } = calculateDiscountedPrice(
    originalPrice,
    activeCampaigns,
    product.category,
    product.id
  );

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const existing = JSON.parse(
        localStorage.getItem('sastabazar_cart') || '[]'
      );

      const itemIndex = existing.findIndex(
        (item: any) => (item.id || item.product_id) === product.id
      );

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
        existing[itemIndex].applied_offer_label =
          cartItem.applied_offer_label;
      } else {
        existing.push(cartItem);
      }

      localStorage.setItem(
        'sastabazar_cart',
        JSON.stringify(existing)
      );

      window.dispatchEvent(new Event('cartUpdated'));

      setAdded(true);

      setTimeout(() => {
        setAdded(false);
      }, 2000);
    } catch (err) {
      console.error('Add to cart error:', err);
    }
  };

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#ead8b8] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d7aa5b] hover:shadow-xl">
      <Link
        href={`/product/${product.id}`}
        className="relative block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b]"
        aria-label={`View ${product.title}`}
      >
        <div className="relative aspect-square overflow-hidden bg-[#fffaf5]">
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 640px) calc(50vw - 24px), (max-width: 1024px) 33vw, 25vw"
            loading={priorityImage ? 'eager' : 'lazy'}
            fetchPriority={priorityImage ? 'high' : 'auto'}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {appliedOffer && (
            <span className="absolute left-2.5 top-2.5 rounded-md bg-[#741f23] px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
              {appliedOffer.offerLabel}
            </span>
          )}
        </div>

        <div className="space-y-1.5 p-3.5">
          {product.category && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#b5843d]">
              {product.category}
            </p>
          )}

          <h3 className="line-clamp-2 text-xs font-bold text-stone-900 transition group-hover:text-[#741f23] sm:text-sm">
            {product.title}
          </h3>

          <div className="pt-1">
            {appliedOffer ? (
              <div className="space-y-0.5">
                <div className="text-[11px] text-stone-500 line-through">
                  ₹{originalPrice.toLocaleString('en-IN')}
                </div>

                <div className="text-[11px] font-black text-green-800">
                  {appliedOffer.offerLabel}
                </div>

                <div className="text-base font-black text-[#741f23]">
                  ₹{finalPrice.toLocaleString('en-IN')}
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-base font-black text-[#741f23]">
                  ₹{originalPrice.toLocaleString('en-IN')}
                </span>

                {product.mrp &&
                  Number(product.mrp) > originalPrice && (
                    <span className="text-[11px] text-stone-500 line-through">
                      ₹{Number(product.mrp).toLocaleString('en-IN')}
                    </span>
                  )}
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="p-3.5 pt-0">
        <button
          type="button"
          onClick={handleAddToCart}
          aria-label={`${added ? 'Added' : 'Add'} ${
            product.title
          } to cart`}
          className={`flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-white shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b] focus-visible:ring-offset-2 ${
            added
              ? 'bg-green-700 hover:bg-green-800'
              : 'bg-[#741f23] hover:bg-[#5e171b]'
          }`}
        >
          {added ? (
            <Check
              size={14}
              className="text-white"
              aria-hidden="true"
            />
          ) : (
            <ShoppingCart size={14} aria-hidden="true" />
          )}

          <span>{added ? 'Added!' : 'Add to Cart'}</span>
        </button>
      </div>
    </div>
  );
}