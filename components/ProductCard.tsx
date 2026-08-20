'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Check } from 'lucide-react';
import { Campaign, calculateDiscountedPrice } from '@/lib/promotions';

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
}

export default function ProductCard({ product, activeCampaigns = [] }: ProductCardProps) {
  const [added, setAdded] = useState(false);

  // Safe image resolution supporting both string arrays and single string URLs
  const imageUrl = Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : product.image || 'https://via.placeholder.com/400x500?text=Product';

  const originalPrice = Number(product.price || product.mrp || 0);

  // Calculate dynamic discounted price and active offer details
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
      const existing = JSON.parse(localStorage.getItem('sastabazar_cart') || '[]');
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
    <div className="group bg-white rounded-2xl border border-gray-200/80 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
      <Link href={`/product/${product.id}`} className="block relative cursor-pointer">
        {/* Product Media & Top Floating Badge */}
        <div className="aspect-square bg-gray-100 overflow-hidden relative">
          <img
            src={imageUrl}
            alt={product.title}
            width={400}
            height={400}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {appliedOffer && (
            <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">
              {appliedOffer.offerLabel}
            </span>
          )}
        </div>

        {/* Product Information */}
        <div className="p-3.5 space-y-1.5">
          {product.category && (
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
              {product.category}
            </p>
          )}

          <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-indigo-900 transition">
            {product.title}
          </h3>

          {/* Pricing Presentation */}
          <div className="pt-1">
            {appliedOffer ? (
              <div className="space-y-0.5">
                <div className="text-[11px] text-gray-400 line-through">
                  ₹{originalPrice.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] font-black text-green-700">
                  {appliedOffer.offerLabel}
                </div>
                <div className="text-base font-black text-indigo-950">
                  ₹{finalPrice.toLocaleString('en-IN')}
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-base font-black text-indigo-950">
                  ₹{originalPrice.toLocaleString('en-IN')}
                </span>
                {product.mrp && Number(product.mrp) > originalPrice && (
                  <span className="text-[11px] text-gray-400 line-through">
                    ₹{Number(product.mrp).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Cart Action Button */}
      <div className="p-3.5 pt-0">
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
        >
          {added ? <Check size={14} className="text-green-400" /> : <ShoppingCart size={14} />}
          <span>{added ? 'Added!' : 'Add to Cart'}</span>
        </button>
      </div>
    </div>
  );
}
