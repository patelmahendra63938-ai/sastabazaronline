-- SASTABAZARONLINE: exact physical product weight
-- Run this in Supabase Dashboard -> SQL Editor -> New Query.
-- This file is intentionally NOT executed automatically against your Supabase project.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS net_weight_grams INTEGER;

ALTER TABLE public.products
ADD CONSTRAINT products_net_weight_grams_positive
CHECK (net_weight_grams IS NULL OR net_weight_grams > 0);

CREATE INDEX IF NOT EXISTS idx_products_net_weight_grams
ON public.products(net_weight_grams);

COMMENT ON COLUMN public.products.net_weight_grams IS
'Exact physical product weight entered by admin in grams. No courier weight slabs.';

-- After the application has been updated and existing product weights have been
-- verified, you can backfill this column from the old net_weight column if
-- net_weight is stored in kilograms:
--
-- UPDATE public.products
-- SET net_weight_grams = ROUND(net_weight * 1000)::integer
-- WHERE net_weight_grams IS NULL
--   AND net_weight IS NOT NULL
--   AND net_weight > 0;
