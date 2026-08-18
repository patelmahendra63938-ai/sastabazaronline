'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { X, RotateCcw } from 'lucide-react';

export function ActiveFilterChips() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chips: { key: string; value: string; label: string }[] = [];

  searchParams.forEach((val, key) => {
    if (key === 'q' || key === 'sort') return;
    if (key === 'minPrice') {
      chips.push({ key, value: val, label: `Min ₹${val}` });
    } else if (key === 'maxPrice') {
      chips.push({ key, value: val, label: `Max ₹${val}` });
    } else {
      const values = val.split(',');
      values.forEach(v => {
        chips.push({ key, value: v, label: v });
      });
    }
  });

  if (chips.length === 0) return null;

  const handleRemoveChip = (targetKey: string, targetValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (targetKey === 'minPrice' || targetKey === 'maxPrice') {
      params.delete(targetKey);
    } else {
      const current = params.get(targetKey)?.split(',') || [];
      const updated = current.filter(v => v !== targetValue);
      if (updated.length > 0) {
        params.set(targetKey, updated.join(','));
      } else {
        params.delete(targetKey);
      }
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleClearAll = () => {
    const params = new URLSearchParams();
    if (searchParams.get('q')) params.set('q', searchParams.get('q')!);
    if (searchParams.get('sort')) params.set('sort', searchParams.get('sort')!);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active:</span>
      {chips.map((chip, index) => (
        <span
          key={`${chip.key}-${chip.value}-${index}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-orange-50 text-orange-950 border border-orange-200 rounded-lg"
        >
          {chip.label}
          <button
            onClick={() => handleRemoveChip(chip.key, chip.value)}
            className="text-orange-600 hover:text-orange-800"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        onClick={handleClearAll}
        className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 ml-1"
      >
        <RotateCcw size={11} /> Clear All
      </button>
    </div>
  );
}

export default ActiveFilterChips;