'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const COUPON_CODE = 'WELCOME50';
const MINIMUM_ORDER = 499;
const PROMO_END_AT = Date.parse('2026-09-07T18:29:59.999Z'); // 07 Sep 2026, 23:59:59 IST

function isPromotionActive() {
  return Date.now() <= PROMO_END_AT;
}

function applyWelcome50ToCart() {
  if (typeof window === 'undefined' || !isPromotionActive()) return;

  const rawCart = window.localStorage.getItem('sastabazar_cart');
  if (!rawCart) return;

  try {
    const cart = JSON.parse(rawCart);
    if (!Array.isArray(cart) || cart.length === 0) return;

    const existingCodes = new Set(
      cart
        .map((item: any) => String(item?.coupon_code || '').trim().toUpperCase())
        .filter(Boolean)
    );

    // Respect an offer/coupon the customer already has. WELCOME50 must never
    // overwrite another coupon because the storefront follows a single-offer policy.
    if (existingCodes.size > 0 && !existingCodes.has(COUPON_CODE)) return;

    const alreadyApplied = cart.every(
      (item: any) => String(item?.coupon_code || '').trim().toUpperCase() === COUPON_CODE
    );
    if (alreadyApplied) return;

    const nextCart = cart.map((item: any) => ({
      ...item,
      coupon_code: COUPON_CODE,
    }));

    window.localStorage.setItem('sastabazar_cart', JSON.stringify(nextCart));
    window.dispatchEvent(new Event('cartUpdated'));
  } catch {
    // Ignore malformed local cart data. Checkout performs authoritative validation.
  }
}

export default function Welcome50Promotion() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const active = isPromotionActive();
    setIsActive(active);
    if (isAdmin || !active) return;

    applyWelcome50ToCart();
    window.addEventListener('cartUpdated', applyWelcome50ToCart);
    window.addEventListener('storage', applyWelcome50ToCart);

    return () => {
      window.removeEventListener('cartUpdated', applyWelcome50ToCart);
      window.removeEventListener('storage', applyWelcome50ToCart);
    };
  }, [isAdmin]);

  if (isAdmin || !isActive) return null;

  return (
    <div className="w-full bg-[#741f23] px-3 py-2 text-center text-xs font-semibold text-white sm:text-sm">
      <span className="mr-1" aria-hidden="true">🎉</span>
      Website Launch Offer — Get ₹50 OFF on orders ₹{MINIMUM_ORDER}+ • Code{' '}
      <strong className="tracking-wide">{COUPON_CODE}</strong> • Auto-applied at checkout
    </div>
  );
}
