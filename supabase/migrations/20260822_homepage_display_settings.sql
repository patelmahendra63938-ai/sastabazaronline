-- Homepage display settings are public storefront configuration, while writes
-- remain protected by the existing staff/admin store_settings policy.

DROP POLICY IF EXISTS "Public read homepage display setting"
  ON public.store_settings;

CREATE POLICY "Public read homepage display setting"
  ON public.store_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = 'homepage_display');

INSERT INTO public.store_settings (key, value, updated_at, version, updated_by)
VALUES (
  'homepage_display',
  jsonb_build_object(
    'show_filter_panel', true,
    'show_meesho_link', true,
    'show_amazon_link', true,
    'show_flipkart_link', true
  ),
  now(),
  1,
  'homepage_display_migration'
)
ON CONFLICT (key) DO NOTHING;
