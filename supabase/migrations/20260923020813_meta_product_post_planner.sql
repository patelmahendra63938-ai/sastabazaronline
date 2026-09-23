-- Only server-side operations can access the social publishing queue.
create table if not exists public.meta_product_posts (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('facebook', 'instagram')),
  publish_date date not null,
  scheduled_at timestamptz not null,
  product_id uuid not null references public.products(id) on delete restrict,
  product_title text not null,
  price_snapshot numeric(12,2) not null check (price_snapshot >= 0),
  image_url text not null,
  caption text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'publishing', 'published', 'failed', 'cancelled')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  claimed_at timestamptz,
  published_at timestamptz,
  remote_post_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, publish_date),
  constraint approved_requires_actor check (
    status not in ('approved', 'publishing', 'published')
    or (approved_by is not null and approved_at is not null)
  )
);

create index if not exists meta_product_posts_due_idx
  on public.meta_product_posts (channel, scheduled_at)
  where status = 'approved';

alter table public.meta_product_posts enable row level security;
revoke all on public.meta_product_posts from public, anon, authenticated;
grant select, insert, update on public.meta_product_posts to service_role;
