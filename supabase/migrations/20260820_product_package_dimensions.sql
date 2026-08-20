ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS package_length_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS package_width_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS package_height_cm numeric(8,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_package_length_cm_positive'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_package_length_cm_positive
      CHECK (package_length_cm IS NULL OR package_length_cm > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_package_width_cm_positive'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_package_width_cm_positive
      CHECK (package_width_cm IS NULL OR package_width_cm > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_package_height_cm_positive'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_package_height_cm_positive
      CHECK (package_height_cm IS NULL OR package_height_cm > 0);
  END IF;
END
$$;
