'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingCart, UserRound } from 'lucide-react';

const hiddenRoutes = ['/admin', '/checkout'];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const syncCartCount = () => {
      if (typeof window === 'undefined') return;

      try {
        const savedCart =
          localStorage.getItem('sastabazaronline_cart') ||
          localStorage.getItem('sastabazar_cart');

        if (!savedCart) {
          setCartCount(0);
          return;
        }

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
      } catch {
        setCartCount(0);
      }
    };

    syncCartCount();
    window.addEventListener('storage', syncCartCount);
    window.addEventListener('cartUpdated', syncCartCount);

    return () => {
      window.removeEventListener('storage', syncCartCount);
      window.removeEventListener('cartUpdated', syncCartCount);
    };
  }, []);

  if (hiddenRoutes.some((route) => pathname?.startsWith(route))) {
    return null;
  }

  const items = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      active: pathname === '/',
    },
    {
      label: 'Categories',
      href: '/#mobile-shop-pills',
      icon: LayoutGrid,
      active:
        pathname?.startsWith('/category') ||
        pathname?.startsWith('/collections') ||
        pathname?.startsWith('/search'),
    },
    {
      label: 'Cart',
      href: '/cart',
      icon: ShoppingCart,
      active: pathname?.startsWith('/cart'),
      badge: cartCount,
    },
    {
      label: 'Account',
      href: '/account',
      icon: UserRound,
      active:
        pathname?.startsWith('/account') || pathname?.startsWith('/auth'),
    },
  ];

  return (
    <>
      <div
        aria-hidden="true"
        className="md:hidden"
        style={{ height: 'calc(4.15rem + env(safe-area-inset-bottom, 0px))' }}
      />

      <nav
        aria-label="Mobile storefront navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200/90 bg-white/95 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto grid min-h-[4.15rem] max-w-lg grid-cols-4 px-1">
          {items.map(({ label, href, icon: Icon, active, badge }) => (
            <Link
              key={label}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] font-bold transition ${
                active ? 'text-[#741f23]' : 'text-stone-600'
              }`}
            >
              <span className="relative flex h-7 items-center justify-center">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.8}
                  aria-hidden="true"
                />
                {typeof badge === 'number' && badge > 0 && (
                  <span className="absolute -right-3 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#741f23] px-1 text-[9px] font-black leading-none text-white ring-2 ring-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
