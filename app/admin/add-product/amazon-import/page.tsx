'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, FileSpreadsheet, UploadCloud } from 'lucide-react';

export default function AmazonExcelImportPage() {
  const [fileName, setFileName] = useState('');

  return (
    <main className="min-h-screen bg-[#F8F9FB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/add-product"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
            aria-label="Back to Add Product"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <h1 className="text-xl font-black text-indigo-950 sm:text-2xl">Amazon Excel Import</h1>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Upload a report downloaded from Amazon Seller Central. This workflow does not connect to any Amazon API.
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">Upload Amazon Seller Central report</h2>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Accepted source files: .xlsx and .xlsm. Products will be reviewed and selected before any website import is allowed.
              </p>
            </div>
          </div>

          <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 text-center transition hover:border-amber-400 hover:bg-amber-50/40">
            <UploadCloud size={30} className="mb-3 text-amber-700" />
            <span className="text-sm font-black text-gray-900">
              {fileName || 'Choose Amazon Excel file'}
            </span>
            <span className="mt-1 text-xs text-gray-500">Downloaded manually from Amazon Seller Central</span>
            <input
              type="file"
              accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
              className="hidden"
              onChange={(event) => setFileName(event.target.files?.[0]?.name || '')}
            />
          </label>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
            Next implementation step: parse the selected file, show a staging preview, let you select products, edit MRP/Selling Price, confirm HSN/GST, enter packed Weight/Length/Width/Height, and then import only selected valid products.
          </div>
        </section>
      </div>
    </main>
  );
}
