-- Phase 1: harden privileged functions without changing their business logic.
-- Keep pg_temp last so unqualified temporary objects cannot shadow public objects.

alter function public.mark_refund_paid(uuid, text, text, text)
  set search_path = public, pg_temp;

alter function public.assign_courier_to_shipment(uuid, uuid, text, numeric, numeric, date, text)
  set search_path = public, pg_temp;

alter function public.handle_new_user_signup()
  set search_path = public, pg_temp;

alter function public.generate_order_number()
  set search_path = public, pg_temp;

alter function public.adjust_inventory_stock(uuid, text, integer, text, text, text)
  set search_path = public, pg_temp;

alter function public.enforce_sastabazaronline_branding()
  set search_path = public, pg_temp;

-- Trigger/internal helpers must not be directly callable through the Data API.
revoke execute on function public.handle_new_user_signup()
  from public, anon, authenticated;
grant execute on function public.handle_new_user_signup() to service_role;

revoke execute on function public.generate_order_number()
  from public, anon, authenticated;
grant execute on function public.generate_order_number() to service_role;

-- Role helpers are required by authenticated RLS policies, but anonymous callers
-- do not need to invoke them directly.
revoke execute on function public.get_current_user_role()
  from public, anon;
revoke execute on function public.is_accounts_staff()
  from public, anon;
revoke execute on function public.is_admin()
  from public, anon;
revoke execute on function public.is_admin_user()
  from public, anon;

grant execute on function public.get_current_user_role() to authenticated;
grant execute on function public.is_accounts_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin_user() to authenticated;
