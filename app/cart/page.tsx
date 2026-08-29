'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ShieldCheck,
  RotateCcw,
  ReceiptText,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';

const MAX_RETAIL_QTY_PER_PRODUCT_SIZE = 5;

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    const loadCart = () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sastabazar_cart');

        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const normalized = Array.isArray(parsed)
              ? parsed.map((item: any) => ({
                  ...item,
                  quantity: Math.min(
                    MAX_RETAIL_QTY_PER_PRODUCT_SIZE,
                    Math.max(1, Math.floor(Number(item?.quantity || 1)))
                  ),
                }))
              : [];

            setCart(normalized);
            localStorage.setItem('sastabazar_cart', JSON.stringify(normalized));
          } catch {
            setCart([]);
          }
        }
      }
    };

    loadCart();
  }, []);

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cart];
    const currentQty = Number(updated[index].quantity || 1);
    const newQty = Math.min(
      MAX_RETAIL_QTY_PER_PRODUCT_SIZE,
      currentQty + delta
    );

    if (newQty > 0 && newQty !== currentQty) {
      updated[index].quantity = newQty;
      setCart(updated);

      localStorage.setItem('sastabazar_cart', JSON.stringify(updated));
      window.dispatchEvent(new Event('cartUpdated'));
    }
  };

  const removeItem = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);

    setCart(updated);
    localStorage.setItem('sastabazar_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0) * (Number(item.quantity) || 1),
    0
  );

  const totalItems = cart.reduce(
    (acc, item) => acc + (Number(item.quantity) || 1),
    0
  );

  return (
    <main className="min-h-screen bg-[#fffaf5] flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-[#ead8b8] bg-[#fffdf9] px-4 py-2 text-xs font-bold text-[#741f23] shadow-sm transition hover:bg-[#fff7e8] hover:text-[#5e171b]"
            >
              <ArrowLeft size={16} />
              Continue Shopping
            </Link>
          </div>

          <h1 className="mb-8 flex items-center gap-3 text-2xl font-black text-[#741f23] sm:text-3xl">
            <ShoppingCart className="text-[#b5843d]" size={32} />
            Shopping Cart ({totalItems} items)
          </h1>

          {cart.length === 0 ? (
            <div className="mx-auto max-w-lg rounded-3xl border border-[#ead8b8] bg-[#fffdf9] p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#fff2dc] text-[#741f23]">
                <ShoppingCart size={36} />
              </div>

              <h3 className="text-xl font-bold text-[#741f23]">
                Your Cart is Empty
              </h3>

              <p className="mt-2 text-sm text-stone-500">
                Explore our products and add them to your cart.
              </p>

              <Link
                href="/"
                className="mt-6 inline-block rounded-2xl bg-[#741f23] px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#5e171b]"
              >
                Shop Now
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-8">
                {cart.map((item, idx) => {
                  const imageUrl = resolveStorefrontImageSrc(
                    item.image ||
                      (item.images && item.images[0])
                  );

                  const qty = Number(item.quantity) || 1;
                  const price = Number(item.price) || 0;

                  return (
                    <div
                      key={`${item.id || item.product_id || idx}-${item.size || ''}`}
                      className="flex flex-col items-center gap-4 rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-4 shadow-sm sm:flex-row sm:p-6"
                    >
                      <Image
                        src={imageUrl}
                        alt={item.title || 'Cart item'}
                        width={96}
                        height={96}
                        sizes="96px"
                        className="h-20 w-20 flex-shrink-0 rounded-xl border border-[#ead8b8] object-cover sm:h-24 sm:w-24"
                      />

                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-xs font-bold text-stone-900 sm:text-sm">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-xs text-stone-500">
                          Size:{' '}
                          <span className="font-bold text-[#741f23]">
                            {item.size || 'Free Size'}
                          </span>
                        </p>

                        <p className="mt-1 text-base font-black text-[#741f23]">
                          ₹{price.toLocaleString('en-IN')}
                        </p>

                        <p className="mt-1 text-[10px] font-semibold text-green-700">
                          Max 5 pcs per Product + Size
                        </p>
                        {qty >= MAX_RETAIL_QTY_PER_PRODUCT_SIZE && (
                          <Link href="/contact" className="mt-1 inline-block text-[10px] font-bold text-[#741f23] underline underline-offset-2">
                            Need more than 5? Contact us for bulk pricing & availability.
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center overflow-hidden rounded-xl border border-[#ead8b8] bg-white shadow-inner">
                        <button
                          onClick={() => updateQuantity(idx, -1)}
                          className="px-3 py-1.5 font-bold text-stone-600 transition hover:bg-[#fff2dc] hover:text-[#741f23] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Decrease quantity"
                          disabled={qty <= 1}
                        >
                          <Minus size={14} />
                        </button>

                        <span className="px-4 text-xs font-bold text-stone-900">
                          {qty}
                        </span>

                        <button
                          onClick={() => updateQuantity(idx, 1)}
                          className="px-3 py-1.5 font-bold text-stone-600 transition hover:bg-[#fff2dc] hover:text-[#741f23] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Increase quantity"
                          disabled={qty >= MAX_RETAIL_QTY_PER_PRODUCT_SIZE}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-[#b5843d] sm:text-base">
                          ₹{(price * qty).toLocaleString('en-IN')}
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(idx)}
                        className="rounded-xl p-2.5 text-red-500 transition hover:bg-red-50"
                        title="Remove Item"
                        aria-label="Remove item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="lg:col-span-4">
                <div className="sticky top-24 space-y-4 rounded-3xl border border-[#ead8b8] bg-[#fffdf9] p-6 shadow-sm">
                  <h3 className="border-b border-[#ead8b8] pb-3 text-lg font-bold text-[#741f23]">
                    Price Details
                  </h3>

                  <div className="space-y-3 text-xs text-stone-600">
                    <div className="flex justify-between">
                      <span>Bag Subtotal</span>

                      <span className="font-bold text-stone-800">
                        ₹
                        {subtotal.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <span>Delivery Charge</span>

                      <span className="text-right font-bold text-[#b5843d]">
                        Calculated after PIN verification
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <span>COD Charge</span>

                      <span className="text-right font-bold text-stone-700">
                        Calculated at checkout
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-[11px] leading-relaxed text-green-800">
                    <strong>Smart delivery tip:</strong> adding multiple lightweight products to one order can reduce the delivery cost per item because eligible items are shipped as one combined parcel.
                  </div>

                  <div className="flex items-center justify-between border-t border-[#ead8b8] py-4 text-base font-black text-[#741f23]">
                    <span>Cart Subtotal</span>

                    <span className="text-2xl text-[#b5843d]">
                      ₹
                      {subtotal.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed text-stone-500">
                    Final payable amount is calculated on the checkout page
                    after PIN verification using the current product price,
                    applicable discount, delivery charge and COD charge where
                    applicable. GST is included in product pricing.
                  </p>

                  <div className="rounded-2xl border border-[#ead8b8] bg-[#fff7e8] p-3 text-[11px] text-[#741f23]">
                    <p className="mb-0.5 font-bold">
                      GSTIN: 24AKBPD1704F1Z1
                    </p>

                    <p className="text-stone-600">
                      Tax invoice will be generated after the order is placed.
                    </p>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-[#ead8b8] bg-white p-3 text-[11px] text-stone-600">
                    <div className="flex items-start gap-2">
                      <ShieldCheck size={15} className="mt-0.5 shrink-0 text-green-600" />
                      <span><strong className="text-stone-800">Secure checkout</strong> with online payment and COD where available.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <RotateCcw size={15} className="mt-0.5 shrink-0 text-[#b5843d]" />
                      <span><strong className="text-stone-800">7-day return policy</strong> applies to eligible items as per policy terms.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ReceiptText size={15} className="mt-0.5 shrink-0 text-[#741f23]" />
                      <span><strong className="text-stone-800">GST included</strong>; tax invoice is generated after order placement.</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#ead8b8] bg-white p-3 text-[10px] leading-relaxed text-stone-600">
                    Retail checkout allows up to <strong>5 pcs of the same Product + Size</strong>. Different sizes may each have up to 5 pcs.
                    {' '}<Link href="/contact" className="font-black text-[#741f23] underline underline-offset-2">Bulk Order / Contact Us</Link>
                  </div>

                  <button
                    onClick={() => router.push('/checkout')}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#741f23] px-6 py-4 text-sm font-black text-white shadow-lg transition hover:bg-[#5e171b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b] focus-visible:ring-offset-2"
                  >
                    <ShieldCheck size={17} />
                    Proceed to Secure Checkout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
