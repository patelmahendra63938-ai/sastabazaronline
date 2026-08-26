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
  Landmark,
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
  {
    label: 'Dashboard',
    items: [
      {
        name: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'Orders',
    items: [
      {
        name: 'All Orders',
        href: '/admin/orders',
        icon: ShoppingCart,
      },
      {
        name: 'Returns',
        href: '/admin/returns',
        icon: RotateCcw,
      },
      {
        name: 'Invoices',
        href: '/admin/invoices',
        icon: Receipt,
      },
    ],
  },
  {
    label: 'Products',
    items: [
      {
        name: 'All Products',
        href: '/admin/products',
        icon: Package,
      },
      {
        name: 'Categories',
        href: '/admin/categories',
        icon: Tags,
      },
      {
        name: 'Inventory',
        href: '/admin/inventory',
        icon: Warehouse,
      },
      {
        name: 'Image Optimizer',
        href: '/admin/image-optimizer',
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    label: 'Customers',
    items: [
      {
        name: 'Customers',
        href: '/admin/customers',
        icon: Users,
      },
    ],
  },
  {
    label: 'Marketing',
    items: [
      {
        name: 'Coupons & Discounts',
        href: '/admin/coupons',
        icon: Ticket,
      },
      {
        name: 'Reviews',
        href: '/admin/reviews',
        icon: MessageSquare,
      },
    ],
  },
  {
    label: 'Shipping',
    items: [
      {
        name: 'Shipping & Logistics',
        href: '/admin/logistics',
        icon: Truck,
      },
    ],
  },
  {
    label: 'Reports',
    items: [
      {
        name: 'Reports',
        href: '/admin/reports',
        icon: BarChart3,
      },
    ],
  },
  {
    label: 'Accounts',
    items: [
      {
        name: 'Accounts & GST',
        href: '/admin/accounts',
        icon: Landmark,
      },
    ],
  },
  {
    label: 'Settings',
    items: [
      {
        name: 'General',
        href: '/admin/settings',
        icon: Settings,
      },
      {
        name: 'Integrations',
        href: '/admin/integrations',
        icon: Plug,
      },
      {
        name: 'Homepage Display Settings',
        href: '/admin/settings/homepage-display',
        icon: LayoutDashboard,
      },
    ],
  },
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
        <div
          key={group.label}
          className="mb-4 last:mb-0"
        >
          <p className="mb-1.5 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-[#d7aa5b]">
            {group.label}
          </p>

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
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#d7aa5b] text-[#5e171b] shadow-md font-bold'
                      : 'text-[#f5e8d6] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon
                    size={16}
                    className={
                      isActive
                        ? 'text-[#5e171b]'
                        : 'text-[#e7c995]'
                    }
                  />

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
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-[#8d3438] bg-[#741f23] p-2 text-white shadow-lg md:hidden"
        aria-label="Toggle Menu"
      >
        {mobileOpen ? (
          <X size={20} />
        ) : (
          <Menu size={20} />
        )}
      </button>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col bg-[#5e171b] text-white shadow-xl md:flex">
        <div className="border-b border-white/10 p-5">
          <span className="block text-[10px] font-black uppercase tracking-widest text-[#d7aa5b]">
            Control Panel
          </span>

          <h2 className="mt-1 text-lg font-black tracking-wide text-white">
            ADHYEY BROTHERS
          </h2>

          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e9cf9f]">
            Admin Management
          </p>
        </div>

        {navLinks}

        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10 hover:text-red-100"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="relative z-50 flex h-full w-64 flex-col bg-[#5e171b] pt-14 text-white shadow-2xl">
            <div className="border-b border-white/10 px-5 pb-4">
              <span className="block text-[10px] font-black uppercase tracking-widest text-[#d7aa5b]">
                Control Panel
              </span>

              <h2 className="mt-1 text-base font-black text-white">
                ADHYEY BROTHERS
              </h2>

              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e9cf9f]">
                Admin Menu
              </p>
            </div>

            {navLinks}

            <div className="border-t border-white/10 p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10 hover:text-red-100"
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