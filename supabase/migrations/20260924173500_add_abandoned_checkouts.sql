create table if not exists public.abandoned_checkouts (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null unique,
  session_id text not null,
  full_name text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  cart jsonb not null default '[]'::jsonb,
  cart_value numeric(12,2) not null default 0 check (cart_value >= 0),
  status text not null default 'abandoned' check (status in ('abandoned','converted')),
  order_number text,
  first_captured_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  converted_at timestamptz
);

create index if not exists abandoned_checkouts_status_activity_idx
  on public.abandoned_checkouts (status, last_activity_at desc);

alter table public.abandoned_checkouts enable row level security;
revoke all on table public.abandoned_checkouts from anon, authenticated;
grant all on table public.abandoned_checkouts to service_role;
