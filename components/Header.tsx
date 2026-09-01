'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  Heart,
  Package,
  UserRound,
  Menu,
  Truck,
  Headphones,
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderCategory {
  name: string;
  product_count: number;
}

export default function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<HeaderCategory[]>([]);

  useEffect(() => {
    const syncCounts = () => {
      if (typeof window === 'undefined') return;

      try {
        const savedCart =
          localStorage.getItem('sastabazaronline_cart') ||
          localStorage.getItem('sastabazar_cart');
        if (savedCart) {
          const cart = JSON.parse(savedCart);
          setCartCount(
            Array.isArray(cart)
              ? cart.reduce(
                  (sum: number, item: any) =>
                    sum + Number(item?.quantity || 1),
                  0
                )
              : 0
          );
        } else {
          setCartCount(0);
        }
      } catch {
        setCartCount(0);
      }

      try {
        const savedWishlist =
          localStorage.getItem('sastabazaronline_wishlist') ||
          localStorage.getItem('sastabazar_wishlist');
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
    window.addEventListener('cartUpdated', syncCounts);
    window.addEventListener('wishlistUpdated', syncCounts);

    return () => {
      window.removeEventListener('storage', syncCounts);
      window.removeEventListener('cartUpdated', syncCounts);
      window.removeEventListener('wishlistUpdated', syncCounts);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const response = await fetch('/api/catalog/categories', {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && Array.isArray(data)) {
          setCategories(
            data.filter(
              (item): item is HeaderCategory =>
                typeof item?.name === 'string' &&
                Number(item?.product_count || 0) > 0
            )
          );
        }
      } catch {
        if (!cancelled) setCategories([]);
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const dynamicCategories = categories.filter(
    category => category.name.trim().toLowerCase() !== 'dhoti choli'
  );

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="bg-[#741f23] text-white">
        <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-between gap-4 px-4 text-[11px] font-medium sm:text-xs">
          <div className="hidden md:block">
            Welcome to Adhyey Brothers — Your Trusted Online Shopping Destination
          </div>
          <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-end">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Truck size={14} aria-hidden="true" />
              Pan India Delivery
            </span>
            <Link href="/orders" className="hidden whitespace-nowrap transition hover:text-[#f0c987] sm:inline">
              Track Order
            </Link>
            <Link href="/contact" className="flex items-center gap-1.5 whitespace-nowrap transition hover:text-[#f0c987]">
              <Headphones size={14} aria-hidden="true" />
              Help
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-[#ead8b8] bg-[#fffdf9]">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:gap-8 lg:py-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(value => !value)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#ead8b8] text-[#741f23] lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={22} />
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="ADHYEY BROTHERS home">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#c89b52] bg-[#fffaf0] sm:h-14 sm:w-14">
              <div className="absolute inset-1 rounded-full border border-[#dfbd82]" />
              <span className="relative font-serif text-xl font-bold text-[#741f23] sm:text-2xl">AB</span>
            </div>
            <div className="hidden leading-none sm:block">
              <div className="font-serif text-[19px] font-bold tracking-[0.08em] text-[#741f23] lg:text-[23px]">ADHYEY</div>
              <div className="mt-1 font-serif text-[15px] font-bold tracking-[0.18em] text-[#741f23] lg:text-[18px]">BROTHERS</div>
              <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.22em] text-[#b5843d] lg:text-[9px]">Quality • Trust • Style</div>
            </div>
          </Link>

          <form onSubmit={handleSearch} role="search" className="relative hidden flex-1 md:block">
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <div className="flex min-h-12 overflow-hidden rounded-lg border border-[#ead8b8] bg-white shadow-sm">
              <input
                id="site-search"
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for products, brands and more..."
                className="min-w-0 flex-1 bg-white px-4 text-sm text-stone-800 outline-none placeholder:text-stone-400"
              />
              <button type="submit" aria-label="Search products" className="flex w-14 items-center justify-center bg-[#741f23] text-white transition hover:bg-[#5e171b]">
                <Search size={20} />
              </button>
            </div>
          </form>

          <nav aria-label="Customer shortcuts" className="ml-auto flex items-center gap-1 sm:gap-2">
            <div className="hidden xl:block"><LanguageSwitcher /></div>
            <Link href="/account?redirectTo=/orders" className="hidden min-h-11 items-center gap-2 rounded-lg px-2 text-stone-800 transition hover:bg-[#fff2dc] lg:flex" aria-label="Login or customer account">
              <UserRound size={22} strokeWidth={1.7} />
              <div className="hidden text-[11px] font-semibold xl:block"><div>Login</div><div>/ Register</div></div>
            </Link>
            <Link href="/wishlist" className="group relative flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-stone-800 transition hover:bg-[#fff2dc]" aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ''}`}>
              <Heart size={23} strokeWidth={1.7} fill={wishlistCount > 0 ? 'currentColor' : 'none'} />
              {wishlistCount > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#741f23] px-1 text-[9px] font-bold text-white">{wishlistCount}</span>}
              <span className="ml-1 hidden text-xs font-semibold xl:inline">Wishlist</span>
            </Link>
            <Link href="/cart" className="group relative flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-stone-800 transition hover:bg-[#fff2dc]" aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}>
              <ShoppingCart size={24} strokeWidth={1.7} />
              {cartCount > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#741f23] px-1 text-[9px] font-bold text-white">{cartCount}</span>}
              <div className="ml-1 hidden text-[11px] font-semibold xl:block">
                <div>Cart</div>
                <div className="font-bold">{cartCount > 0 ? `${cartCount} item${cartCount > 1 ? 's' : ''}` : '₹0.00'}</div>
              </div>
            </Link>
            <Link href="/orders" className="hidden h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-stone-800 transition hover:bg-[#fff2dc] 2xl:flex" aria-label="My orders">
              <Package size={21} strokeWidth={1.7} />
              My Orders
            </Link>
          </nav>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-3 md:hidden">
          <form onSubmit={handleSearch} role="search" className="flex min-h-11 overflow-hidden rounded-lg border border-[#ead8b8] bg-white">
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
              className="min-w-0 flex-1 px-4 text-sm text-stone-800 outline-none"
            />
            <button type="submit" aria-label="Search products" className="flex w-12 items-center justify-center bg-[#741f23] text-white transition hover:bg-[#5e171b]">
              <Search size={18} />
            </button>
          </form>
        </div>
      </div>

      <div className="hidden border-b border-[#ead8b8] bg-white lg:block">
        <nav aria-label="Product categories" className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2">
          <Link
            href="/collections/dhoti-choli"
            className="whitespace-nowrap rounded-lg bg-[#fff7e8] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#741f23] transition hover:bg-[#fff2dc]"
          >
            Dhoti Choli
          </Link>
          {dynamicCategories.map(category => (
            <Link
              key={category.name}
              href={`/category/${encodeURIComponent(category.name)}`}
              className="whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-700 transition hover:bg-[#fff2dc] hover:text-[#741f23]"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </div>

      {mobileMenuOpen && (
        <div className="border-b border-[#ead8b8] bg-[#fffdf9] lg:hidden">
          <nav aria-label="Mobile navigation" className="mx-auto grid max-w-7xl grid-cols-2 gap-1 px-4 py-3">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-xs font-bold text-stone-800 transition hover:bg-[#fff6e9] hover:text-[#741f23]">HOME</Link>
            <Link href="/collections/dhoti-choli" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-[#fff7e8] px-3 py-3 text-xs font-black text-[#741f23] transition hover:bg-[#fff2dc]">DHOTI CHOLI</Link>
            {dynamicCategories.map(category => (
              <Link
                key={category.name}
                href={`/category/${encodeURIComponent(category.name)}`}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-xs font-bold text-stone-800 transition hover:bg-[#fff6e9] hover:text-[#741f23]"
              >
                {category.name.toUpperCase()}
              </Link>
            ))}
            <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-xs font-bold text-stone-800 transition hover:bg-[#fff6e9] hover:text-[#741f23]">MY ORDERS</Link>
            <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-xs font-bold text-stone-800 transition hover:bg-[#fff6e9] hover:text-[#741f23]">WISHLIST</Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-xs font-bold text-stone-800 transition hover:bg-[#fff6e9] hover:text-[#741f23]">CONTACT US</Link>
            <div className="col-span-2 px-3 py-2"><LanguageSwitcher /></div>
          </nav>
        </div>
      )}
    </header>
  );
}
