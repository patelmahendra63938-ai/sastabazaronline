'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
      } else {
        setAuthenticated(true);
      }
      setLoading(false);
    }

    checkAuth();
  }, [router]);

  // લૉગિન ચેક થાય ત્યાં સુધી સ્ક્રીન લોડિંગ બતાવશે
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm font-semibold text-gray-600">
          સુરક્ષા ચકાસણી થઈ રહી છે...
        </div>
      </div>
    );
  }

  // જો લોગિન ન હોય તો પેજનો ડેટા બતાવશે નહીં
  if (!authenticated) {
    return null;
  }

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
