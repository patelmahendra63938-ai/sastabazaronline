'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PackageCheck, ShoppingBag, Truck, Scale, Boxes } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';

type ExampleProduct = {
  id: string;
  title: string;
  category: string | null;
  image: string;
  weightGrams: number;
};

type ProductRow = {
  id: string;
  title: string;
  category: string | null;
  images?: string[] | null;
  image?: string | null;
  stock?: number | null;
  net_weight_grams?: number | null;
  inventory?: Array<{ available_quantity?: number | null }> | null;
};

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function selectMixedProducts(rows: ProductRow[]) {
  const eligible = shuffled(
    rows.filter((row) => {
      const weight = Number(row.net_weight_grams || 0);
      const inventoryStock = (row.inventory || []).some(
        (variant) => Number(variant.available_quantity || 0) > 0
      );
      const productStock = Number(row.stock || 0) > 0;
      return Number.isFinite(weight) && weight > 0 && (inventoryStock || productStock);
    })
  );

  const chosen: ProductRow[] = [];
  const usedCategories = new Set<string>();

  for (const row of eligible) {
    const category = String(row.category || 'Other').trim().toLowerCase();
    if (!usedCategories.has(category)) {
      chosen.push(row);
      usedCategories.add(category);
    }
    if (chosen.length === 5) break;
  }

  if (chosen.length < 5) {
    for (const row of eligible) {
      if (chosen.some((item) => item.id === row.id)) continue;
      chosen.push(row);
      if (chosen.length === 5) break;
    }
  }

  return chosen.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    image: resolveStorefrontImageSrc(row.images?.[0] || row.image),
    weightGrams: Number(row.net_weight_grams || 0),
  }));
}

export default function BulkWholesaleAdvantage() {
  const [exampleProducts, setExampleProducts] = useState<ExampleProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadExampleProducts() {
      const { data } = await supabase
        .from('products')
        .select('id, title, category, images, image, stock, net_weight_grams, inventory(available_quantity)')
        .eq('is_active', true)
        .gt('net_weight_grams', 0)
        .limit(40);

      if (!active) return;
      setExampleProducts(selectMixedProducts((data || []) as ProductRow[]));
      setLoading(false);
    }

    loadExampleProducts();
    return () => {
      active = false;
    };
  }, []);

  const totalWeightGrams = useMemo(
    () => exampleProducts.reduce((sum, item) => sum + item.weightGrams, 0),
    [exampleProducts]
  );

  const totalWeightLabel = totalWeightGrams >= 1000
    ? `${(totalWeightGrams / 1000).toFixed(2)} kg`
    : `${Math.round(totalWeightGrams)} g`;

  return (
    <section
      aria-labelledby="smart-cart-savings-heading"
      className="overflow-hidden rounded-3xl border border-[#ead8b8] bg-[#fff7e8] shadow-xs"
    >
      <div className="grid gap-0 lg:grid-cols-[1.05fr_1.95fr]">
        <div className="bg-[#741f23] p-6 text-white sm:p-8">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[#f0c987]">
            <PackageCheck size={22} aria-hidden="true" />
          </div>

          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#f0c987]">
            Add More, Save More on Delivery
          </p>

          <h2
            id="smart-cart-savings-heading"
            className="mt-2 text-2xl font-black tracking-tight sm:text-3xl"
          >
            Build a Smarter Cart
          </h2>

          <p className="mt-3 max-w-md text-xs leading-relaxed text-[#f4dfbf] sm:text-sm">
            Add 5–8 lightweight products in one order. We combine eligible items into one shipment,
            so the courier cost is shared across the cart instead of being repeated item by item.
          </p>

          <div className="mt-5 grid gap-2 text-[11px] text-[#f4dfbf]">
            <span className="flex items-center gap-2"><Truck size={15} /> One combined shipment</span>
            <span className="flex items-center gap-2"><Scale size={15} /> Delivery depends on combined weight + PIN</span>
            <span className="flex items-center gap-2"><Boxes size={15} /> Eligible cart offers still apply automatically</span>
          </div>

          <Link
            href="#all-products"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#f0c987] px-4 py-2.5 text-xs font-black text-[#741f23] transition hover:bg-white"
          >
            <ShoppingBag size={15} aria-hidden="true" />
            Start Shopping
          </Link>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b5843d]">Live store example</p>
              <h3 className="mt-1 text-base font-black text-[#741f23]">Add 5 small items</h3>
            </div>
            <p className="text-[10px] text-gray-500">Products change automatically from the active catalog</p>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {(loading ? Array.from({ length: 5 }) : exampleProducts).map((item: any, index) => (
              <div
                key={item?.id || `loading-${index}`}
                className="min-w-0 overflow-hidden rounded-xl border border-[#ead8b8] bg-white"
              >
                <div className="relative aspect-[4/5] bg-[#fffaf5]">
                  {item ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 18vw, 130px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="size-full animate-pulse bg-stone-100" />
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-[9px] font-bold text-stone-800">{item?.title || 'Loading product'}</p>
                  {item && <p className="mt-0.5 text-[9px] text-stone-500">{item.weightGrams} g</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-[#ead8b8] rounded-2xl border border-[#ead8b8] bg-white py-4 text-center">
            <div className="px-2">
              <p className="text-[10px] font-bold text-gray-500">Total Items</p>
              <p className="mt-1 text-lg font-black text-[#741f23]">{exampleProducts.length || 5} Items</p>
              <p className="text-[9px] text-gray-400">Example cart</p>
            </div>
            <div className="px-2">
              <p className="text-[10px] font-bold text-gray-500">Total Weight</p>
              <p className="mt-1 text-lg font-black text-[#741f23]">{totalWeightGrams > 0 ? totalWeightLabel : '—'}</p>
              <p className="text-[9px] text-gray-400">Actual product weights</p>
            </div>
            <div className="px-2">
              <p className="text-[10px] font-bold text-gray-500">Delivery Charge</p>
              <p className="mt-1 text-sm font-black text-[#741f23]">Check PIN</p>
              <p className="text-[9px] text-gray-400">Live rate at product/checkout</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-center text-[10px] font-bold leading-relaxed text-green-800">
            More lightweight items in one combined shipment can reduce the delivery cost per item.
          </div>

          <div className="mt-4 flex flex-col justify-between gap-2 rounded-xl border border-[#ead8b8] bg-white px-4 py-3 sm:flex-row sm:items-center">
            <p className="text-[10px] leading-relaxed text-gray-600">
              Retail limit: maximum <strong>5 pcs of the same Product + Size</strong>. Different sizes can each have up to 5 pcs.
            </p>
            <Link href="/contact" className="shrink-0 text-[10px] font-black text-[#741f23] underline underline-offset-2">
              Need more? Bulk Order / Contact Us
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-[#ead8b8] bg-white px-4 py-3 text-center text-[10px] leading-relaxed text-gray-500 sm:text-[11px]">
        Shipping is calculated from the combined shipment weight and delivery PIN. Any discount shown at checkout must meet the active offer conditions.
      </div>
    </section>
  );
}
