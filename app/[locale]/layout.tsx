import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { 
  LayoutDashboard, ShoppingBag, Package, PackageX, 
  Truck, ArrowLeft, ShieldCheck 
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Server-side session & role verification
  const { user, profile, role } = await getCurrentUser();

  // If unauthenticated or customer role -> Server-Side Redirect
  if (!user || !role || !['admin', 'super_admin', 'staff'].includes(role)) {
    redirect('/?error=unauthorized_admin_access');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Admin Navigation Bar */}
      <div className="bg-indigo-950 text-white border-b border-indigo-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-orange-500 text-white font-black text-xs px-2 py-0.5 rounded">
              SASTABAZAR ADMIN
            </span>
            <span className="text-xs text-indigo-300 hidden sm:inline">
              Role: <strong className="text-white uppercase">{role}</strong> ({profile?.email})
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <Link href="/" className="text-indigo-200 hover:text-white flex items-center gap-1">
              <ArrowLeft size={14} /> Storefront
            </Link>
          </div>
        </div>

        {/* Sub Navigation Links */}
        <div className="bg-indigo-900/60 border-t border-indigo-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto no-scrollbar gap-1 py-1.5 text-xs font-semibold">
            <Link href="/admin/dashboard" className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-indigo-100 hover:text-white flex items-center gap-1.5">
              <LayoutDashboard size={14} /> Orders & Inventory
            </Link>
            <Link href="/admin/add-product" className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-indigo-100 hover:text-white flex items-center gap-1.5">
              <Package size={14} /> Add Product
            </Link>
            <Link href="/admin/returns" className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-indigo-100 hover:text-white flex items-center gap-1.5">
              <PackageX size={14} /> Returns & QC
            </Link>
            <Link href="/admin/logistics" className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-indigo-100 hover:text-white flex items-center gap-1.5">
              <Truck size={14} /> Logistics & AWB
            </Link>
          </div>
        </div>
      </div>

      {/* Main Admin Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}