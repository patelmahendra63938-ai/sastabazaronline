import React from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  Mail,
  MapPin,
  ShieldCheck,
  Heart,
  ShoppingBag,
} from 'lucide-react';
import { BUSINESS_INFO } from '@/lib/business-info';
import FooterCategories from '@/components/FooterCategories';

const footerLinkClass =
  'inline-flex min-h-10 items-center text-stone-300 hover:text-[#e7c98d] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b] rounded';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[#6a1b1f] bg-[#64191d] text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-4">
          <Link href="/" className="inline-flex min-h-11 items-center gap-3" aria-label="ADHYEY BROTHERS home">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#d7aa5b] bg-[#fff7e8]">
              <span className="font-serif text-lg font-bold text-[#741f23]">AB</span>
            </div>
            <div>
              <div className="font-serif text-lg font-bold tracking-[0.08em] text-white">ADHYEY</div>
              <div className="font-serif text-sm font-bold tracking-[0.16em] text-[#e7c98d]">BROTHERS™</div>
            </div>
          </Link>
          <p className="text-xs leading-relaxed text-stone-300">
            Your trusted online shopping destination for fashion, lifestyle,
            home and everyday products across India.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-[#e7c98d]">
            <ShieldCheck size={16} aria-hidden="true" />
            Trusted Shopping Experience
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-300">
            <ShoppingBag size={16} className="text-[#e7c98d]" aria-hidden="true" />
            Quality • Trust • Style
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#e7c98d]">Shopping</h4>
          <ul className="text-xs">
            <li><Link href="/" className={footerLinkClass}>Home</Link></li>
            <li><Link href="/cart" className={footerLinkClass}>My Shopping Cart</Link></li>
            <li><Link href="/wishlist" className={footerLinkClass}>My Wishlist</Link></li>
            <li><Link href="/orders" className={footerLinkClass}>Track My Orders</Link></li>
            <li><Link href="/account" className={footerLinkClass}>My Account</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#e7c98d]">Categories</h4>
          <ul className="text-xs">
            <FooterCategories />
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#e7c98d]">Customer Policies</h4>
          <ul className="text-xs">
            <li><Link href="/terms-and-conditions" className={footerLinkClass}>Terms & Conditions</Link></li>
            <li><Link href="/refund-policy" className={footerLinkClass}>Refund Policy</Link></li>
            <li><Link href="/return-policy" className={footerLinkClass}>Return Policy</Link></li>
            <li><Link href="/shipping-policy" className={footerLinkClass}>Shipping Policy</Link></li>
            <li><Link href="/privacy-policy" className={footerLinkClass}>Privacy Policy</Link></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#e7c98d]">Contact Us</h4>
          <div className="space-y-2 text-xs text-stone-300">
            <p className="flex items-start gap-2 py-1">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[#e7c98d]" aria-hidden="true" />
              <span>{BUSINESS_INFO.addressLines.join(' ')}</span>
            </p>
            <p className="flex items-center gap-2">
              <PhoneCall size={16} className="shrink-0 text-[#e7c98d]" aria-hidden="true" />
              <a className="inline-flex min-h-10 items-center underline-offset-2 hover:text-white hover:underline" href={BUSINESS_INFO.officePhoneHref} aria-label={`Call ${BUSINESS_INFO.officePhone}`}>
                {BUSINESS_INFO.officePhone}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Mail size={16} className="shrink-0 text-[#e7c98d]" aria-hidden="true" />
              <a className="inline-flex min-h-10 items-center underline-offset-2 hover:text-white hover:underline" href="mailto:adhyeybrothers@gmail.com" aria-label="Email adhyeybrothers@gmail.com">
                adhyeybrothers@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#561317]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-stone-300 sm:flex-row">
          <p>© {new Date().getFullYear()} ADHYEY BROTHERS™. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Operated by ADHYEY BROTHERS with
            <Heart size={14} className="fill-[#e7c98d] text-[#e7c98d]" aria-hidden="true" />
          </p>
        </div>
      </div>
    </footer>
  );
}
