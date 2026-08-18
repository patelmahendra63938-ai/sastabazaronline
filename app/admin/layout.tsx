import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import { createClient } from '@/lib/supabase/server'; // જો તમારી સર્વર ફાઈલ lib/supabase.ts હોય તો તે મુજબ પાથ રાખવો

export const metadata: Metadata = {
  title: 'Admin Control Panel — SASTABAZARONLINE',
  description: 'Manage store promotions, inventory, orders, and fulfillment for SASTABAZARONLINE.',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ૧. સર્વર પર Supabase ક્લાયન્ટ શરૂ કરો
  const supabase = await createClient();

  // ૨. યુઝરનું લૉગિન સેશન વેરિફાઈ કરો
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ૩. જો યુઝર લોગિન ન હોય તો સીધા /login પેજ પર મોકલી દો
  if (!user) {
    redirect('/login');
  }

  // ૪. જો યુઝર અધિકૃત હોય તો જ એડમિન પેનલ દેખાશે
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans antialiased">
      {/* Permanent Admin Navigation */}
      <AdminSidebar />

      {/* Main Page Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black bg-indigo-950 text-white px-3 py-1 rounded-lg uppercase tracking-wider">
              SASTABAZARONLINE ADMIN
            </span>
          </div>
          <div className="text-xs font-bold text-gray-500">
            Secure Management Dashboard
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
