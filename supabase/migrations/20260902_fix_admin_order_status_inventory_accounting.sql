create or replace function public.update_order_status_workflow(
  p_order_id uuid,
  p_new_status text,
  p_actor text default 'ADMIN'::text,
  p_notes text default null::text,
  p_courier text default null::text,
  p_tracking text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_order record;
  v_item record;
  v_inv record;
  v_size text;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Unauthorized: Only staff or administrators can update order status.' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- Inventory is sold at checkout. Status progression must not sell it again.
  if upper(p_new_status) in ('CANCELLED', 'CANCELED')
     and upper(coalesce(v_order.order_status, '')) not in ('CANCELLED', 'CANCELED') then
    for v_item in
      select * from public.order_items where order_id = p_order_id
    loop
      v_size := coalesce(nullif(btrim(v_item.size), ''), 'Free Size');

      select * into v_inv
      from public.inventory
      where product_id = v_item.product_id
        and size = v_size
      for update;

      if not found then
        raise exception 'Inventory record not found for product % (Size: %)', v_item.product_id, v_size;
      end if;

      update public.inventory
      set
        available_quantity = available_quantity + v_item.quantity,
        sold_quantity = greatest(0, sold_quantity - v_item.quantity),
        reserved_quantity = greatest(0, reserved_quantity - v_item.quantity),
        updated_at = now()
      where id = v_inv.id;

      insert into public.inventory_movements (
        product_id,
        order_id,
        size,
        quantity,
        movement_type,
        previous_quantity,
        new_quantity,
        reference,
        notes,
        created_by
      ) values (
        v_item.product_id,
        p_order_id,
        v_size,
        v_item.quantity,
        'ORDER_RELEASED',
        v_inv.available_quantity,
        v_inv.available_quantity + v_item.quantity,
        v_order.order_number,
        coalesce(p_notes, 'Order cancelled - stock released'),
        p_actor
      );
    end loop;
  end if;

  update public.orders
  set
    order_status = case when upper(p_new_status) = 'CANCELED' then 'CANCELLED' else upper(p_new_status) end,
    courier_partner = coalesce(p_courier, courier_partner),
    tracking_number = coalesce(p_tracking, tracking_number),
    updated_at = now()
  where id = p_order_id;

  insert into public.order_status_history (
    order_id,
    previous_status,
    new_status,
    notes,
    changed_by
  ) values (
    p_order_id,
    v_order.order_status,
    case when upper(p_new_status) = 'CANCELED' then 'CANCELLED' else upper(p_new_status) end,
    p_notes,
    p_actor
  );

  return jsonb_build_object('success', true);
end;
$function$;
