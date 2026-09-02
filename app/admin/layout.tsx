import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminModuleTabs from '@/components/admin/AdminModuleTabs';
import { requireAdminUser } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminUser();

  return (
    <div className="flex min-h-screen bg-[#f8f5f1] font-sans antialiased">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#ead8b8] bg-[#fffdf9] px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-[#741f23] px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
              ADHYEY BROTHERS ADMIN
            </span>
          </div>

          <div className="text-xs font-bold text-stone-500">
            Secure Management Dashboard
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <AdminModuleTabs />
          {children}
        </main>
      </div>
    </div>
  );
}
