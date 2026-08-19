-- Phase A: secure non-secret store settings writes and normalize the existing
-- shipping_rules JSON without deleting legacy rows or keys.

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access store settings"
  ON public.store_settings;

CREATE POLICY "Staff and admin write store settings"
  ON public.store_settings
  FOR ALL
  TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

INSERT INTO public.store_settings (
  key,
  value,
  updated_at,
  version,
  updated_by
)
VALUES (
  'shipping_rules',
  jsonb_build_object(
    'free_shipping_enabled', false,
    'free_shipping_threshold', 499,
    'apply_courier_charge', true,
    'courier_markup_pct', 30,
    'weight_buffer_pct', 0,
    'cod_fee_type', 'tiered',
    'cod_fee_flat', 40,
    'cod_fee_threshold', 1000,
    'cod_fee_above_threshold', 50
  ),
  now(),
  1,
  'phase_a_migration'
)
ON CONFLICT (key) DO UPDATE
SET
  value = public.store_settings.value || jsonb_build_object(
    'free_shipping_enabled', coalesce(
      public.store_settings.value -> 'free_shipping_enabled',
      excluded.value -> 'free_shipping_enabled'
    ),
    'free_shipping_threshold', coalesce(
      public.store_settings.value -> 'free_shipping_threshold',
      excluded.value -> 'free_shipping_threshold'
    ),
    'apply_courier_charge', coalesce(
      public.store_settings.value -> 'apply_courier_charge',
      excluded.value -> 'apply_courier_charge'
    ),
    'courier_markup_pct', coalesce(
      public.store_settings.value -> 'courier_markup_pct',
      public.store_settings.value -> 'cost_buffer_pct',
      excluded.value -> 'courier_markup_pct'
    ),
    'weight_buffer_pct', coalesce(
      public.store_settings.value -> 'weight_buffer_pct',
      excluded.value -> 'weight_buffer_pct'
    ),
    'cod_fee_type', coalesce(
      public.store_settings.value -> 'cod_fee_type',
      excluded.value -> 'cod_fee_type'
    ),
    'cod_fee_flat', coalesce(
      public.store_settings.value -> 'cod_fee_flat',
      public.store_settings.value -> 'cod_charge',
      excluded.value -> 'cod_fee_flat'
    ),
    'cod_fee_threshold', coalesce(
      public.store_settings.value -> 'cod_fee_threshold',
      excluded.value -> 'cod_fee_threshold'
    ),
    'cod_fee_above_threshold', coalesce(
      public.store_settings.value -> 'cod_fee_above_threshold',
      excluded.value -> 'cod_fee_above_threshold'
    )
  ),
  updated_at = now(),
  version = coalesce(public.store_settings.version, 0) + 1,
  updated_by = 'phase_a_migration';

