import { Truck } from 'lucide-react';
import { FREE_SHIPPING_MIN_INR } from '@/lib/shipping/policy';

export default function FreeShippingStrip() {
  return (
    <div className="w-full border-b border-[#ead8b8] bg-[#741f23] px-3 py-2 text-center text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-[11px] font-extrabold sm:text-xs md:text-sm">
        <Truck size={15} aria-hidden="true" className="shrink-0" />
        <span>FREE SHIPPING on orders ₹{FREE_SHIPPING_MIN_INR}+ • Pan India Delivery</span>
      </div>
    </div>
  );
}
