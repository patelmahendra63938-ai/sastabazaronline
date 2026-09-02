create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_user_role_text()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(
    (select role::text from public.profiles where id = auth.uid()),
    'customer'
  );
$$;

revoke execute on function private.current_user_role_text()
  from public, anon;
grant execute on function private.current_user_role_text()
  to authenticated, service_role;

-- Public wrappers remain available to authenticated RLS policies, but now run
-- as SECURITY INVOKER. The privileged profile lookup lives in the non-exposed
-- private schema and cannot be called through the Data API.
create or replace function public.get_current_user_role()
returns public.user_role
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.current_user_role_text()::public.user_role;
$$;

create or replace function public.is_accounts_staff()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.current_user_role_text() in ('admin', 'super_admin', 'staff');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.current_user_role_text() in ('admin', 'super_admin');
$$;

create or replace function public.is_admin_or_super_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.current_user_role_text() in ('admin', 'super_admin');
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.current_user_role_text() in ('admin', 'super_admin');
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.current_user_role_text() in ('staff', 'admin', 'super_admin');
$$;

revoke execute on function public.get_current_user_role() from public, anon;
revoke execute on function public.is_accounts_staff() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_admin_or_super_admin() from public, anon;
revoke execute on function public.is_admin_user() from public, anon;
revoke execute on function public.is_staff_or_admin() from public, anon;

grant execute on function public.get_current_user_role() to authenticated;
grant execute on function public.is_accounts_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin_or_super_admin() to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;
