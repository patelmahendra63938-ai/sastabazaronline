'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Tags,
  Users,
  Receipt,
  Truck,
  BarChart3,
  RotateCcw,
  MessageSquare,
  Ticket,
  Plug,
  Settings,
  LogOut,
  Menu,
  SlidersHorizontal,
  X,
} from 'lucide-react';

const adminNavGroups = [
  { label: 'Dashboard', items: [{ name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }] },
  { label: 'Orders', items: [
    { name: 'All Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Returns', href: '/admin/returns', icon: RotateCcw },
    { name: 'Invoices', href: '/admin/invoices', icon: Receipt },
  ] },
  { label: 'Products', items: [
    { name: 'All Products', href: '/admin/products', icon: Package },
    { name: 'Categories', href: '/admin/categories', icon: Tags },
    { name: 'Inventory', href: '/admin/inventory', icon: Warehouse },
    { name: 'Image Optimizer', href: '/admin/image-optimizer', icon: SlidersHorizontal },
  ] },
  { label: 'Customers', items: [{ name: 'Customers', href: '/admin/customers', icon: Users }] },
  { label: 'Marketing', items: [
    { name: 'Coupons & Discounts', href: '/admin/coupons', icon: Ticket },
    { name: 'Reviews', href: '/admin/reviews', icon: MessageSquare },
  ] },
  { label: 'Shipping', items: [{ name: 'Shipping & Logistics', href: '/admin/logistics', icon: Truck }] },
  { label: 'Reports', items: [{ name: 'Reports', href: '/admin/reports', icon: BarChart3 }] },
  { label: 'Settings', items: [
    { name: 'General', href: '/admin/settings', icon: Settings },
    { name: 'Integrations', href: '/admin/integrations', icon: Plug },
    { name: 'Homepage Display Settings', href: '/admin/settings/homepage-display', icon: LayoutDashboard },
  ] },
];

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
    <nav className="flex-1 overflow-y-auto px-3 py-3">
      {adminNavGroups.map((group) => (
        <div key={group.label} className="mb-4 last:mb-0">
          <p className="mb-1.5 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-indigo-400">{group.label}</p>
          <div className="space-y-1">
          {group.items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/admin/dashboard' &&
            item.href !== '/admin/settings' &&
            pathname.startsWith(item.href));
        const Icon = item.icon;
            return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold ${
              isActive
                ? 'bg-orange-500 text-white shadow-md font-bold'
                : 'text-indigo-200/80 hover:bg-indigo-900/60 hover:text-white'
            }`}
          >
            <Icon size={16} className={isActive ? 'text-white' : 'text-indigo-300'} />
            <span>{item.name}</span>
          </Link>
            );
          })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-indigo-950 text-white shadow-lg border border-indigo-800"
        aria-label="Toggle Menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className="w-64 bg-indigo-950 text-white hidden md:flex flex-col h-screen sticky top-0 shadow-xl shrink-0 z-30">
        <div className="p-5 border-b border-indigo-900/80">
          <span className="text-[10px] font-black tracking-widest text-orange-400 uppercase block">
            Control Panel
          </span>
          <h2 className="text-lg font-black text-white">SASTABAZARONLINE</h2>
        </div>

        {navLinks}

        <div className="p-3 border-t border-indigo-900/80">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-red-300 hover:bg-red-500/10 transition text-xs font-bold"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-indigo-950 text-white flex flex-col h-full shadow-2xl z-50 pt-14">
            <div className="px-5 pb-3 border-b border-indigo-900">
              <h2 className="text-base font-black text-orange-400">ADMIN MENU</h2>
            </div>
            {navLinks}
            <div className="p-3 border-t border-indigo-900">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-red-300 hover:bg-red-500/10 transition text-xs font-bold"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
