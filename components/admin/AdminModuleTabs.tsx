'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = { label: string; href: string; match?: string[] };
type Module = { title: string; tabs: Tab[]; match: string[] };

const modules: Module[] = [
  {
    title: 'Orders',
    match: ['/admin/orders', '/admin/returns'],
    tabs: [
      { label: 'All Orders', href: '/admin/orders', match: ['/admin/orders'] },
      { label: 'Returns & Refunds', href: '/admin/returns', match: ['/admin/returns'] },
    ],
  },
  {
    title: 'Products',
    match: ['/admin/products', '/admin/add-product', '/admin/categories', '/admin/inventory', '/admin/image-optimizer'],
    tabs: [
      { label: 'Products', href: '/admin/products', match: ['/admin/products'] },
      { label: 'Add Product', href: '/admin/add-product', match: ['/admin/add-product'] },
      { label: 'Categories', href: '/admin/categories', match: ['/admin/categories'] },
      { label: 'Inventory', href: '/admin/inventory', match: ['/admin/inventory'] },
      { label: 'Image Tools', href: '/admin/image-optimizer', match: ['/admin/image-optimizer'] },
    ],
  },
  {
    title: 'Customers',
    match: ['/admin/customers', '/admin/reviews'],
    tabs: [
      { label: 'Customers', href: '/admin/customers', match: ['/admin/customers'] },
      { label: 'Reviews', href: '/admin/reviews', match: ['/admin/reviews'] },
    ],
  },
  {
    title: 'Marketing',
    match: ['/admin/coupons', '/admin/settings/discounts'],
    tabs: [
      { label: 'Coupons & Promotions', href: '/admin/coupons', match: ['/admin/coupons'] },
      { label: 'Discount Settings', href: '/admin/settings/discounts', match: ['/admin/settings/discounts'] },
    ],
  },
  {
    title: 'Shipping',
    match: ['/admin/logistics', '/admin/shipping'],
    tabs: [
      { label: 'Shipments & Logistics', href: '/admin/logistics', match: ['/admin/logistics'] },
      { label: 'Rates & Rules', href: '/admin/shipping', match: ['/admin/shipping'] },
    ],
  },
  {
    title: 'Finance & GST',
    match: ['/admin/accounts', '/admin/payments', '/admin/invoices', '/admin/reports'],
    tabs: [
      { label: 'Accounts & GST', href: '/admin/accounts', match: ['/admin/accounts'] },
      { label: 'Payments', href: '/admin/payments', match: ['/admin/payments'] },
      { label: 'Invoices', href: '/admin/invoices', match: ['/admin/invoices'] },
      { label: 'Reports', href: '/admin/reports', match: ['/admin/reports'] },
    ],
  },
  {
    title: 'Settings',
    match: ['/admin/settings', '/admin/integrations'],
    tabs: [
      { label: 'General', href: '/admin/settings', match: ['/admin/settings'] },
      { label: 'Homepage Display', href: '/admin/settings/homepage-display', match: ['/admin/settings/homepage-display'] },
      { label: 'Integrations', href: '/admin/integrations', match: ['/admin/integrations'] },
    ],
  },
];

function startsWithAny(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function AdminModuleTabs() {
  const pathname = usePathname();
  if (pathname === '/admin' || pathname === '/admin/dashboard') return null;

  const current = modules.find((module) => startsWithAny(pathname, module.match));
  if (!current) return null;

  return (
    <div className="mb-6 rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-3 shadow-sm">
      <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#9a6b2f]">
        {current.title}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {current.tabs.map((tab) => {
          const tabMatches = tab.match ?? [tab.href];
          const active = startsWithAny(pathname, tabMatches) && !(
            tab.href === '/admin/settings' && pathname !== '/admin/settings'
          );
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition ${
                active
                  ? 'bg-[#741f23] text-white shadow-sm'
                  : 'border border-[#ead8b8] bg-white text-[#741f23] hover:bg-[#fff7e8]'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
