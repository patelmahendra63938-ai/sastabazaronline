-- Guest order details must pass through the rate-limited/validated Next.js
-- server action; the privileged RPC is not a public Data API endpoint.
revoke execute on function public.get_guest_order_secure(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.get_guest_order_secure(text, text, text, text)
  to service_role;

-- Anonymous users only need active couriers. Keeping the role helper out of a
-- PUBLIC policy lets us close its direct anonymous RPC exposure.
alter policy "Public read couriers"
  on public.courier_partners
  to public
  using (active = true);

drop policy if exists "Staff read all couriers" on public.courier_partners;
create policy "Staff read all couriers"
  on public.courier_partners
  for select
  to authenticated
  using (public.is_staff_or_admin());

revoke execute on function public.is_staff_or_admin()
  from public, anon;
grant execute on function public.is_staff_or_admin()
  to authenticated;
