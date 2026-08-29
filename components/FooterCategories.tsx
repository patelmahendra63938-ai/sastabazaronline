'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FooterCategory {
  name: string;
  product_count: number;
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
            data.filter(
              (item): item is FooterCategory =>
                typeof item?.name === 'string' && Number(item?.product_count || 0) > 0
            )
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

  if (categories.length === 0) {
    return <li className="py-2 text-stone-400">Browse products from the main catalog</li>;
  }

  return (
    <>
      {categories.map(category => (
        <li key={category.name}>
          <Link
            href={`/category/${encodeURIComponent(category.name)}`}
            className={linkClass}
          >
            {category.name}
          </Link>
        </li>
      ))}
    </>
  );
}
