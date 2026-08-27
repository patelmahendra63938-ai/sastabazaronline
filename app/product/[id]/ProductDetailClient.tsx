'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  ReceiptText,
  PhoneCall,
} from 'lucide-react';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';

export default function ProductDetailClient({ product }: { product: any }) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(
    resolveStorefrontImageSrc(product.images?.[0] || product.image)
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [selectedImage];

  const discount =
    product.mrp && product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  const handleAddToCart = () => {
    try {
      const existing = JSON.parse(
        localStorage.getItem('sastabazar_cart') || '[]'
      );

      const itemIndex = existing.findIndex(
        (item: any) => (item.id || item.product_id) === product.id
      );

      if (itemIndex > -1) {
        existing[itemIndex].quantity += quantity;
      } else {
        existing.push({
          id: product.id,
          product_id: product.id,
          title: product.title,
          price: product.price,
          mrp: product.mrp || product.price,
          image: selectedImage,
          quantity: quantity,
        });
      }

      localStorage.setItem(
        'sastabazar_cart',
        JSON.stringify(existing)
      );

      window.dispatchEvent(new Event('cartUpdated'));

      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  return (
    <div className="grid grid-cols-1 gap-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 md:grid-cols-2">
      {/* Product Image Gallery */}
      <div className="space-y-4">
        <div className="relative aspect-square overflow-hidden rounded-2xl border bg-gray-100">
          <Image
            src={resolveStorefrontImageSrc(selectedImage)}
            alt={product.title}
            fill
            sizes="(max-width: 768px) calc(100vw - 3rem), 50vw"
            fetchPriority="high"
            className="object-cover"
          />
        </div>

        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${
                  selectedImage === img
                    ? 'border-[#741f23]'
                    : 'border-gray-200'
                }`}
              >
                <Image
                  src={resolveStorefrontImageSrc(img)}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Details & Actions */}
      <div className="flex flex-col justify-between space-y-5">
        <div className="space-y-3">
          {product.category && (
            <span className="rounded-md bg-[#fff2dc] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#741f23]">
              {product.category}
            </span>
          )}

          <h1 className="text-xl font-black text-[#741f23] sm:text-2xl">
            {product.title}
          </h1>

          {/* Pricing */}
          <div className="flex items-baseline gap-3 pt-2">
            <span className="text-2xl font-black text-[#741f23] sm:text-3xl">
              ₹{Number(product.price).toLocaleString()}
            </span>

            {product.mrp && product.mrp > product.price && (
              <>
                <span className="text-sm text-gray-400 line-through">
                  ₹{Number(product.mrp).toLocaleString()}
                </span>

                <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">
                  {discount}% OFF
                </span>
              </>
            )}
          </div>

          <p className="pt-2 text-xs leading-relaxed text-gray-600">
            {product.description ||
              'Product details are provided for this listing. Please review the available images, price and product information before ordering.'}
          </p>

          {/* Quantity Selector */}
          <div className="flex items-center gap-3 pt-3">
            <label className="text-xs font-bold uppercase text-gray-700">
              Quantity:
            </label>

            <div className="flex items-center overflow-hidden rounded-xl border">
              <button
                onClick={() =>
                  setQuantity(Math.max(1, quantity - 1))
                }
                className="bg-gray-50 px-3 py-1.5 text-xs font-bold hover:bg-gray-100"
              >
                -
              </button>

              <span className="px-4 py-1.5 font-mono text-xs font-bold">
                {quantity}
              </span>

              <button
                onClick={() => setQuantity(quantity + 1)}
                className="bg-gray-50 px-3 py-1.5 text-xs font-bold hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Buttons & Trust */}
        <div className="space-y-4 border-t pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={handleAddToCart}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#741f23] py-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#5e171b]"
            >
              {added ? (
                <Check size={16} className="text-green-300" />
              ) : (
                <ShoppingCart size={16} />
              )}
              {added ? 'Added to Cart!' : 'Add to Cart'}
            </button>

            <button
              onClick={handleBuyNow}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#b5843d] py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-[#9c6f31]"
            >
              <Zap size={16} />
              Buy Now
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link
              href="/orders"
              className="flex items-center gap-2 rounded-xl border border-[#ead8b8] bg-[#fffdf9] p-3 text-left transition hover:border-[#d7b06a] hover:bg-[#fff7e8]"
            >
              <Truck
                size={16}
                className="shrink-0 text-[#741f23]"
                aria-hidden="true"
              />
              <div>
                <div className="text-[11px] font-black text-[#741f23]">
                  Tracked Delivery
                </div>
                <div className="text-[10px] leading-relaxed text-gray-500">
                  Check order status after purchase.
                </div>
              </div>
            </Link>

            <Link
              href="/return-policy"
              className="flex items-center gap-2 rounded-xl border border-[#ead8b8] bg-[#fffdf9] p-3 text-left transition hover:border-[#d7b06a] hover:bg-[#fff7e8]"
            >
              <RotateCcw
                size={16}
                className="shrink-0 text-[#741f23]"
                aria-hidden="true"
              />
              <div>
                <div className="text-[11px] font-black text-[#741f23]">
                  7-Day Return Policy
                </div>
                <div className="text-[10px] leading-relaxed text-gray-500">
                  Eligible items as per policy terms.
                </div>
              </div>
            </Link>

            <Link
              href="/payment-information"
              className="flex items-center gap-2 rounded-xl border border-[#ead8b8] bg-[#fffdf9] p-3 text-left transition hover:border-[#d7b06a] hover:bg-[#fff7e8]"
            >
              <ShieldCheck
                size={16}
                className="shrink-0 text-[#741f23]"
                aria-hidden="true"
              />
              <div>
                <div className="text-[11px] font-black text-[#741f23]">
                  Secure Checkout
                </div>
                <div className="text-[10px] leading-relaxed text-gray-500">
                  Online payment and COD information.
                </div>
              </div>
            </Link>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-[#ead8b8] bg-[#fff7e8] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <ReceiptText
                size={16}
                className="mt-0.5 shrink-0 text-[#741f23]"
                aria-hidden="true"
              />
              <div>
                <div className="text-[11px] font-black text-[#741f23]">
                  GST Invoice Information
                </div>
                <div className="text-[10px] leading-relaxed text-gray-600">
                  GST invoice details are available for eligible orders.
                </div>
              </div>
            </div>

            <Link
              href="/gst-invoice"
              className="text-[10px] font-black text-[#741f23] underline underline-offset-2"
            >
              View GST Info
            </Link>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-[#ead8b8] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <PhoneCall
                size={16}
                className="mt-0.5 shrink-0 text-[#b5843d]"
                aria-hidden="true"
              />
              <div>
                <div className="text-[11px] font-black text-[#741f23]">
                  Buying in larger quantity?
                </div>
                <div className="text-[10px] leading-relaxed text-gray-500">
                  Contact us before ordering to discuss quantity, availability,
                  applicable bulk pricing and shipping options.
                </div>
              </div>
            </div>

            <Link
              href="/contact"
              className="text-[10px] font-black text-[#741f23] underline underline-offset-2"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
