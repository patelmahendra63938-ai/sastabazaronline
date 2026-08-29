'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const COUPON_CODE = 'WELCOME50';
const MINIMUM_ORDER = 499;
const PROMO_END_AT = Date.parse('2026-09-07T18:29:59.999Z'); // 07 Sep 2026, 23:59:59 IST

export default function Welcome50Promotion() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(Date.now() <= PROMO_END_AT);
  }, []);

  if (isAdmin || !isActive) return null;

  return (
    <div className="w-full bg-[#741f23] px-3 py-2 text-center text-xs font-semibold text-white sm:text-sm">
      <span className="mr-1" aria-hidden="true">🎉</span>
      Website Launch Offer — Get ₹50 OFF on orders ₹{MINIMUM_ORDER}+ • Code{' '}
      <strong className="tracking-wide">{COUPON_CODE}</strong> • Auto-applied at checkout
    </div>
  );
}
