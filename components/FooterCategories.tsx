'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface FooterCategory {
  name: string;
  main_category: string;
  product_count: number;
}

interface FooterCategoryGroup {
  name: string;
  subcategories: FooterCategory[];
}

const linkClass =
  'inline-flex min-h-10 items-center text-stone-300 hover:text-[#e7c98d] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7aa5b] rounded';

export default function FooterCategories() {
  const [categories, setCategories] = useState<FooterCategory[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/catalog/categories', { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : []))
      .then(data => {
        if (!cancelled && Array.isArray(data)) {
          setCategories(
            data
              .filter(
                item =>
                  typeof item?.name === 'string' && Number(item?.product_count || 0) > 0
              )
              .map(item => ({
                name: item.name,
                main_category:
                  typeof item?.main_category === 'string' && item.main_category.trim()
                    ? item.main_category
                    : item.name,
                product_count: Number(item.product_count || 0),
              }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryGroups = useMemo<FooterCategoryGroup[]>(() => {
    const grouped = new Map<string, FooterCategoryGroup>();

    for (const category of categories) {
      const key = category.main_category.trim().toLowerCase();
      const current = grouped.get(key) || {
        name: category.main_category,
        subcategories: [],
      };
      current.subcategories.push(category);
      grouped.set(key, current);
    }

    return Array.from(grouped.values());
  }, [categories]);

  return (
    <>
      {categoryGroups.length === 0 ? (
        <li className="py-2 text-stone-400">Browse products from the main catalog</li>
      ) : (
        categoryGroups.flatMap(group => [
          <li key={`main-${group.name}`}>
            <Link
              href={`/category/${encodeURIComponent(group.name)}`}
              className={`${linkClass} font-bold text-[#e7c98d]`}
            >
              {group.name}
            </Link>
          </li>,
          ...group.subcategories.map(category => (
            <li key={`${group.name}-${category.name}`} className="pl-3">
              <Link
                href={`/category/${encodeURIComponent(category.name)}`}
                className={linkClass}
              >
                {category.name}
              </Link>
            </li>
          )),
        ])
      )}
    </>
  );
}
