-- Persist the optional product demonstration video used by the storefront and SEO metadata.
alter table public.products
  add column if not exists video text;

comment on column public.products.video is
  'Optional public product demonstration video URL.';
