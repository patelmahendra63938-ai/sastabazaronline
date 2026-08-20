-- Phase B: add only missing temporary pricing keys; preserve all configured and unknown keys.
INSERT INTO public.store_settings (key, value, updated_at, version, updated_by)
VALUES (
  'shipping_rules',
  jsonb_build_object(
    'pricing_mode', 'temporary_slabs',
    'free_shipping_enabled', false,
    'free_shipping_threshold', 999,
    'apply_courier_charge', true,
    'shipping_slab_500g', 80,
    'shipping_slab_1000g', 110,
    'shipping_slab_2000g', 140,
    'temporary_max_weight_grams', 2000,
    'courier_markup_pct', 30,
    'weight_buffer_pct', 0,
    'cod_fee_type', 'tiered',
    'cod_fee_flat', 40,
    'cod_fee_threshold', 1000,
    'cod_fee_above_threshold', 50
  ),
  now(), 1, 'phase_b_migration'
)
ON CONFLICT (key) DO UPDATE SET
  value = public.store_settings.value || (
    excluded.value - ARRAY(SELECT jsonb_object_keys(public.store_settings.value))
  ),
  updated_at = now(),
  version = coalesce(public.store_settings.version, 0) + 1,
  updated_by = 'phase_b_migration';
