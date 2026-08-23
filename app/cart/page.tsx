'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    const loadCart = () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sastabazar_cart');
        if (saved) {
          try {
            setCart(JSON.parse(saved));
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
    const newQty = (updated[index].quantity || 1) + delta;
    if (newQty > 0) {
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
    (sum, item) => sum + Number(item.price || 0) * (Number(item.quantity) || 1),
    0
  );

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-900 hover:underline bg-white px-4 py-2 rounded-xl border shadow-sm"
            >
              <ArrowLeft size={16} /> Continue Shopping
            </Link>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-indigo-950 mb-8 flex items-center gap-3">
            <ShoppingCart className="text-orange-500" size={32} /> Shopping Cart ({cart.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0)} items)
          </h1>

          {cart.length === 0 ? (
            <div className="bg-white rounded-3xl border p-12 text-center shadow-sm max-w-lg mx-auto">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart size={36} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Your Cart is Empty</h3>
              <p className="text-sm text-gray-500 mt-2">Explore our products and add them to your cart.</p>
              <Link
                href="/"
                className="mt-6 inline-block bg-indigo-950 hover:bg-indigo-900 text-white font-bold py-3 px-8 rounded-2xl transition shadow-lg text-sm"
              >
                Shop Now
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-4">
                {cart.map((item, idx) => {
                  const imageUrl = resolveStorefrontImageSrc(item.image || (item.images && item.images[0]));
                  const qty = Number(item.quantity) || 1;
                  const price = Number(item.price) || 0;

                  return (
                    <div
                      key={`${item.id || item.product_id || idx}-${item.size || ''}`}
                      className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-4"
                    >
                      <Image
                        src={imageUrl}
                        alt={item.title || 'Cart item'}
                        width={96}
                        height={96}
                        sizes="96px"
                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border flex-shrink-0"
                      />

                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900">{item.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Size: <span className="font-bold text-indigo-950">{item.size || 'Free Size'}</span>
                        </p>
                        <p className="text-base font-black text-indigo-950 mt-1">₹{price.toLocaleString('en-IN')}</p>
                      </div>

                      <div className="flex items-center border rounded-xl overflow-hidden bg-gray-50 shadow-inner">
                        <button
                          onClick={() => updateQuantity(idx, -1)}
                          className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 font-bold"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-4 text-xs font-bold text-gray-900">{qty}</span>
                        <button
                          onClick={() => updateQuantity(idx, 1)}
                          className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 font-bold"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm sm:text-base font-black text-orange-600">
                          ₹{(price * qty).toLocaleString('en-IN')}
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(idx)}
                        className="text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition"
                        title="Remove Item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="lg:col-span-4">
                <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm sticky top-24 space-y-4">
                  <h3 className="text-lg font-bold text-indigo-950 border-b pb-3">Price Details</h3>

                  <div className="space-y-3 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Bag Subtotal</span>
                      <span className="font-bold text-gray-800">
                        ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-4">
                      <span>Delivery Charge</span>
                      <span className="font-bold text-orange-600 text-right">
                        Calculated after PIN verification
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-4">
                      <span>COD Charge</span>
                      <span className="font-bold text-gray-700 text-right">
                        Calculated at checkout
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-4 text-base font-black text-indigo-950 border-t">
                    <span>Cart Subtotal</span>
                    <span className="text-2xl text-orange-600">
                      ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Final payable amount is calculated on the checkout page after PIN verification using the current product price, applicable discount, delivery charge and COD charge where applicable. GST is included in product pricing.
                  </p>

                  <div className="bg-indigo-50 rounded-2xl p-3 border border-indigo-100 text-[11px] text-indigo-950">
                    <p className="font-bold mb-0.5">GSTIN: 24AKBPD1704F1Z1</p>
                    <p className="text-gray-600">Tax invoice will be generated after the order is placed.</p>
                  </div>

                  <button
                    onClick={() => router.push('/checkout')}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg text-sm"
                  >
                    Proceed to Checkout
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
