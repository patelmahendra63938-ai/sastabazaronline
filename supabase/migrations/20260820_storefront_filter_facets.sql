CREATE OR REPLACE FUNCTION public.get_storefront_filter_facets(p_categories text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH scoped_products AS (
    SELECT p.id, p.brand, p.fabric, p.pattern, p.fit, p.occasion, p.price
    FROM public.products AS p
    WHERE p.is_active = true
      AND (
        p_categories IS NULL
        OR cardinality(p_categories) = 0
        OR p.category = ANY (p_categories)
      )
  ),
  brands AS (SELECT DISTINCT brand AS value FROM scoped_products WHERE brand IS NOT NULL AND btrim(brand) <> ''),
  fabrics AS (SELECT DISTINCT fabric AS value FROM scoped_products WHERE fabric IS NOT NULL AND btrim(fabric) <> ''),
  patterns AS (SELECT DISTINCT pattern AS value FROM scoped_products WHERE pattern IS NOT NULL AND btrim(pattern) <> ''),
  fits AS (SELECT DISTINCT fit AS value FROM scoped_products WHERE fit IS NOT NULL AND btrim(fit) <> ''),
  occasions AS (SELECT DISTINCT occasion AS value FROM scoped_products WHERE occasion IS NOT NULL AND btrim(occasion) <> ''),
  sizes AS (
    SELECT DISTINCT i.size AS value
    FROM public.inventory AS i
    INNER JOIN scoped_products AS p ON p.id = i.product_id
    WHERE i.available_quantity > 0 AND i.size IS NOT NULL AND btrim(i.size) <> ''
  )
  SELECT jsonb_build_object(
    'brands', COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM brands), '[]'::jsonb),
    'fabrics', COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM fabrics), '[]'::jsonb),
    'patterns', COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM patterns), '[]'::jsonb),
    'fits', COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM fits), '[]'::jsonb),
    'occasions', COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM occasions), '[]'::jsonb),
    'sizes', COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM sizes), '[]'::jsonb),
    'minPrice', COALESCE((SELECT min(price) FROM scoped_products), 0),
    'maxPrice', COALESCE((SELECT max(price) FROM scoped_products), 5000)
  );
$$;

REVOKE ALL ON FUNCTION public.get_storefront_filter_facets(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storefront_filter_facets(text[]) TO anon, authenticated;

COMMENT ON FUNCTION public.get_storefront_filter_facets(text[]) IS
  'Returns active storefront product facets and in-stock inventory sizes without exposing product rows.';
