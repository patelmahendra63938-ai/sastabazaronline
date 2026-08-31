create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_number text not null,
  customer_id uuid null,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (char_length(trim(review_text)) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  verified_purchase boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_number, product_id)
);

create index if not exists reviews_product_status_created_idx
  on public.reviews(product_id, status, created_at desc);

alter table public.reviews enable row level security;

revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;

create policy "Public can read approved reviews"
  on public.reviews
  for select
  to anon, authenticated
  using (status = 'approved');

comment on table public.reviews is 'Verified product reviews. Writes are server-only after delivered-order verification; public reads only approved rows.';
