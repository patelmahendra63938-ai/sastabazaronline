-- Add the documented selected courier name to the existing authoritative order
-- snapshot without changing the underlying atomic inventory/order transaction.
CREATE OR REPLACE FUNCTION public.place_order_atomic_secure(
  p_order_number text, p_customer_id uuid, p_customer_name text,
  p_customer_email text, p_customer_phone text, p_shipping_address jsonb,
  p_subtotal numeric, p_tax_amount numeric, p_actual_weight_kg numeric,
  p_chargeable_weight_kg numeric, p_actual_courier_cost numeric,
  p_shipping_charge numeric, p_cod_charge numeric, p_discount_amount numeric,
  p_grand_total numeric, p_payment_method text, p_courier_partner text,
  p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_result jsonb;
BEGIN
  v_result := public.place_order_atomic_secure(
    p_order_number => p_order_number, p_customer_id => p_customer_id,
    p_customer_name => p_customer_name, p_customer_email => p_customer_email,
    p_customer_phone => p_customer_phone, p_shipping_address => p_shipping_address,
    p_subtotal => p_subtotal, p_tax_amount => p_tax_amount,
    p_actual_weight_kg => p_actual_weight_kg,
    p_chargeable_weight_kg => p_chargeable_weight_kg,
    p_actual_courier_cost => p_actual_courier_cost,
    p_shipping_charge => p_shipping_charge, p_cod_charge => p_cod_charge,
    p_discount_amount => p_discount_amount, p_grand_total => p_grand_total,
    p_payment_method => p_payment_method, p_items => p_items
  );

  IF coalesce((v_result ->> 'success')::boolean, false) THEN
    UPDATE public.orders
    SET courier_partner = nullif(trim(p_courier_partner), '')
    WHERE order_number = p_order_number;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Secure courier snapshot update failed';
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order_atomic_secure(
  text, uuid, text, text, text, jsonb, numeric, numeric, numeric, numeric,
  numeric, numeric, numeric, numeric, numeric, text, text, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.place_order_atomic_secure(
  text, uuid, text, text, text, jsonb, numeric, numeric, numeric, numeric,
  numeric, numeric, numeric, numeric, numeric, text, text, jsonb
) TO service_role;
