import { createClient } from '@supabase/supabase-js';
import { CATEGORY_ENGINE } from '@/lib/category-attributes';
import { getStorefrontFallbackProducts } from '@/lib/storefront/catalog-fallback';

export interface StorefrontCategoryProduct {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
}

export interface StorefrontCategoryRow {
  id: string;
  name: string;
  homepage_featured?: boolean | null;
  homepage_display_order?: number | null;
  homepage_image_url?: string | null;
  display_order?: number | null;
}

export interface ActiveStorefrontCategory extends StorefrontCategoryRow {
  main_category: string;
  product_count: number;
  product_ids: string[];
}

export function normalizeStorefrontCategory(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCategoryConfig(category?: string | null) {
  const wanted = normalizeStorefrontCategory(category);
  return Object.values(CATEGORY_ENGINE).find(
    config => normalizeStorefrontCategory(config.name) === wanted
  );
}

function readSavedSubcategory(description?: string | null) {
  if (!description) return null;
  const match = description.match(/(?:catalog\s+)?sub\s*category\s*:\s*([^\n\r]+)/i);
  return match?.[1]?.trim() || null;
}

function productTypeMatches(text: string, productType: string) {
  const type = normalizeStorefrontCategory(productType)
    .replace(/\bsets?\b/g, '')
    .replace(/\band\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return Boolean(type && text.includes(type));
}

export function classifyStorefrontCategory(product: StorefrontCategoryProduct) {
  const config = findCategoryConfig(product.category);
  if (!config) return product.category?.trim() || null;

  const saved = readSavedSubcategory(product.description);
  if (saved) {
    const match = config.subcategories.find(
      subcategory =>
        normalizeStorefrontCategory(subcategory.name) ===
        normalizeStorefrontCategory(saved)
    );
    if (match) return match.name;
  }

  const text = normalizeStorefrontCategory(
    `${product.title || ''} ${product.description || ''}`
  );

  if (normalizeStorefrontCategory(config.name) === normalizeStorefrontCategory('Fashion & Apparel')) {
    if (/\bgirls?\b/.test(text) && /(night|pyjama|pajama|sleepwear)/.test(text)) {
      return 'Girls';
    }
    if (/(dhoti choli|saree|kurti|kurta|lehenga|anarkali|gown|sharara)/.test(text)) {
      return 'Women Ethnic Wear';
    }
    if (/\bmen\b|\bmens\b|\bshirt\b|\btrouser\b|\bjeans\b/.test(text)) {
      return 'Men Ethnic & Western';
    }
  }

  for (const subcategory of config.subcategories) {
    if (subcategory.productTypes.some(productType => productTypeMatches(text, productType))) {
      return subcategory.name;
    }
  }

  if (config.subcategories.length === 1) return config.subcategories[0].name;
  return null;
}

function resolveMainCategory(product: StorefrontCategoryProduct) {
  const config = findCategoryConfig(product.category);
  return config?.name || product.category?.trim() || null;
}

export function buildActiveStorefrontCategories(
  products: StorefrontCategoryProduct[],
  categoryRows: StorefrontCategoryRow[] = []
): ActiveStorefrontCategory[] {
  const grouped = new Map<
    string,
    { name: string; main_category: string; ids: string[] }
  >();

  for (const product of products) {
    const name = classifyStorefrontCategory(product);
    const mainCategory = resolveMainCategory(product);
    if (!name || !mainCategory) continue;

    const key = `${normalizeStorefrontCategory(mainCategory)}::${normalizeStorefrontCategory(name)}`;
    const current = grouped.get(key) || {
      name,
      main_category: mainCategory,
      ids: [],
    };
    current.ids.push(product.id);
    grouped.set(key, current);
  }

  const rowByName = new Map(
    categoryRows.map(row => [normalizeStorefrontCategory(row.name), row])
  );

  return Array.from(grouped.entries())
    .map(([key, value], index) => {
      const row = rowByName.get(normalizeStorefrontCategory(value.name));
      return {
        id: row?.id || `derived-${key.replace(/[^a-z0-9]+/g, '-')}`,
        name: value.name,
        main_category: value.main_category,
        homepage_featured: row?.homepage_featured || false,
        homepage_display_order:
          row?.homepage_display_order ?? row?.display_order ?? index + 100,
        homepage_image_url: row?.homepage_image_url || null,
        display_order: row?.display_order ?? index + 100,
        product_count: value.ids.length,
        product_ids: value.ids,
      };
    })
    .filter(category => category.product_count > 0)
    .sort((a, b) => {
      const mainCompare = a.main_category.localeCompare(b.main_category);
      if (mainCompare !== 0) return mainCompare;
      const featured = Number(Boolean(b.homepage_featured)) - Number(Boolean(a.homepage_featured));
      if (featured !== 0) return featured;
      return Number(a.homepage_display_order || 0) - Number(b.homepage_display_order || 0);
    });
}

export async function getActiveStorefrontCategories() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [] as ActiveStorefrontCategory[];

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [productsResult, categoriesResult, fallbackProducts] = await Promise.all([
    supabase
      .from('products')
      .select('id, title, description, category')
      .eq('is_active', true),
    supabase
      .from('categories')
      .select('id, name, homepage_featured, homepage_display_order, homepage_image_url, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    getStorefrontFallbackProducts(),
  ]);

  let products = (productsResult.data || []) as StorefrontCategoryProduct[];
  if (productsResult.error || products.length === 0) {
    console.error(
      'Active storefront category product lookup failed; using cached catalog when available:',
      productsResult.error?.message ?? 'No products returned'
    );

    if (fallbackProducts.length > 0) {
      products = fallbackProducts.map(product => ({
        id: product.id,
        title: product.title || null,
        description: product.description || null,
        category: product.category || null,
      }));
    }
  }

  if (products.length === 0) return [] as ActiveStorefrontCategory[];

  if (categoriesResult.error) {
    console.error(
      'Active storefront category merchandising lookup failed; using derived category ordering:',
      categoriesResult.error.message
    );
  }

  return buildActiveStorefrontCategories(
    products,
    (categoriesResult.data || []) as StorefrontCategoryRow[]
  );
}

export async function getActiveStorefrontCategoryByName(name: string) {
  const wanted = normalizeStorefrontCategory(name);
  const categories = await getActiveStorefrontCategories();

  const direct = categories.find(
    category => normalizeStorefrontCategory(category.name) === wanted
  );
  if (direct) return direct;

  const children = categories.filter(
    category => normalizeStorefrontCategory(category.main_category) === wanted
  );
  if (children.length === 0) return null;

  const productIds = Array.from(
    new Set(children.flatMap(category => category.product_ids))
  );
  const canonicalName = children[0].main_category;

  return {
    id: `main-${wanted.replace(/\s+/g, '-')}`,
    name: canonicalName,
    main_category: canonicalName,
    homepage_featured: false,
    homepage_display_order: Math.min(
      ...children.map(category => Number(category.homepage_display_order || 100))
    ),
    homepage_image_url:
      children.find(category => category.homepage_image_url)?.homepage_image_url || null,
    display_order: Math.min(
      ...children.map(category => Number(category.display_order || 100))
    ),
    product_count: productIds.length,
    product_ids: productIds,
  } satisfies ActiveStorefrontCategory;
}
