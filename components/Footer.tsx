import React from 'react';
import Link from 'next/link';
import { PhoneCall, Mail, MapPin, ShieldCheck, Heart } from 'lucide-react';
import { BUSINESS_INFO } from '@/lib/business-info';

const footerLinkClass = 'inline-flex min-h-11 items-center hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded';

export default function Footer() {
  return (
    <footer className="bg-indigo-950 text-white pt-12 pb-8 border-t border-indigo-900 mt-20">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-indigo-900">
        <div className="space-y-4">
          <Link href="/" className="inline-flex min-h-11 items-center text-xl font-black tracking-wider text-white" aria-label="SASTABAZARONLINE home">
            SASTABAZAR<span className="text-orange-400">ONLINE</span>
          </Link>
          <p className="text-xs text-gray-300 leading-relaxed">
            Your trusted destination for quality home, kitchen, and lifestyle products at direct wholesale pricing in Surat and across India.
          </p>
          <div className="flex items-center gap-2 text-xs text-yellow-300 font-bold">
            <ShieldCheck size={16} aria-hidden="true" /> 100% Trusted & Verified Wholesale Store
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-orange-300 mb-2">Quick Links</h4>
          <ul className="text-xs text-gray-300">
            <li><Link href="/" className={footerLinkClass}>Home</Link></li>
            <li><Link href="/cart" className={footerLinkClass}>My Shopping Cart</Link></li>
            <li><Link href="/wishlist" className={footerLinkClass}>My Wishlist</Link></li>
            <li><Link href="/orders" className={footerLinkClass}>Track My Orders</Link></li>
            <li><Link href="/terms-and-conditions" className={footerLinkClass}>Terms & Conditions</Link></li>
            <li><Link href="/refund-policy" className={footerLinkClass}>Refund Policy</Link></li>
            <li><Link href="/return-policy" className={footerLinkClass}>Return Policy</Link></li>
            <li><Link href="/shipping-policy" className={footerLinkClass}>Shipping Policy</Link></li>
            <li><Link href="/privacy-policy" className={footerLinkClass}>Privacy Policy</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-orange-300 mb-2">Categories</h4>
          {/* Temporarily hidden footer category links. Remove `hidden` to show them again. */}
          <ul className="hidden text-xs text-gray-300">
            <li><Link href="/category/Kitchenware" className={footerLinkClass}>Kitchen Appliances</Link></li>
            <li><Link href="/category/Storage" className={footerLinkClass}>Storage & Organization</Link></li>
            <li><Link href="/category/Cleaning" className={footerLinkClass}>Cleaning Utilities</Link></li>
            <li><Link href="/category/Home Decor" className={footerLinkClass}>Home Decor</Link></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-orange-300 mb-2">Contact Us</h4>
          <div className="space-y-1 text-xs text-gray-300">
            <p className="flex items-start gap-2 py-2">
              <MapPin size={16} className="text-orange-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{BUSINESS_INFO.addressLines.join(' ')}</span>
            </p>
            <p className="flex items-center gap-2">
              <PhoneCall size={16} className="text-orange-400 flex-shrink-0" aria-hidden="true" />
              <a className="inline-flex min-h-11 items-center underline-offset-2 hover:underline" href={BUSINESS_INFO.officePhoneHref} aria-label={`Call ${BUSINESS_INFO.officePhone}`}>{BUSINESS_INFO.officePhone}</a>
            </p>
            <p className="flex items-center gap-2">
              <Mail size={16} className="text-orange-400 flex-shrink-0" aria-hidden="true" />
              <a className="inline-flex min-h-11 items-center underline-offset-2 hover:underline" href={`mailto:${BUSINESS_INFO.email}`} aria-label={`Email ${BUSINESS_INFO.email}`}>{BUSINESS_INFO.email}</a>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-300 gap-4">
        <p>© {new Date().getFullYear()} SASTABAZARONLINE. All rights reserved.</p>
        <p className="flex items-center gap-1">
          Operated by ADHYEY BROTHERS with <Heart size={14} className="text-red-400 fill-red-400" aria-hidden="true" />
        </p>
      </div>
    </footer>
  );
}
