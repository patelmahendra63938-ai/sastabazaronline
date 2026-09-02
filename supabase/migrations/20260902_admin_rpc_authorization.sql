-- Admin workflow RPC hardening.
-- These functions are called by authenticated admin pages, so authorization
-- must be enforced inside each SECURITY DEFINER function before granting EXECUTE.

begin;

create or replace function public.assign_courier_to_shipment(
  p_order_id uuid,
  p_courier_id uuid,
  p_awb text,
  p_weight numeric,
  p_cost numeric,
  p_expected_date date,
  p_admin_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_shipment_id uuid;
  v_courier record;
  v_order record;
  v_tracking_url text;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Unauthorized: Only staff or administrators can assign shipments.' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;

  if upper(coalesce(v_order.order_status, '')) in ('CANCELLED', 'CANCELED', 'RTO') then
    raise exception 'A cancelled/RTO order cannot be assigned for shipment.';
  end if;

  if exists (select 1 from public.shipments where order_id = p_order_id) then
    raise exception 'This order already has a shipment/AWB.';
  end if;

  if nullif(trim(coalesce(p_awb, '')), '') is null then
    raise exception 'A valid AWB number is required.';
  end if;

  select * into v_courier
  from public.courier_partners
  where id = p_courier_id and active = true;

  if not found then
    raise exception 'Invalid or inactive courier partner.';
  end if;

  v_tracking_url := case
    when nullif(v_courier.tracking_url_template, '') is null then null
    else replace(replace(v_courier.tracking_url_template, '{{awb}}', trim(p_awb)), '{awb}', trim(p_awb))
  end;

  insert into public.shipments (
    order_id,
    courier_partner_id,
    awb_number,
    shipment_status,
    pickup_status,
    package_weight,
    shipping_cost,
    estimated_delivery_date,
    tracking_url
  ) values (
    p_order_id,
    p_courier_id,
    trim(p_awb),
    'COURIER_ASSIGNED',
    'NOT_REQUESTED',
    greatest(coalesce(p_weight, 0), 0),
    greatest(coalesce(p_cost, 0), 0),
    p_expected_date,
    v_tracking_url
  ) returning id into v_shipment_id;

  insert into public.shipment_tracking_events (
    shipment_id, status, location, description, event_time, source, created_by
  ) values (
    v_shipment_id,
    'COURIER_ASSIGNED',
    'Warehouse',
    'Courier assigned and AWB generated. Awaiting pickup.',
    now(),
    'MANUAL',
    coalesce(nullif(trim(p_admin_name), ''), 'Admin')
  );

  update public.orders
  set order_status = case
        when order_status in ('PENDING', 'CONFIRMED', 'PROCESSING') then 'PACKED'
        else order_status
      end,
      courier_partner = v_courier.name,
      tracking_number = trim(p_awb),
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'shipment_id', v_shipment_id,
    'tracking_url', v_tracking_url,
    'awb', trim(p_awb)
  );
end;
$$;

