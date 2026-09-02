-- Temporary production compatibility bridge.
-- Remove this grant only after the updated Next.js server action is deployed.
grant execute on function public.get_guest_order_secure(text, text, text, text)
  to anon;
