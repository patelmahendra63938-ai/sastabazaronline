create table if not exists public.brand_content_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('linkedin', 'contra')),
  content_type text not null check (content_type in ('product_post', 'case_study')),
  publish_date date not null,
  scheduled_at timestamptz not null,
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  body text not null,
  image_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'publishing', 'published', 'failed', 'cancelled')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  claimed_at timestamptz,
  published_at timestamptz,
  remote_post_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, publish_date),
  constraint brand_content_approved_requires_actor check (
    status not in ('approved', 'publishing', 'published')
    or platform = 'contra'
    or (approved_by is not null and approved_at is not null)
  )
);

create index if not exists brand_content_posts_due_idx
  on public.brand_content_posts (platform, scheduled_at)
  where status = 'approved';

alter table public.brand_content_posts enable row level security;
revoke all on public.brand_content_posts from public, anon, authenticated;
grant select, insert, update on public.brand_content_posts to service_role;
