'use client';

import React from 'react';
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { RotateCcw, X } from 'lucide-react';

export function ActiveFilterChips() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chips: {
    key: string;
    value: string;
    label: string;
  }[] = [];

  const supportedFilterKeys = new Set([
    'category',
    'brand',
    'fabric',
    'pattern',
    'occasion',
    'fit',
    'size',
    'minPrice',
    'maxPrice',
  ]);

  searchParams.forEach((val, key) => {
    if (!supportedFilterKeys.has(key)) return;

    if (key === 'minPrice') {
      chips.push({
        key,
        value: val,
        label: `Min ₹${val}`,
      });
      return;
    }

    if (key === 'maxPrice') {
      chips.push({
        key,
        value: val,
        label: `Max ₹${val}`,
      });
      return;
    }

    val.split(',').forEach((value) => {
      if (!value) return;

      chips.push({
        key,
        value,
        label: value,
      });
    });
  });

  if (chips.length === 0) return null;

  const pushParams = (params: URLSearchParams) => {
    params.delete('page');
    const query = params.toString();

    router.push(
      query ? `${pathname}?${query}` : pathname,
      { scroll: false }
    );
  };

  const handleRemoveChip = (
    targetKey: string,
    targetValue: string
  ) => {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (
      targetKey === 'minPrice' ||
      targetKey === 'maxPrice'
    ) {
      params.delete(targetKey);
      pushParams(params);
      return;
    }

    const current =
      params.get(targetKey)?.split(',') || [];

    const updated = current.filter(
      value => value !== targetValue
    );

    if (updated.length > 0) {
      params.set(targetKey, updated.join(','));
    } else {
      params.delete(targetKey);
    }

    pushParams(params);
  };

  const handleClearAll = () => {
    const params = new URLSearchParams();

    const search = searchParams.get('q');
    const sort = searchParams.get('sort');

    if (search) params.set('q', search);
    if (sort) params.set('sort', sort);

    pushParams(params);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#ead8b8] bg-[#fffdf9] px-3 py-2.5">
      <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
        Active filters
      </span>

      {chips.map((chip, index) => (
        <span
          key={`${chip.key}-${chip.value}-${index}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2c68f] bg-[#fff7e8] px-2.5 py-1 text-[11px] font-bold text-[#741f23]"
        >
          {chip.label}

          <button
            type="button"
            onClick={() =>
              handleRemoveChip(
                chip.key,
                chip.value
              )
            }
            aria-label={`Remove ${chip.label} filter`}
            className="cursor-pointer text-[#b5843d] transition hover:text-[#741f23]"
          >
            <X size={12} />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={handleClearAll}
        className="ml-1 inline-flex cursor-pointer items-center gap-1 text-[10px] font-black uppercase tracking-wide text-[#741f23] transition hover:text-[#b5843d]"
      >
        <RotateCcw size={11} />
        Clear filters
      </button>
    </div>
  );
}

export default ActiveFilterChips;
