'use client';

import React, { useEffect, useState } from 'react';
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export interface FilterGroupConfig {
  filter_key: string;
  display_name: string;
  is_enabled: boolean;
  display_order: number;
}

export interface AvailableFilterOptions {
  categories?: string[];
  brands?: string[];
  fabrics?: string[];
  patterns?: string[];
  fits?: string[];
  occasions?: string[];
  sizes?: string[];
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductFilterPanelProps {
  availableOptions?: AvailableFilterOptions;
  categories?: string[];
  filterConfigs?: FilterGroupConfig[];
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function ProductFilterPanel({
  availableOptions,
  categories = [],
  filterConfigs = [],
  isOpenMobile = false,
  onCloseMobile,
}: ProductFilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safeOptions: Required<AvailableFilterOptions> = {
    categories: availableOptions?.categories || categories || [],
    brands: availableOptions?.brands || [],
    fabrics: availableOptions?.fabrics || [],
    patterns: availableOptions?.patterns || [],
    fits: availableOptions?.fits || [],
    occasions: availableOptions?.occasions || [],
    sizes: availableOptions?.sizes || [],
    minPrice: availableOptions?.minPrice ?? 0,
    maxPrice: availableOptions?.maxPrice ?? 5000,
  };

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const [minPriceInput, setMinPriceInput] = useState<string>(
    searchParams.get('minPrice') || ''
  );

  const [maxPriceInput, setMaxPriceInput] = useState<string>(
    searchParams.get('maxPrice') || ''
  );

  useEffect(() => {
    setMinPriceInput(searchParams.get('minPrice') || '');
    setMaxPriceInput(searchParams.get('maxPrice') || '');
  }, [searchParams]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggleOption = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    const currentValues = params.get(key)
      ? params.get(key)!.split(',')
      : [];

    let updatedValues: string[];

    if (currentValues.includes(value)) {
      updatedValues = currentValues.filter((v) => v !== value);
    } else {
      updatedValues = [...currentValues, value];
    }

    if (updatedValues.length > 0) {
      params.set(key, updatedValues.join(','));
    } else {
      params.delete(key);
    }

    params.delete('page');

    const query = params.toString();

    router.push(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const handleApplyPrice = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (minPriceInput) {
      params.set('minPrice', minPriceInput);
    } else {
      params.delete('minPrice');
    }

    if (maxPriceInput) {
      params.set('maxPrice', maxPriceInput);
    } else {
      params.delete('maxPrice');
    }

    params.delete('page');

    const query = params.toString();

    router.push(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleClearAll = () => {
    setMinPriceInput('');
    setMaxPriceInput('');

    router.push(pathname, {
      scroll: false,
    });

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const supportedFilterKeys = new Set([
    'category',
    'price',
    'size',
    'brand',
    'fabric',
    'pattern',
    'occasion',
    'fit',
  ]);

  const activeParamsCount = Array.from(searchParams.keys()).filter(
    (key) =>
      supportedFilterKeys.has(key) ||
      key === 'minPrice' ||
      key === 'maxPrice'
  ).length;

  const sectionClass =
    'border-b border-[#f0e3cf] py-3.5';

  const sectionButtonClass =
    'mb-2 flex w-full cursor-pointer items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-900 transition hover:text-[#741f23]';

  const checkboxClass =
    'h-3.5 w-3.5 cursor-pointer rounded border-stone-300 text-[#741f23] accent-[#741f23] focus:ring-[#d7aa5b]';

  const renderFilterSection = (config: FilterGroupConfig) => {
    if (!config || !config.is_enabled) {
      return null;
    }

    const isCollapsed = collapsedSections[config.filter_key];

    switch (config.filter_key) {
      case 'category': {
        if (
          !safeOptions.categories ||
          safeOptions.categories.length === 0
        ) {
          return null;
        }

        const selectedCategories =
          searchParams.get('category')?.split(',') || [];

        return (
          <div key="category" className={sectionClass}>
            <button
              type="button"
              onClick={() => toggleSection('category')}
              className={sectionButtonClass}
            >
              <span>
                {config.display_name || 'Category'}
              </span>

              {isCollapsed ? (
                <ChevronDown
                  size={14}
                  className="text-[#b5843d]"
                />
              ) : (
                <ChevronUp
                  size={14}
                  className="text-[#b5843d]"
                />
              )}
            </button>

            {!isCollapsed && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {safeOptions.categories.map((cat) => (
                  <label
                    key={cat}
                    className="flex cursor-pointer items-center gap-2 py-0.5 text-xs text-stone-700 transition hover:text-[#741f23]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() =>
                        handleToggleOption('category', cat)
                      }
                      className={checkboxClass}
                    />

                    <span className="truncate">
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'price': {
        return (
          <div key="price" className={sectionClass}>
            <button
              type="button"
              onClick={() => toggleSection('price')}
              className={sectionButtonClass}
            >
              <span>
                {config.display_name || 'Price'}
              </span>

              {isCollapsed ? (
                <ChevronDown
                  size={14}
                  className="text-[#b5843d]"
                />
              ) : (
                <ChevronUp
                  size={14}
                  className="text-[#b5843d]"
                />
              )}
            </button>

            {!isCollapsed && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="block text-[10px] font-semibold text-stone-500">
                      Min ₹
                    </span>

                    <input
                      type="number"
                      placeholder={safeOptions.minPrice.toString()}
                      value={minPriceInput}
                      onChange={(e) =>
                        setMinPriceInput(e.target.value)
                      }
                      className="w-full rounded-lg border border-[#ead8b8] bg-[#fffaf5] px-2 py-1.5 text-xs outline-none transition focus:border-[#b5843d] focus:bg-white focus:ring-1 focus:ring-[#d7aa5b]"
                    />
                  </div>

                  <span className="mt-3 text-xs text-stone-400">
                    -
                  </span>

                  <div className="flex-1">
                    <span className="block text-[10px] font-semibold text-stone-500">
                      Max ₹
                    </span>

                    <input
                      type="number"
                      placeholder={safeOptions.maxPrice.toString()}
                      value={maxPriceInput}
                      onChange={(e) =>
                        setMaxPriceInput(e.target.value)
                      }
                      className="w-full rounded-lg border border-[#ead8b8] bg-[#fffaf5] px-2 py-1.5 text-xs outline-none transition focus:border-[#b5843d] focus:bg-white focus:ring-1 focus:ring-[#d7aa5b]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyPrice}
                  className="w-full cursor-pointer rounded-lg bg-[#741f23] py-2 text-[11px] font-bold text-white transition hover:bg-[#5e171b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b] focus-visible:ring-offset-2"
                >
                  Apply Price
                </button>
              </div>
            )}
          </div>
        );
      }

      case 'size': {
        if (
          !safeOptions.sizes ||
          safeOptions.sizes.length === 0
        ) {
          return null;
        }

        const selectedSizes =
          searchParams.get('size')?.split(',') || [];

        return (
          <div key="size" className={sectionClass}>
            <button
              type="button"
              onClick={() => toggleSection('size')}
              className={sectionButtonClass}
            >
              <span>
                {config.display_name || 'Size'}
              </span>

              {isCollapsed ? (
                <ChevronDown
                  size={14}
                  className="text-[#b5843d]"
                />
              ) : (
                <ChevronUp
                  size={14}
                  className="text-[#b5843d]"
                />
              )}
            </button>

            {!isCollapsed && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {safeOptions.sizes.map((size) => {
                  const isSelected =
                    selectedSizes.includes(size);

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        handleToggleOption('size', size)
                      }
                      className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                        isSelected
                          ? 'border-[#741f23] bg-[#741f23] text-white shadow-sm'
                          : 'border-[#ead8b8] bg-[#fffaf5] text-stone-700 hover:border-[#b5843d] hover:text-[#741f23]'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      default: {
        const key = config.filter_key;

        const optionKey =
          `${key}s` as keyof typeof safeOptions;

        const configuredOptions =
          safeOptions[optionKey];

        const directOptions =
          safeOptions[
            key as keyof typeof safeOptions
          ];

        const optionsList = Array.isArray(
          configuredOptions
        )
          ? configuredOptions
          : Array.isArray(directOptions)
            ? directOptions
            : [];

        if (!optionsList.length) {
          return null;
        }

        const selectedValues =
          searchParams.get(key)?.split(',') || [];

        return (
          <div key={key} className={sectionClass}>
            <button
              type="button"
              onClick={() => toggleSection(key)}
              className={sectionButtonClass}
            >
              <span>{config.display_name}</span>

              {isCollapsed ? (
                <ChevronDown
                  size={14}
                  className="text-[#b5843d]"
                />
              ) : (
                <ChevronUp
                  size={14}
                  className="text-[#b5843d]"
                />
              )}
            </button>

            {!isCollapsed && (
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {optionsList.map((opt: string) => (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2 py-0.5 text-xs text-stone-700 transition hover:text-[#741f23]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(opt)}
                      onChange={() =>
                        handleToggleOption(key, opt)
                      }
                      className={checkboxClass}
                    />

                    <span className="truncate">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      }
    }
  };

  const sortedConfigs = [...filterConfigs]
    .filter((config) =>
      supportedFilterKeys.has(config.filter_key)
    )
    .sort(
      (a, b) =>
        a.display_order - b.display_order
    );

  if (
    safeOptions.patterns.length > 0 &&
    !sortedConfigs.some(
      (config) => config.filter_key === 'pattern'
    )
  ) {
    sortedConfigs.push({
      filter_key: 'pattern',
      display_name: 'Pattern',
      is_enabled: true,
      display_order:
        Math.max(
          0,
          ...sortedConfigs.map(
            (config) => config.display_order
          )
        ) + 1,
    });
  }

  const defaultFilterConfigs: FilterGroupConfig[] = [
    {
      filter_key: 'category',
      display_name: 'Categories',
      is_enabled: true,
      display_order: 1,
    },
    {
      filter_key: 'price',
      display_name: 'Price Range',
      is_enabled: true,
      display_order: 2,
    },
  ];

  const activeConfigs =
    sortedConfigs.length > 0
      ? sortedConfigs
      : defaultFilterConfigs;

  const filterContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#ead8b8] pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            size={16}
            className="text-[#741f23]"
          />

          <h3 className="text-sm font-bold uppercase tracking-wider text-[#741f23]">
            Filters
          </h3>
        </div>

        {activeParamsCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[#b5843d] transition hover:text-[#741f23]"
          >
            <RotateCcw size={11} />
            CLEAR ALL
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {activeConfigs.map((config) =>
          renderFilterSection(config)
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-24 hidden max-h-[calc(100vh-120px)] w-64 overflow-hidden rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-4 shadow-sm lg:block">
        {filterContent}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />

          <div className="relative z-10 flex h-full w-full max-w-xs flex-col bg-[#fffdf9] p-5 shadow-2xl">
            <div className="flex justify-end pb-2">
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close filters"
                className="cursor-pointer rounded-lg bg-[#fff2dc] p-2 text-[#741f23] transition hover:bg-[#f6e0bb]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {filterContent}
            </div>

            <div className="flex gap-2 border-t border-[#ead8b8] pt-4">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 cursor-pointer rounded-xl border border-[#d7aa5b] py-2.5 text-xs font-bold text-[#741f23] transition hover:bg-[#fff2dc]"
              >
                CLEAR ALL
              </button>

              <button
                type="button"
                onClick={onCloseMobile}
                className="flex-1 cursor-pointer rounded-xl bg-[#741f23] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#5e171b]"
              >
                APPLY FILTERS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProductFilterPanel;