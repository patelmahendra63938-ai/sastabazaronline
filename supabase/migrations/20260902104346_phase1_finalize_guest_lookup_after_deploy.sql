-- Apply only after the service-role guest lookup server action is deployed.
revoke execute on function public.get_guest_order_secure(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.get_guest_order_secure(text, text, text, text)
  to service_role;