create or replace function public.mark_refund_paid(
  p_refund_id uuid,
  p_utr_reference text,
  p_admin_name text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_refund record;
  v_utr text;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Unauthorized: Only staff or administrators can record refund payouts.' using errcode = '42501';
  end if;

  v_utr := trim(coalesce(p_utr_reference, ''));
  if length(v_utr) < 6 then
    raise exception 'A valid Bank/UPI UTR reference is mandatory.';
  end if;

  select * into v_refund
  from public.refunds
  where id = p_refund_id
  for update;

  if not found then
    raise exception 'Refund record not found.';
  end if;

  if v_refund.status = 'REFUNDED' then
    raise exception 'This refund has already been processed.';
  end if;

  update public.refunds
  set status = 'REFUNDED',
      refund_utr = v_utr,
      processed_by = coalesce(nullif(trim(p_admin_name), ''), 'Admin'),
      processed_at = now(),
      updated_at = now()
  where id = p_refund_id;

  insert into public.refund_status_history (
    refund_id, old_status, new_status, notes, changed_by
  ) values (
    p_refund_id,
    v_refund.status,
    'REFUNDED',
    concat_ws(' | ', nullif(trim(coalesce(p_notes, '')), ''), 'UTR: ' || v_utr),
    coalesce(nullif(trim(p_admin_name), ''), 'Admin')
  );

  update public.returns
  set status = 'REFUNDED', updated_at = now()
  where id = v_refund.return_id;

  return jsonb_build_object('success', true, 'utr', v_utr);
end;
$$;

create or replace function public.process_return_qc(
  p_return_id uuid,
  p_result text,
  p_disposition text,
  p_approved_refund numeric,
  p_qc_notes text,
  p_admin_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_return record;
  v_item record;
  v_inv record;
  v_refund_number text;
  v_refund_status text;
  v_settings record;
  v_approved numeric := greatest(coalesce(p_approved_refund, 0), 0);
begin
  if not public.is_staff_or_admin() then
    raise exception 'Unauthorized: Only staff or administrators can complete return QC.' using errcode = '42501';
  end if;

  if upper(coalesce(p_result, '')) not in ('PASSED', 'FAILED') then
    raise exception 'Invalid QC result.';
  end if;

  if upper(coalesce(p_disposition, '')) not in ('RESTOCK', 'DAMAGED', 'REJECT') then
    raise exception 'Invalid return disposition.';
  end if;

  select * into v_return
  from public.returns
  where id = p_return_id
  for update;

  if not found then
    raise exception 'Return record not found.';
  end if;

  select * into v_settings from public.return_settings where id = 1;
  if not found then
    raise exception 'Return settings are not configured.';
  end if;

  if v_approved > coalesce(v_return.total_refund_requested, v_approved) then
    raise exception 'Approved refund cannot exceed the requested refund.';
  end if;

  insert into public.return_qc (return_id, result, notes, inspected_by)
  values (
    p_return_id,
    upper(p_result),
    nullif(trim(coalesce(p_qc_notes, '')), ''),
    coalesce(nullif(trim(p_admin_name), ''), 'Admin')
  );

  for v_item in select * from public.return_items where return_id = p_return_id loop
    update public.return_items
    set disposition = upper(p_disposition)
    where id = v_item.id;

    if upper(p_disposition) = 'RESTOCK' then
      select * into v_inv
      from public.inventory
      where product_id = v_item.product_id
      order by updated_at desc nulls last
      limit 1
      for update;

      if not found then
        raise exception 'Inventory record not found for returned product %.', v_item.product_id;
      end if;

      update public.inventory
      set available_quantity = available_quantity + v_item.quantity,
          sold_quantity = greatest(0, sold_quantity - v_item.quantity),
          updated_at = now()
      where id = v_inv.id;

      update public.products
      set stock = stock + v_item.quantity
      where id = v_item.product_id;

      insert into public.inventory_movements (
        product_id, order_id, quantity, movement_type,
        previous_quantity, new_quantity, notes, created_by
      ) values (
        v_item.product_id,
        v_return.order_id,
        v_item.quantity,
        'RETURN_RESTOCK',
        v_inv.available_quantity,
        v_inv.available_quantity + v_item.quantity,
        'QC passed and returned item restocked',
        coalesce(nullif(trim(p_admin_name), ''), 'Admin')
      );
    elsif upper(p_disposition) = 'DAMAGED' then
      select * into v_inv
      from public.inventory
      where product_id = v_item.product_id
      order by updated_at desc nulls last
      limit 1
      for update;

      if not found then
        raise exception 'Inventory record not found for returned product %.', v_item.product_id;
      end if;

      update public.inventory
      set damaged_quantity = damaged_quantity + v_item.quantity,
          sold_quantity = greatest(0, sold_quantity - v_item.quantity),
          updated_at = now()
      where id = v_inv.id;

      insert into public.inventory_movements (
        product_id, order_id, quantity, movement_type,
        previous_quantity, new_quantity, notes, created_by
      ) values (
        v_item.product_id,
        v_return.order_id,
        v_item.quantity,
        'DAMAGE',
        v_inv.damaged_quantity,
        v_inv.damaged_quantity + v_item.quantity,
        'QC failed - marked as damaged',
        coalesce(nullif(trim(p_admin_name), ''), 'Admin')
      );
    end if;
  end loop;

  update public.returns
  set status = 'QC_COMPLETED',
      total_refund_approved = v_approved,
      updated_at = now()
  where id = p_return_id;

  if v_approved > 0 then
    v_refund_number := 'REF-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.refund_number_seq')::text, 4, '0');
    v_refund_status := case
      when v_approved > v_settings.auto_refund_limit then 'REFUND_APPROVAL_REQUIRED'
      else 'REFUND_PROCESSING'
    end;

    insert into public.refunds (
      refund_number, return_id, order_id, refund_amount, refund_method, status
    ) values (
      v_refund_number, p_return_id, v_return.order_id, v_approved, 'UPI', v_refund_status
    );
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.assign_courier_to_shipment(uuid, uuid, text, numeric, numeric, date, text) from public, anon;
revoke all on function public.mark_refund_paid(uuid, text, text, text) from public, anon;
revoke all on function public.process_return_qc(uuid, text, text, numeric, text, text) from public, anon;

grant execute on function public.assign_courier_to_shipment(uuid, uuid, text, numeric, numeric, date, text) to authenticated;
grant execute on function public.mark_refund_paid(uuid, text, text, text) to authenticated;
grant execute on function public.process_return_qc(uuid, text, text, numeric, text, text) to authenticated;

commit;
