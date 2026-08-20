-- Secure guest order reads. No orders SELECT policy is added or weakened.
CREATE OR REPLACE FUNCTION public.get_guest_order_secure(p_order_number text, p_email text, p_phone text, p_ip text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_order public.orders%ROWTYPE; v_items jsonb;
BEGIN
  IF p_order_number !~* '^SBZ-[A-Z0-9-]{6,40}$' OR position('@' in p_email) < 2 OR length(regexp_replace(p_phone, '\D', '', 'g')) < 10 THEN
    RETURN jsonb_build_object('success', false);
  END IF;
  SELECT * INTO v_order FROM public.orders
   WHERE upper(order_number) = upper(trim(p_order_number))
     AND lower(customer_email) = lower(trim(p_email))
     AND right(regexp_replace(customer_phone, '\D', '', 'g'), 10) = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
   LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false); END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(oi) ORDER BY oi.id), '[]'::jsonb) INTO v_items FROM public.order_items oi WHERE oi.order_id = v_order.id;
  RETURN jsonb_build_object('success', true, 'order', to_jsonb(v_order) || jsonb_build_object('order_items', v_items));
END; $$;
REVOKE ALL ON FUNCTION public.get_guest_order_secure(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_order_secure(text,text,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_orders_by_guest_identity(p_email text, p_phone text, p_ip text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_orders jsonb;
BEGIN
  IF position('@' in p_email) < 2 OR length(regexp_replace(p_phone, '\D', '', 'g')) < 10 THEN RETURN jsonb_build_object('success', false); END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(o) || jsonb_build_object('order_items', coalesce((SELECT jsonb_agg(to_jsonb(oi)) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb)) ORDER BY o.created_at DESC), '[]'::jsonb)
    INTO v_orders FROM public.orders o
   WHERE lower(o.customer_email) = lower(trim(p_email))
     AND right(regexp_replace(o.customer_phone, '\D', '', 'g'), 10) = right(regexp_replace(p_phone, '\D', '', 'g'), 10);
  RETURN jsonb_build_object('success', true, 'orders', v_orders);
END; $$;
REVOKE ALL ON FUNCTION public.get_orders_by_guest_identity(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_orders_by_guest_identity(text,text,text) TO anon, authenticated;
