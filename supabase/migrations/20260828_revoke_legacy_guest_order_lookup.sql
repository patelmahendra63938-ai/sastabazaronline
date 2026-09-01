-- Revoke direct access to the legacy bulk guest-order lookup.
-- The storefront now uses public.get_guest_order_secure(order_number, email, phone, ip),
-- which verifies a single order with three customer-supplied identifiers.

REVOKE ALL ON FUNCTION public.get_orders_by_guest_identity(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_orders_by_guest_identity(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_orders_by_guest_identity(text, text, text) FROM authenticated;
