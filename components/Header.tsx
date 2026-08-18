'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, Heart, Package } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const syncCounts = () => {
      if (typeof window === 'undefined') return;

      // Sync Cart Count
      try {
        const savedCart = localStorage.getItem('sastabazaronline_cart') || localStorage.getItem('sastabazar_cart');
        if (savedCart) {
          const cart = JSON.parse(savedCart);
          const totalItems = cart.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
          setCartCount(totalItems);
        } else {
          setCartCount(0);
        }
      } catch {
        setCartCount(0);
      }

      // Sync Wishlist Count
      try {
        const savedWishlist = localStorage.getItem('sastabazaronline_wishlist') || localStorage.getItem('sastabazar_wishlist');
        if (savedWishlist) {
          const wishlist = JSON.parse(savedWishlist);
          setWishlistCount(Array.isArray(wishlist) ? wishlist.length : 0);
        } else {
          setWishlistCount(0);
        }
      } catch {
        setWishlistCount(0);
      }
    };

    syncCounts();
    window.addEventListener('storage', syncCounts);
    
    // Optional interval fallback to ensure it catches updates instantly
    const interval = setInterval(syncCounts, 1000);
    
    return () => {
      window.removeEventListener('storage', syncCounts);
      clearInterval(interval);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-indigo-950 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-black text-xl shadow">
              SO
            </div>
            <div>
              <span className="text-sm md:text-base font-black tracking-wider text-white">SASTABAZARONLINE</span>
              <span className="block text-[10px] text-orange-400 font-bold uppercase tracking-widest">
                Wholesale Hub (Surat)
              </span>
            </div>
          </Link>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearch} className="w-full sm:max-w-md lg:max-w-lg relative">
          <input
            type="text"
            placeholder="Search home, kitchen & fashion products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl text-xs bg-white text-gray-900 font-medium focus:outline-none shadow-inner"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-600 transition cursor-pointer"
          >
            <Search size={18} />
          </button>
        </form>

        {/* Customer Actions */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          
          {/* 🌐 Language Switcher Dropdown */}
          <LanguageSwitcher />

          {/* ❤️ Wishlist Link */}
          <Link
            href="/wishlist"
            className="relative flex items-center gap-1.5 hover:text-orange-400 transition"
            aria-label="Wishlist"
          >
            <div className="relative p-2 bg-indigo-900/80 rounded-xl border border-indigo-800">
              <Heart
                size={18}
                className="text-red-400"
                fill={wishlistCount > 0 ? 'currentColor' : 'none'}
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-indigo-950 shadow">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="hidden xl:inline text-xs font-bold">Wishlist</span>
          </Link>

          {/* 🛒 Cart Link */}
          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow"
            aria-label="Shopping Cart"
          >
            <ShoppingCart size={18} />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="bg-white text-orange-600 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
                {cartCount}
              </span>
            )}
          </Link>

          {/* 📦 Customer Orders */}
          <Link
            href="/orders"
            className="flex items-center gap-1 text-xs font-bold hover:text-orange-400 transition bg-indigo-900/50 px-3 py-2 rounded-xl border border-indigo-800"
          >
            <Package size={16} className="text-blue-400" />
            <span className="hidden sm:inline">My Orders</span>
          </Link>
          
        </div>

      </div>
    </header>
  );
}