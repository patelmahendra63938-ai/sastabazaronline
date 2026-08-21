-- SASTABAZARONLINE security hardening
-- Review and back up the database before applying in Supabase.
-- This migration is intentionally idempotent and does not delete application data.

begin;

-- Keep role helper lookup deterministic for SECURITY DEFINER execution.
alter function public.is_staff_or_admin() set search_path = public, pg_temp;
alter function public.is_admin() set search_path = public, pg_temp;
alter function public.is_admin_user() set search_path = public, pg_temp;

create or replace function public.is_admin_or_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('admin', 'super_admin')
  );
$$;

revoke all on function public.is_admin_or_super_admin()
from public, anon, authenticated;
grant execute on function public.is_admin_or_super_admin() to authenticated;

-- Categories: remove anonymous write access and expose only active rows publicly.
alter table public.categories enable row level security;
drop policy if exists "Allow all on categories" on public.categories;
drop policy if exists "Allow public read categories" on public.categories;
drop policy if exists "Admin manage categories" on public.categories;

create policy "Public read active categories"
on public.categories
for select
to public
using (is_active = true);

create policy "Admin manage categories"
on public.categories
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

-- Promotions: anonymous customers may read active campaigns but never write them.
alter table public.promotions enable row level security;
drop policy if exists "Admin delete promotions" on public.promotions;
drop policy if exists "Admin insert promotions" on public.promotions;
drop policy if exists "Admin read all promotions" on public.promotions;
drop policy if exists "Admin update promotions" on public.promotions;
drop policy if exists "Admin manage promotions" on public.promotions;

create policy "Admin manage promotions"
on public.promotions
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

-- Profiles: consolidate duplicate policies and block customer role escalation.
alter table public.profiles enable row level security;
drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "Admins have full profile access" on public.profiles;
drop policy if exists "Users can update own details but not role" on public.profiles;
drop policy if exists "Users can update own details" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Profiles select own or staff" on public.profiles;
drop policy if exists "Profiles update own" on public.profiles;
drop policy if exists "Admins manage profiles" on public.profiles;

create policy "Profiles select own or staff"
on public.profiles
for select
to authenticated
using ((id = auth.uid()) or public.is_staff_or_admin());

create policy "Profiles update own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin_or_super_admin())
with check (public.is_admin_or_super_admin());

create or replace function public.prevent_unauthorized_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role
     and not public.is_admin_or_super_admin() then
    raise exception 'Only an administrator can change profile roles'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_unauthorized_profile_role_change()
from public, anon, authenticated;

drop trigger if exists prevent_unauthorized_profile_role_change
on public.profiles;

create trigger prevent_unauthorized_profile_role_change
before update of role on public.profiles
for each row
execute function public.prevent_unauthorized_profile_role_change();

-- Remove privileges that storefront roles do not need. RLS remains the row gate.
revoke insert, update, delete, truncate, references, trigger
on public.categories, public.inventory, public.products, public.promotions,
   public.store_settings, public.storefront_filter_settings
from anon;

revoke all on public.profiles from anon;

revoke truncate, references, trigger
on public.categories, public.inventory, public.products, public.profiles,
   public.promotions, public.store_settings, public.storefront_filter_settings
from authenticated;

-- Product media: only authenticated staff/admin policies may upload.
drop policy if exists "Allow public uploads" on storage.objects;

update storage.buckets
set file_size_limit = 7340032,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'product-images';

update storage.buckets
set file_size_limit = 7340032,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'promotion-banners';

commit;
