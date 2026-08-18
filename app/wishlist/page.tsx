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

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-900 hover:underline bg-white px-4 py-2 rounded-xl border shadow-sm">
              <ArrowLeft size={16} /> Continue Shopping
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-indigo-950 flex items-center gap-2">
              <Heart className="text-red-500" size={24} fill="currentColor" /> My Wishlist ({wishlist.length})
            </h1>
          </div>

          {wishlist.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm space-y-4 my-12">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Heart size={32} />
              </div>
              <h3 className="text-lg font-bold text-indigo-950">Your Wishlist is Empty</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Save your favorite products to your wishlist and shop them anytime!
              </p>
              <Link href="/" className="inline-block bg-indigo-950 hover:bg-indigo-900 text-white font-bold py-3 px-8 rounded-2xl transition shadow-lg text-xs mt-2">
                Explore Products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
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