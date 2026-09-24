create table if not exists public.commerce_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id text not null unique,
  visitor_id text not null,
  session_id text not null,
  event_type text not null check (event_type in ('add_to_cart','begin_checkout','purchase')),
  product_id text,
  quantity integer not null default 1 check (quantity > 0 and quantity <= 100),
  value numeric(12,2) not null default 0 check (value >= 0),
  order_number text,
  page_path text,
  created_at timestamptz not null default now()
);

create index if not exists commerce_events_event_created_idx
  on public.commerce_events (event_type, created_at desc);

create index if not exists commerce_events_visitor_created_idx
  on public.commerce_events (visitor_id, created_at desc);

alter table public.commerce_events enable row level security;

revoke all on table public.commerce_events from anon, authenticated;
grant all on table public.commerce_events to service_role;
