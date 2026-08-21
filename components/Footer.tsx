import React from 'react';
import Link from 'next/link';
import { PhoneCall, Mail, MapPin, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-indigo-950 text-white pt-12 pb-8 border-t border-indigo-900 mt-20">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-indigo-900">
        
        {/* Company Identity */}
        <div className="space-y-4">
          <Link href="/" className="text-xl font-black tracking-wider text-white">
            SASTABAZAR<span className="text-orange-500">ONLINE</span>
          </Link>
          <p className="text-xs text-gray-300 leading-relaxed">
            Your trusted destination for quality home, kitchen, and lifestyle products at direct wholesale pricing in Surat and across India.
          </p>
          <div className="flex items-center gap-2 text-xs text-yellow-400 font-bold">
            <ShieldCheck size={16} /> 100% Trusted & Verified Wholesale Store
          </div>
        </div>

        {/* Policy & Legal Links */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-orange-400 mb-4">Policies & Legal</h4>
          <ul className="space-y-2.5 text-xs text-gray-300">
            <li><Link href="/terms" className="hover:text-white transition">Terms & Conditions</Link></li>
            <li><Link href="/refund-policy" className="hover:text-white transition">Refund Policy</Link></li>
            <li><Link href="/return-policy" className="hover:text-white transition">Return Policy</Link></li>
            <li><Link href="/shipping-policy" className="hover:text-white transition">Shipping Policy</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link></li>
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-orange-400 mb-4">Categories</h4>
          <ul className="space-y-2.5 text-xs text-gray-300">
            <li><Link href="/category/Kitchenware" className="hover:text-white transition">Kitchen Appliances</Link></li>
            <li><Link href="/category/Storage" className="hover:text-white transition">Storage & Organization</Link></li>
            <li><Link href="/category/Cleaning" className="hover:text-white transition">Cleaning Utilities</Link></li>
            <li><Link href="/category/Home Decor" className="hover:text-white transition">Home Decor</Link></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-orange-400 mb-4">Contact Us</h4>
          <div className="space-y-3 text-xs text-gray-300">
            <p className="flex items-start gap-2">
              <MapPin size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <span>3rd Floor, 33 Shaktinagar Society, Peoples Char Rasta, Katargam, Surat, Gujarat - 395004, India</span>
            </p>
            <p className="flex items-center gap-2">
              <PhoneCall size={16} className="text-orange-500 flex-shrink-0" />
              <span>+91 9723268666</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail size={16} className="text-orange-500 flex-shrink-0" />
              <span>sales@sastabazaronline.in</span>
            </p>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 gap-4">
        <p>© {new Date().getFullYear()} SASTABAZARONLINE. All rights reserved.</p>
        <p className="flex items-center gap-1">
          Operated by Adhyey Brothers with <Heart size={14} className="text-red-500 fill-red-500" />
        </p>
      </div>
    </footer>
  );
}
