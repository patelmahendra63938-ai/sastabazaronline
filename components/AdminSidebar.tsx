'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  PlusCircle,
  Warehouse,
  Tags,
  Users,
  Receipt,
  CreditCard,
  Navigation,
  Truck,
  BarChart3,
  RotateCcw,
  MessageSquare,
  Ticket,
  Plug,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const adminNavItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Add Products', href: '/admin/add-product', icon: PlusCircle },
  { name: 'Inventory', href: '/admin/inventory', icon: Warehouse },
  { name: 'Categories', href: '/admin/categories', icon: Tags },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Invoices / GST', href: '/admin/invoices', icon: Receipt },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Logistics', href: '/admin/logistics', icon: Navigation },
  { name: 'Shipping', href: '/admin/shipping', icon: Truck },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Returns', href: '/admin/returns', icon: RotateCcw },
  { name: 'Reviews', href: '/admin/reviews', icon: MessageSquare },
  { name: 'Coupons', href: '/admin/coupons', icon: Ticket },
  { name: 'Integrations', href: '/admin/integrations', icon: Plug },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
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
    <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
      {adminNavItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
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
    </nav>
  );

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-indigo-950 text-white shadow-lg border border-indigo-800"
        aria-label="Toggle Menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 bg-indigo-950 text-white hidden md:flex flex-col h-screen sticky top-0 shadow-xl shrink-0 z-30">
        <div className="p-5 border-b border-indigo-900/80">
          <span className="text-[10px] font-black tracking-widest text-orange-400 uppercase block">
            Control Panel
          </span>
          <h2 className="text-lg font-black text-white">SASTABAZAR</h2>
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

      {/* Mobile Drawer */}
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