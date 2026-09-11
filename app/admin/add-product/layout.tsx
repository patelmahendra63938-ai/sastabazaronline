import Link from 'next/link';
import { FileSpreadsheet } from 'lucide-react';

export default function AddProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-black text-amber-950">Add products faster</p>
            <p className="hidden text-[11px] text-amber-800 sm:block">
              Upload a downloaded Amazon Seller Central Excel report. No Amazon API connection is required.
            </p>
          </div>

          <Link
            href="/admin/add-product/amazon-import"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-black text-amber-950 shadow-sm transition hover:bg-amber-100"
          >
            <FileSpreadsheet size={16} />
            <span>Import from Amazon Excel</span>
          </Link>
        </div>
      </div>

      {children}
    </>
  );
}
