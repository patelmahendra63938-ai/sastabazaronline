'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Boxes, Package, ArrowLeft } from 'lucide-react';
import ProductFormV2 from './ProductFormV2';
import SharedPackProductForm from './SharedPackProductForm';

type Mode = 'standard' | 'shared-pack' | null;

export default function ProductCreateChooser() {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === 'standard') return <ProductFormV2 />;
  if (mode === 'shared-pack') return <SharedPackProductForm />;

  return (
    <main className="min-h-screen bg-[#F8F9FB]">
      
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/admin/products" className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-2xl font-black text-indigo-950">Add New Product</h1>
            <p className="mt-1 text-sm text-gray-500">Choose how this product is sold. Existing products are not affected.</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <button type="button" onClick={() => setMode('standard')} className="rounded-3xl border-2 border-gray-200 bg-white p-7 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md">
            <Package size={34} className="mb-4 text-orange-500" />
            <h2 className="text-lg font-black text-gray-900">Single / Fixed Pack / Set</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Use the current product form for one piece, one fixed pack, one fixed set, apparel sizes and normal inventory variants.</p>
          </button>

          <button type="button" onClick={() => setMode('shared-pack')} className="rounded-3xl border-2 border-indigo-300 bg-indigo-50 p-7 text-left shadow-sm transition hover:border-indigo-600 hover:shadow-md">
            <Boxes size={34} className="mb-4 text-indigo-700" />
            <h2 className="text-lg font-black text-indigo-950">Multiple Pack / Set Options</h2>
            <p className="mt-2 text-sm leading-relaxed text-indigo-900/75">One product listing with editable pack prices and one shared physical stock pool. Example: 4 pcs ₹108, 6 pcs ₹162, 9 pcs ₹243.</p>
            <div className="mt-4 rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-800">Recommended for coasters, hooks, containers, spoons, cloths and other quantity-pack products.</div>
          </button>
        </div>
      </div>
      
    </main>
  );
}
