'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Ticket,
  Truck,
  Landmark,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  match: string[];
};

const adminNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, match: ['/admin/dashboard'] },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart, match: ['/admin/orders', '/admin/returns'] },
  { name: 'Products', href: '/admin/products', icon: Package, match: ['/admin/products', '/admin/add-product', '/admin/categories', '/admin/inventory', '/admin/image-optimizer'] },
  { name: 'Customers', href: '/admin/customers', icon: Users, match: ['/admin/customers', '/admin/reviews'] },
  { name: 'Marketing', href: '/admin/coupons', icon: Ticket, match: ['/admin/coupons', '/admin/settings/discounts'] },
  { name: 'Shipping', href: '/admin/logistics', icon: Truck, match: ['/admin/logistics', '/admin/shipping'] },
  { name: 'Finance & GST', href: '/admin/accounts', icon: Landmark, match: ['/admin/accounts', '/admin/payments', '/admin/invoices', '/admin/reports'] },
  { name: 'Settings', href: '/admin/settings', icon: Settings, match: ['/admin/settings', '/admin/integrations'] },
];

function isItemActive(pathname: string, item: NavItem) {
  if (item.name === 'Settings' && pathname.startsWith('/admin/settings/discounts')) return false;
  return item.match.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navLinks = (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
      <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-[#d7aa5b]">
        Main Modules
      </p>
      <div className="space-y-1.5">
        {adminNavItems.map((item) => {
          const active = isItemActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold transition-all ${
                active
                  ? 'bg-[#d7aa5b] font-bold text-[#5e171b] shadow-md'
                  : 'text-[#f5e8d6] hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={17} className={active ? 'text-[#5e171b]' : 'text-[#e7c995]'} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  const signOutButton = (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10 hover:text-red-100"
    >
      <LogOut size={16} />
      <span>Sign Out</span>
    </button>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-[#8d3438] bg-[#741f23] p-2 text-white shadow-lg md:hidden"
        aria-label="Toggle admin menu"
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className="sticky top-0 z-30 hidden h-screen w-60 shrink-0 flex-col bg-[#5e171b] text-white shadow-xl md:flex">
        <div className="border-b border-white/10 p-5">
          <span className="block text-[10px] font-black uppercase tracking-widest text-[#d7aa5b]">Control Panel</span>
          <h2 className="mt-1 text-lg font-black tracking-wide text-white">ADHYEY BROTHERS</h2>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e9cf9f]">Admin Management</p>
        </div>
        {navLinks}
        <div className="border-t border-white/10 p-3">{signOutButton}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin menu"
          />
          <aside className="relative z-50 flex h-full w-72 max-w-[85vw] flex-col bg-[#5e171b] pt-14 text-white shadow-2xl">
            <div className="border-b border-white/10 px-5 pb-4">
              <span className="block text-[10px] font-black uppercase tracking-widest text-[#d7aa5b]">Control Panel</span>
              <h2 className="mt-1 text-base font-black text-white">ADHYEY BROTHERS</h2>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e9cf9f]">Admin Menu</p>
            </div>
            {navLinks}
            <div className="border-t border-white/10 p-3">{signOutButton}</div>
          </aside>
        </div>
      )}
    </>
  );
}
