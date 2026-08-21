import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans antialiased">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-indigo-950 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
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