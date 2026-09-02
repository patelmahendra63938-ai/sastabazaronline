-- Keep privileged mutation implementations outside the exposed Data API
-- schema. Public SECURITY INVOKER wrappers preserve the existing RPC contract;
-- the private SECURITY DEFINER implementations keep their staff/admin checks.

alter function public.adjust_inventory_stock(uuid, text, integer, text, text, text)
  set schema private;
alter function public.assign_order_shipment(uuid, uuid, text, numeric, numeric, text)
  set schema private;
alter function public.update_order_status_workflow(uuid, text, text, text, text, text)
  set schema private;
alter function public.update_shipment_milestone(uuid, text, text, text, text)
  set schema private;

grant usage on schema private to authenticated, service_role;
grant execute on function private.adjust_inventory_stock(uuid, text, integer, text, text, text)
  to authenticated, service_role;
grant execute on function private.assign_order_shipment(uuid, uuid, text, numeric, numeric, text)
  to authenticated, service_role;
grant execute on function private.update_order_status_workflow(uuid, text, text, text, text, text)
  to authenticated, service_role;
grant execute on function private.update_shipment_milestone(uuid, text, text, text, text)
  to authenticated, service_role;

create function public.adjust_inventory_stock(
  p_product_id uuid,
  p_size text,
  p_quantity_delta integer,
  p_movement_type text,
  p_notes text,
  p_created_by text default 'ADMIN'
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.adjust_inventory_stock($1, $2, $3, $4, $5, $6);
$$;

create function public.assign_order_shipment(
  p_order_id uuid,
  p_courier_id uuid,
  p_awb_number text,
  p_package_weight numeric,
  p_shipping_cost numeric,
  p_admin_name text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.assign_order_shipment($1, $2, $3, $4, $5, $6);
$$;

create function public.update_order_status_workflow(
  p_order_id uuid,
  p_new_status text,
  p_actor text default 'ADMIN',
  p_notes text default null,
  p_courier text default null,
  p_tracking text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.update_order_status_workflow($1, $2, $3, $4, $5, $6);
$$;

create function public.update_shipment_milestone(
  p_shipment_id uuid,
  p_status text,
  p_location text,
  p_description text,
  p_admin_name text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.update_shipment_milestone($1, $2, $3, $4, $5);
$$;

revoke execute on function public.adjust_inventory_stock(uuid, text, integer, text, text, text)
  from public, anon;
revoke execute on function public.assign_order_shipment(uuid, uuid, text, numeric, numeric, text)
  from public, anon;
revoke execute on function public.update_order_status_workflow(uuid, text, text, text, text, text)
  from public, anon;
revoke execute on function public.update_shipment_milestone(uuid, text, text, text, text)
  from public, anon;

grant execute on function public.adjust_inventory_stock(uuid, text, integer, text, text, text)
  to authenticated, service_role;
grant execute on function public.assign_order_shipment(uuid, uuid, text, numeric, numeric, text)
  to authenticated, service_role;
grant execute on function public.update_order_status_workflow(uuid, text, text, text, text, text)
  to authenticated, service_role;
grant execute on function public.update_shipment_milestone(uuid, text, text, text, text)
  to authenticated, service_role;
