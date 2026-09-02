-- These tables are server/trigger managed. They intentionally have no direct
-- anon or authenticated access. Explicit deny policies document that boundary
-- while service_role continues to bypass RLS for trusted server operations.

create policy "No direct client access to languages"
  on public.languages for all to anon, authenticated
  using (false) with check (false);

create policy "No direct client access to NimbusPost webhook deliveries"
  on public.nimbuspost_webhook_deliveries for all to anon, authenticated
  using (false) with check (false);

create policy "No direct client access to order lookup rate limits"
  on public.order_lookup_rate_limits for all to anon, authenticated
  using (false) with check (false);

create policy "No direct client access to PhonePe payment sessions"
  on public.phonepe_payment_sessions for all to anon, authenticated
  using (false) with check (false);

create policy "No direct client access to store settings history"
  on public.store_settings_history for all to anon, authenticated
  using (false) with check (false);
