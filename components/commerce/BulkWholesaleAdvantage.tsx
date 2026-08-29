'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  PackageCheck,
  ShoppingBag,
  Truck,
  Scale,
  Boxes,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';
import { getSmartCartShippingQuoteAction } from '@/actions/smartCartShipping';

type ExampleProduct = {
  id: string;
  title: string;
  category: string | null;
  image: string;
  weightGrams: number;
  price: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

type InventoryRow = {
  available_quantity?: number | null;
  weight_kg?: number | null;
};

type ProductRow = {
  id: string;
  title: string;
  category: string | null;
  images?: string[] | null;
  price?: number | null;
  stock?: number | null;
  net_weight_grams?: number | null;
  package_length_cm?: number | null;
  package_width_cm?: number | null;
  package_height_cm?: number | null;
  inventory?: InventoryRow[] | null;
};

type SavingResult = {
  separateCharge: number;
  combinedCharge: number;
  saving: number;
};

const LIGHTWEIGHT_MAX_GRAMS = 500;

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function resolveWeightGrams(row: ProductRow) {
  const productWeight = Number(row.net_weight_grams || 0);
  if (Number.isFinite(productWeight) && productWeight > 0) {
    return Math.round(productWeight);
  }

  const inStockVariant = (row.inventory || []).find(
    (variant) =>
      Number(variant.available_quantity || 0) > 0 &&
      Number(variant.weight_kg || 0) > 0
  );

  const variantWeightKg = Number(inStockVariant?.weight_kg || 0);
  return Number.isFinite(variantWeightKg) && variantWeightKg > 0
    ? Math.round(variantWeightKg * 1000)
    : 0;
}

function hasValidDimensions(row: ProductRow) {
  return [
    row.package_length_cm,
    row.package_width_cm,
    row.package_height_cm,
  ].every((value) => Number.isFinite(Number(value)) && Number(value) > 0);
}

function selectMixedProducts(rows: ProductRow[]) {
  const eligible = shuffled(
    rows.filter((row) => {
      const weight = resolveWeightGrams(row);
      const inventoryStock = (row.inventory || []).some(
        (variant) => Number(variant.available_quantity || 0) > 0
      );
      const productStock = Number(row.stock || 0) > 0;

      return (
        weight > 0 &&
        weight <= LIGHTWEIGHT_MAX_GRAMS &&
        hasValidDimensions(row) &&
        (inventoryStock || productStock)
      );
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
    image: resolveStorefrontImageSrc(row.images?.[0]),
    weightGrams: resolveWeightGrams(row),
    price: Math.max(1, Number(row.price || 0)),
    lengthCm: Number(row.package_length_cm),
    widthCm: Number(row.package_width_cm),
    heightCm: Number(row.package_height_cm),
  }));
}

export default function BulkWholesaleAdvantage() {
  const [exampleProducts, setExampleProducts] = useState<ExampleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [pincode, setPincode] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [savingResult, setSavingResult] = useState<SavingResult | null>(null);
  const [savingError, setSavingError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadExampleProducts() {
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, title, category, images, price, stock, net_weight_grams, package_length_cm, package_width_cm, package_height_cm, inventory(available_quantity, weight_kg)'
        )
        .eq('is_active', true)
        .limit(80);

      if (!active) return;

      if (error) {
        console.error('Smart cart example query failed:', error);
        setExampleProducts([]);
      } else {
        setExampleProducts(selectMixedProducts((data || []) as ProductRow[]));
      }

      setLoading(false);
    }

    void loadExampleProducts();

    return () => {
      active = false;
    };
  }, []);

  const totalWeightGrams = useMemo(
    () => exampleProducts.reduce((sum, item) => sum + item.weightGrams, 0),
    [exampleProducts]
  );

  const totalSubtotal = useMemo(
    () => exampleProducts.reduce((sum, item) => sum + item.price, 0),
    [exampleProducts]
  );

  const combinedPackage = useMemo(() => {
    if (!exampleProducts.length) return null;
    return {
      weight: totalWeightGrams,
      length: Math.max(...exampleProducts.map((item) => item.lengthCm)),
      width: Math.max(...exampleProducts.map((item) => item.widthCm)),
      height: exampleProducts.reduce((sum, item) => sum + item.heightCm, 0),
    };
  }, [exampleProducts, totalWeightGrams]);

  const totalWeightLabel =
    totalWeightGrams >= 1000
      ? `${(totalWeightGrams / 1000).toFixed(2)} kg`
      : `${Math.round(totalWeightGrams)} g`;

  const calculateSaving = async () => {
    setSavingResult(null);
    setSavingError('');

    if (!/^\d{6}$/.test(pincode)) {
      setSavingError('Enter a valid 6-digit PIN code.');
      return;
    }

    if (exampleProducts.length < 5 || totalWeightGrams <= 0 || !combinedPackage) {
      setSavingError('Five lightweight products with valid package details are required for this example.');
      return;
    }

    setCalculating(true);

    try {
      const [combined, ...individual] = await Promise.all([
        getSmartCartShippingQuoteAction({
          pincode,
          totalWeightKg: totalWeightGrams / 1000,
          subtotal: totalSubtotal,
          packages: [combinedPackage],
        }),
        ...exampleProducts.map((item) =>
          getSmartCartShippingQuoteAction({
            pincode,
            totalWeightKg: item.weightGrams / 1000,
            subtotal: item.price,
            packages: [
              {
                weight: item.weightGrams,
                length: item.lengthCm,
                width: item.widthCm,
                height: item.heightCm,
              },
            ],
          })
        ),
      ]);

      const allRates = [combined, ...individual];
      const unavailable = allRates.find(
        (rate) => !rate.success || !rate.isServiceable
      );

      if (unavailable) {
        setSavingError(
          unavailable.error ||
            unavailable.message ||
            'Delivery is not serviceable for this PIN code.'
        );
        return;
      }

      const combinedCharge = Number(combined.customerShippingCharge || 0);
      const separateCharge = individual.reduce(
        (sum, rate) => sum + Number(rate.customerShippingCharge || 0),
        0
      );

      setSavingResult({
        separateCharge,
        combinedCharge,
        saving: Math.max(0, separateCharge - combinedCharge),
      });
    } catch (error: any) {
      setSavingError(error?.message || 'Unable to calculate delivery saving right now.');
    } finally {
      setCalculating(false);
    }
  };

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

          {!loading && exampleProducts.length < 5 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800">
              Add valid weight and package dimensions to at least 5 active lightweight products (500g or less) to enable the live saving example.
            </div>
          )}

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
              <p className="text-[10px] font-bold text-gray-500">Delivery Saving</p>
              <p className="mt-1 text-lg font-black text-green-700">
                {savingResult ? `₹${savingResult.saving.toLocaleString('en-IN')}` : 'Enter PIN'}
              </p>
              <p className="text-[9px] text-gray-400">Estimated live comparison</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[#ead8b8] bg-white p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={pincode}
                onChange={(event) => {
                  setPincode(event.target.value.replace(/\D/g, '').slice(0, 6));
                  setSavingResult(null);
                  setSavingError('');
                }}
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter delivery PIN"
                className="min-h-10 flex-1 rounded-lg border border-[#ead8b8] px-3 text-xs font-bold text-gray-800 outline-none focus:border-[#741f23]"
              />
              <button
                type="button"
                onClick={() => void calculateSaving()}
                disabled={calculating || exampleProducts.length < 5}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#741f23] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {calculating && <Loader2 size={14} className="animate-spin" />}
                {calculating ? 'Checking...' : 'See Delivery Saving'}
              </button>
            </div>

            {savingResult && (
              <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-center text-[10px] font-bold leading-relaxed text-green-800">
                Separate shipping estimate: ₹{savingResult.separateCharge.toLocaleString('en-IN')}
                {' '}→ Combined shipping estimate: ₹{savingResult.combinedCharge.toLocaleString('en-IN')}
                {' '}• You could save ₹{savingResult.saving.toLocaleString('en-IN')} on delivery.
              </div>
            )}

            {savingError && (
              <p className="mt-2 text-center text-[10px] font-bold text-red-600">{savingError}</p>
            )}
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
        Saving is an estimate using the current delivery PIN, actual product weights and package dimensions. Final shipping is calculated again at checkout.
      </div>
    </section>
  );
}
