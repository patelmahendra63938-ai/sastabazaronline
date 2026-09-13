'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { Heart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedWishlist = localStorage.getItem('sastabazar_wishlist');
      if (savedWishlist) {
        try {
          setWishlist(JSON.parse(savedWishlist));
        } catch (e) {
          setWishlist([]);
        }
      }
    }
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between" suppressHydrationWarning>
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="order-1 flex items-center gap-2 text-xl font-black text-indigo-950 sm:order-2 sm:text-2xl">
              <Heart className="shrink-0 text-red-500" size={24} fill="currentColor" />
              <span className="break-words">My Wishlist ({wishlist.length})</span>
            </h1>
            <Link href="/" className="order-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-xs font-bold text-indigo-900 shadow-sm transition hover:underline sm:order-1 sm:w-auto">
              <ArrowLeft size={16} /> Continue Shopping
            </Link>
          </div>

          {wishlist.length === 0 ? (
            <div className="my-8 space-y-4 rounded-3xl border border-gray-200 bg-white p-7 text-center shadow-sm sm:my-12 sm:p-12">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Heart size={32} />
              </div>
              <h3 className="text-lg font-bold text-indigo-950">Your Wishlist is Empty</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Save your favorite products to your wishlist and shop them anytime!
              </p>
              <Link href="/" className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-indigo-950 px-8 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-indigo-900 sm:w-auto">
                Explore Products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
              {wishlist.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
