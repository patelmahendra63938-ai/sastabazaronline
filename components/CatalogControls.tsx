'use client';

import React, { useState } from 'react';
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import {
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import ProductFilterPanel, {
  AvailableFilterOptions,
  FilterGroupConfig,
} from '@/components/ProductFilterPanel';

interface CatalogControlsProps {
  showFilters: boolean;
  availableOptions: AvailableFilterOptions;
  filterConfigs: FilterGroupConfig[];
}

export default function CatalogControls({
  showFilters,
  availableOptions,
  filterConfigs,
}: CatalogControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mobileFiltersOpen, setMobileFiltersOpen] =
    useState(false);

  const sortValue =
    searchParams.get('sort') || 'newest';

  const handleSortChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    const value = event.target.value;

    if (value === 'newest') {
      params.delete('sort');
    } else {
      params.set('sort', value);
    }

    params.delete('page');

    const query = params.toString();

    router.push(
      query ? `${pathname}?${query}` : pathname,
      { scroll: false }
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#ead8b8] bg-white p-3 shadow-2xs">
        <div className="flex items-center gap-2">
          {showFilters && (
            <button
              type="button"
              onClick={() =>
                setMobileFiltersOpen(true)
              }
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d7b06a] bg-[#fff7e8] px-3 text-xs font-bold text-[#741f23] transition hover:bg-[#fff2dc] lg:hidden"
            >
              <SlidersHorizontal
                size={15}
                aria-hidden="true"
              />
              Filters
            </button>
          )}

          <span className="hidden text-[11px] font-semibold text-stone-500 sm:inline">
            Refine and sort the catalog
          </span>
        </div>

        <label className="flex items-center gap-2">
          <ArrowUpDown
            size={14}
            className="text-[#741f23]"
            aria-hidden="true"
          />

          <span className="hidden text-[11px] font-bold text-stone-600 sm:inline">
            Sort
          </span>

          <select
            value={sortValue}
            onChange={handleSortChange}
            aria-label="Sort products"
            className="min-h-10 rounded-xl border border-[#ead8b8] bg-[#fffdf9] px-3 text-xs font-bold text-stone-800 outline-none transition focus:border-[#b5843d] focus:ring-2 focus:ring-[#f6e0bb]"
          >
            <option value="newest">
              Newest
            </option>
            <option value="price_asc">
              Price: Low to High
            </option>
            <option value="price_desc">
              Price: High to Low
            </option>
          </select>
        </label>
      </div>

      {showFilters && (
        <ProductFilterPanel
          availableOptions={availableOptions}
          filterConfigs={filterConfigs}
          isOpenMobile={mobileFiltersOpen}
          onCloseMobile={() =>
            setMobileFiltersOpen(false)
          }
          showDesktop={false}
        />
      )}
    </>
  );
}
