'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp, X, SlidersHorizontal, RotateCcw } from 'lucide-react';

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
  categories?: string[]; // Fallback support for direct category array prop
  filterConfigs?: FilterGroupConfig[];
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function ProductFilterPanel({
  availableOptions,
  categories = [],
  filterConfigs = [],
  isOpenMobile = false,
  onCloseMobile
}: ProductFilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 🛡️ Safe fallback to guarantee no undefined crashes
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

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [minPriceInput, setMinPriceInput] = useState<string>(searchParams.get('minPrice') || '');
  const [maxPriceInput, setMaxPriceInput] = useState<string>(searchParams.get('maxPrice') || '');

  useEffect(() => {
    setMinPriceInput(searchParams.get('minPrice') || '');
    setMaxPriceInput(searchParams.get('maxPrice') || '');
  }, [searchParams]);

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleOption = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentValues = params.get(key) ? params.get(key)!.split(',') : [];
    
    let updatedValues: string[];
    if (currentValues.includes(value)) {
      updatedValues = currentValues.filter(v => v !== value);
    } else {
      updatedValues = [...currentValues, value];
    }

    if (updatedValues.length > 0) {
      params.set(key, updatedValues.join(','));
    } else {
      params.delete(key);
    }
    params.delete('page');

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleApplyPrice = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (minPriceInput) params.set('minPrice', minPriceInput);
    else params.delete('minPrice');

    if (maxPriceInput) params.set('maxPrice', maxPriceInput);
    else params.delete('maxPrice');
    params.delete('page');

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    if (onCloseMobile) onCloseMobile();
  };

  const handleClearAll = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    router.push(pathname, { scroll: false });
    if (onCloseMobile) onCloseMobile();
  };

  const supportedFilterKeys = new Set(['category', 'price', 'size', 'brand', 'fabric', 'pattern', 'occasion', 'fit']);
  const activeParamsCount = Array.from(searchParams.keys()).filter(k => supportedFilterKeys.has(k) || k === 'minPrice' || k === 'maxPrice').length;

  const renderFilterSection = (config: FilterGroupConfig) => {
    if (!config || !config.is_enabled) return null;
    const isCollapsed = collapsedSections[config.filter_key];

    switch (config.filter_key) {
      case 'category':
        if (!safeOptions.categories || safeOptions.categories.length === 0) return null;
        const selectedCategories = searchParams.get('category')?.split(',') || [];
        return (
          <div key="category" className="border-b border-gray-100 py-3.5">
            <button
              type="button"
              onClick={() => toggleSection('category')}
              className="flex items-center justify-between w-full text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 cursor-pointer"
            >
              <span>{config.display_name || 'Category'}</span>
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            {!isCollapsed && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {safeOptions.categories.map(cat => (
                  <label key={cat} className="flex items-center gap-2 text-xs text-gray-700 hover:text-indigo-950 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => handleToggleOption('category', cat)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                    />
                    <span className="truncate">{cat}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );

      case 'price':
        return (
          <div key="price" className="border-b border-gray-100 py-3.5">
            <button
              type="button"
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 cursor-pointer"
            >
              <span>{config.display_name || 'Price'}</span>
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            {!isCollapsed && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-gray-500 font-semibold block">Min ₹</span>
                    <input
                      type="number"
                      placeholder={safeOptions.minPrice.toString()}
                      value={minPriceInput}
                      onChange={e => setMinPriceInput(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-600 bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <span className="text-gray-400 text-xs mt-3">-</span>
                  <div className="flex-1">
                    <span className="text-[10px] text-gray-500 font-semibold block">Max ₹</span>
                    <input
                      type="number"
                      placeholder={safeOptions.maxPrice.toString()}
                      value={maxPriceInput}
                      onChange={e => setMaxPriceInput(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-600 bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyPrice}
                  className="w-full bg-indigo-950 hover:bg-indigo-900 text-white font-bold text-[11px] py-1.5 rounded-lg transition cursor-pointer"
                >
                  Apply Price
                </button>
              </div>
            )}
          </div>
        );

      case 'size':
        if (!safeOptions.sizes || safeOptions.sizes.length === 0) return null;
        const selectedSizes = searchParams.get('size')?.split(',') || [];
        return (
          <div key="size" className="border-b border-gray-100 py-3.5">
            <button
              type="button"
              onClick={() => toggleSection('size')}
              className="flex items-center justify-between w-full text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 cursor-pointer"
            >
              <span>{config.display_name || 'Size'}</span>
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            {!isCollapsed && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {safeOptions.sizes.map(size => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleToggleOption('size', size)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400'
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

      default:
        const key = config.filter_key;
        const optionKey = `${key}s` as keyof typeof safeOptions;
        const configuredOptions = safeOptions[optionKey];
        const directOptions = safeOptions[key as keyof typeof safeOptions];
        const optionsList = Array.isArray(configuredOptions)
          ? configuredOptions
          : Array.isArray(directOptions)
            ? directOptions
            : [];
        if (!optionsList || !optionsList.length) return null;

        const selectedValues = searchParams.get(key)?.split(',') || [];

        return (
          <div key={key} className="border-b border-gray-100 py-3.5">
            <button
              type="button"
              onClick={() => toggleSection(key)}
              className="flex items-center justify-between w-full text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 cursor-pointer"
            >
              <span>{config.display_name}</span>
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            {!isCollapsed && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {optionsList.map((opt: string) => (
                  <label key={opt} className="flex items-center gap-2 text-xs text-gray-700 hover:text-indigo-950 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(opt)}
                      onChange={() => handleToggleOption(key, opt)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                    />
                    <span className="truncate">{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  const sortedConfigs = [...filterConfigs]
    .filter(config => supportedFilterKeys.has(config.filter_key))
    .sort((a, b) => a.display_order - b.display_order);

  if (safeOptions.patterns.length > 0 && !sortedConfigs.some(config => config.filter_key === 'pattern')) {
    sortedConfigs.push({
      filter_key: 'pattern',
      display_name: 'Pattern',
      is_enabled: true,
      display_order: Math.max(0, ...sortedConfigs.map(config => config.display_order)) + 1,
    });
  }

  // If no database filter config exists, render default Category & Price filters
  const defaultFilterConfigs: FilterGroupConfig[] = [
    { filter_key: 'category', display_name: 'Categories', is_enabled: true, display_order: 1 },
    { filter_key: 'price', display_name: 'Price Range', is_enabled: true, display_order: 2 },
  ];

  const activeConfigs = sortedConfigs.length > 0 ? sortedConfigs : defaultFilterConfigs;

  const filterContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-indigo-950" />
          <h3 className="font-bold text-sm text-indigo-950 uppercase tracking-wider">Filters</h3>
        </div>
        {activeParamsCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={11} /> CLEAR ALL
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {activeConfigs.map(config => renderFilterSection(config))}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm sticky top-24 max-h-[calc(100vh-120px)] overflow-hidden">
        {filterContent}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-full max-w-xs bg-white h-full shadow-2xl flex flex-col p-5 z-10">
            <div className="flex justify-end pb-2">
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-gray-500 hover:text-gray-900 bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {filterContent}
            </div>
            <div className="pt-4 border-t border-gray-200 flex gap-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                CLEAR ALL
              </button>
              <button
                type="button"
                onClick={onCloseMobile}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 cursor-pointer"
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
