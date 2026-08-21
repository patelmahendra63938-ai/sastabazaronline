import Link from 'next/link';
import { Heart, Mail, MapPin, PhoneCall, ShieldCheck } from 'lucide-react';
import { businessInfo } from '@/lib/business-info';

interface FooterProps {
  categories?: string[];
}

const quickLinks = [
  ['Home', '/'],
  ['My Shopping Cart', '/cart'],
  ['My Wishlist', '/wishlist'],
  ['Track My Orders', '/orders'],
] as const;

const companyLinks = [
  ['About Us', '/about-us'],
  ['Contact Us', '/contact-us'],
] as const;

const policyLinks = [
  ['Privacy Policy', '/privacy-policy'],
  ['Terms & Conditions', '/terms-and-conditions'],
  ['Shipping & Delivery Policy', '/shipping-policy'],
  ['Cancellation / Return / Refund Policy', '/refund-policy'],
] as const;

export default function Footer({ categories = [] }: FooterProps) {
  return (
    <footer className="mt-20 border-t border-indigo-900 bg-indigo-950 pb-8 pt-12 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 border-b border-indigo-900 px-4 pb-12 sm:grid-cols-2 lg:grid-cols-6 lg:gap-8">
        <div className="space-y-4 sm:col-span-2 lg:col-span-2">
          <Link href="/" className="inline-block text-xl font-black tracking-wider text-white">
            SASTABAZAR<span className="text-orange-500">ONLINE</span>
          </Link>
          <p className="max-w-sm text-xs leading-relaxed text-gray-300">
            Shop products from our live home, kitchen, lifestyle, fashion and consumer catalogue for delivery to serviceable locations in India.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-yellow-400">
            <ShieldCheck size={16} className="shrink-0" />
            <span>Transparent checkout and customer support</span>
          </div>
          <p className="text-xs font-semibold text-gray-200">{businessInfo.legalIdentity}</p>
        </div>

        <FooterLinks title="Quick Links" links={quickLinks} />

        <div className="space-y-8">
          <FooterLinks title="Company" links={companyLinks} />
          {categories.length > 0 && (
            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-orange-400">Categories</h4>
              <ul className="space-y-2.5 text-xs text-gray-300">
                {categories.slice(0, 3).map((category) => (
                  <li key={category}><Link href={`/category/${encodeURIComponent(category)}`} className="transition hover:text-white">{category}</Link></li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <FooterLinks title="Policies" links={policyLinks} />

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-orange-400">Contact Us</h4>
          <div className="space-y-3 text-xs text-gray-300">
            <p className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-orange-500" />
              <span><strong className="text-gray-200">Registered Business Address</strong><br />{businessInfo.registeredAddress}</span>
            </p>
            <p className="flex items-center gap-2">
              <PhoneCall size={16} className="shrink-0 text-orange-500" />
              <a href={businessInfo.supportPhoneHref} className="transition hover:text-white">{businessInfo.supportPhone}</a>
            </p>
            <p className="flex items-start gap-2">
              <Mail size={16} className="mt-0.5 shrink-0 text-orange-500" />
              <a href={`mailto:${businessInfo.supportEmail}`} className="break-all transition hover:text-white">{businessInfo.supportEmail}</a>
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 pt-6 text-center text-xs text-gray-400 sm:flex-row sm:text-left">
        <p>© {new Date().getFullYear()} {businessInfo.brandName}. All rights reserved.</p>
        <p className="flex items-center gap-1">Owned and operated by <span className="font-semibold text-gray-300">{businessInfo.legalBusinessName}</span><Heart size={14} className="fill-red-500 text-red-500" /></p>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-orange-400">{title}</h4>
      <ul className="space-y-2.5 text-xs text-gray-300">
        {links.map(([label, href]) => <li key={href}><Link href={href} className="transition hover:text-white">{label}</Link></li>)}
      </ul>
    </div>
  );
}
