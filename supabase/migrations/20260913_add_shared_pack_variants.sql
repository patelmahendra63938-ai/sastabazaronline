-- One product can expose multiple pack/set prices while every option consumes
-- the same physical piece inventory pool.

alter table public.products
  add column if not exists selling_mode text not null default 'standard';

alter table public.products
  drop constraint if exists products_selling_mode_check;

alter table public.products
  add constraint products_selling_mode_check
  check (selling_mode in ('standard', 'shared_pack'));

create table if not exists public.product_pack_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  pieces_per_unit integer not null check (pieces_per_unit > 0),
  price numeric not null check (price > 0),
  mrp numeric,
  sku text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_pack_options_mrp_check check (mrp is null or mrp >= price),
  constraint product_pack_options_product_label_unique unique (product_id, label)
);

create index if not exists idx_product_pack_options_product_active
  on public.product_pack_options(product_id, is_active, display_order);

alter table public.product_pack_options enable row level security;

drop policy if exists "Storefront can read active pack options" on public.product_pack_options;
create policy "Storefront can read active pack options"
on public.product_pack_options
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.products p
    where p.id = product_pack_options.product_id
      and p.is_active = true
  )
);

drop policy if exists "Admin manage pack options" on public.product_pack_options;
create policy "Admin manage pack options"
on public.product_pack_options
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

grant select on public.product_pack_options to anon, authenticated;
grant insert, update, delete on public.product_pack_options to authenticated;

alter table public.order_items
  add column if not exists pack_option_id uuid references public.product_pack_options(id) on delete set null,
  add column if not exists pieces_per_unit integer not null default 1,
  add column if not exists physical_quantity integer;

update public.order_items
set physical_quantity = quantity
where physical_quantity is null;

alter table public.order_items
  alter column physical_quantity set not null;

alter table public.order_items
  drop constraint if exists order_items_pieces_per_unit_check;
alter table public.order_items
  add constraint order_items_pieces_per_unit_check check (pieces_per_unit > 0);

alter table public.order_items
  drop constraint if exists order_items_physical_quantity_check;
alter table public.order_items
  add constraint order_items_physical_quantity_check check (physical_quantity > 0);

-- The 15-parameter function is the inventory-owning base RPC used by the
-- COD/QR wrapper and PhonePe wrapper. It now understands pack_option_id.
create or replace function public.place_order_atomic_secure(
  p_order_number text,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_subtotal numeric,
  p_tax_amount numeric,
  p_actual_weight_kg numeric,
  p_chargeable_weight_kg numeric,
  p_actual_courier_cost numeric,
  p_shipping_charge numeric,
  p_grand_total numeric,
  p_payment_method text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_order_id uuid;
  v_item jsonb;
  v_prod_id uuid;
  v_size text;
  v_inventory_size text;
  v_qty int;
  v_pieces_per_unit int;
  v_physical_qty int;
  v_item_weight_kg numeric;
  v_pack_option_id uuid;
  v_pack record;
  v_inv record;
  v_product_selling_mode text;
  v_item_count int := 0;
begin
  if p_order_number is null or btrim(p_order_number) = '' then raise exception 'Order number is required'; end if;
  if p_customer_name is null or btrim(p_customer_name) = '' then raise exception 'Customer name is required'; end if;
  if p_customer_phone is null or btrim(p_customer_phone) = '' then raise exception 'Customer phone is required'; end if;
  if p_shipping_address is null then raise exception 'Shipping address is required'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Order must contain at least one item'; end if;
  if p_actual_weight_kg is null or p_actual_weight_kg <= 0 then raise exception 'Actual order weight must be greater than zero'; end if;
  if p_chargeable_weight_kg is null or p_chargeable_weight_kg <= 0 then raise exception 'Chargeable order weight must be greater than zero'; end if;

  insert into public.orders (
    order_number, customer_id, customer_name, customer_email, customer_phone,
    shipping_address, subtotal, tax_amount, actual_weight_kg, chargeable_weight_kg,
    actual_courier_cost, shipping_charge, grand_total, payment_method,
    payment_status, order_status
  ) values (
    p_order_number, p_customer_id, p_customer_name, p_customer_email, p_customer_phone,
    p_shipping_address, p_subtotal, p_tax_amount, p_actual_weight_kg, p_chargeable_weight_kg,
    p_actual_courier_cost, p_shipping_charge, p_grand_total, p_payment_method,
    'PENDING', 'CONFIRMED'
  ) returning id into v_order_id;

  insert into public.order_status_history (
    order_id, previous_status, new_status, notes, changed_by
  ) values (
    v_order_id, null, 'CONFIRMED', 'Order placed successfully', 'CHECKOUT_ENGINE'
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if nullif(v_item->>'product_id', '') is null then raise exception 'Order item is missing product_id'; end if;

    begin
      v_prod_id := (v_item->>'product_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid product_id in order item: %', v_item->>'product_id';
    end;

    select selling_mode into v_product_selling_mode
    from public.products where id = v_prod_id;
    if not found then raise exception 'Product not found: %', v_prod_id; end if;

    begin
      v_qty := (v_item->>'quantity')::int;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Invalid quantity for product %', v_prod_id;
    end;
    if v_qty is null or v_qty <= 0 then raise exception 'Quantity must be greater than zero for product %', v_prod_id; end if;

    v_pack_option_id := null;
    if nullif(v_item->>'pack_option_id', '') is not null then
      begin
        v_pack_option_id := (v_item->>'pack_option_id')::uuid;
      exception when invalid_text_representation then
        raise exception 'Invalid pack option for product %', v_prod_id;
      end;
    end if;

    if v_pack_option_id is not null then
      select * into v_pack
      from public.product_pack_options
      where id = v_pack_option_id
        and product_id = v_prod_id
        and is_active = true;

      if not found then raise exception 'Pack option is unavailable for product %', v_prod_id; end if;

      v_size := v_pack.label;
      v_inventory_size := 'Shared Stock';
      v_pieces_per_unit := v_pack.pieces_per_unit;
      v_physical_qty := v_qty * v_pieces_per_unit;
    else
      if coalesce(v_product_selling_mode, 'standard') = 'shared_pack' then
        raise exception 'Select a valid pack option for product %', v_prod_id;
      end if;
      v_size := coalesce(nullif(btrim(v_item->>'size'), ''), 'Free Size');
      v_inventory_size := v_size;
      v_pieces_per_unit := 1;
      v_physical_qty := v_qty;
    end if;

    v_item_count := v_item_count + v_qty;

    begin
      v_item_weight_kg := (v_item->>'weight_kg')::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Invalid physical weight for % (Variant: %)', coalesce(v_item->>'product_title', 'Product'), v_size;
    end;
    if v_item_weight_kg is null or v_item_weight_kg <= 0 then
      raise exception 'Exact physical weight is required for % (Variant: %)', coalesce(v_item->>'product_title', 'Product'), v_size;
    end if;

    select * into v_inv
    from public.inventory
    where product_id = v_prod_id and size = v_inventory_size
    for update;

    if not found then
      raise exception 'Inventory record not found for % (Inventory: %)', coalesce(v_item->>'product_title', 'Product'), v_inventory_size;
    end if;

    if v_inv.available_quantity < v_physical_qty then
      raise exception 'Insufficient stock for % (%). Available physical pieces: %, Requested physical pieces: %',
        coalesce(v_item->>'product_title', 'Product'), v_size, v_inv.available_quantity, v_physical_qty;
    end if;

    update public.inventory
    set available_quantity = available_quantity - v_physical_qty,
        sold_quantity = sold_quantity + v_physical_qty,
        updated_at = now()
    where id = v_inv.id;

    insert into public.inventory_movements (
      product_id, order_id, size, quantity, movement_type,
      previous_quantity, new_quantity, notes, created_by
    ) values (
      v_prod_id, v_order_id, v_inventory_size, -v_physical_qty, 'SALE',
      v_inv.available_quantity, v_inv.available_quantity - v_physical_qty,
      'Order: ' || p_order_number || case when v_pack_option_id is not null then ' • ' || v_size else '' end,
      'CHECKOUT_ENGINE'
    );

    insert into public.order_items (
      order_id, product_id, product_title, size, sku, hsn_code, gst_rate,
      unit_price, weight_kg, quantity, line_total,
      pack_option_id, pieces_per_unit, physical_quantity
    ) values (
      v_order_id, v_prod_id, coalesce(v_item->>'product_title', 'Product'), v_size,
      case when v_pack_option_id is not null then coalesce(v_pack.sku, v_item->>'sku') else v_item->>'sku' end,
      coalesce(nullif(v_item->>'hsn_code', ''), '6204'),
      coalesce((v_item->>'gst_rate')::numeric, 5.00),
      coalesce((v_item->>'unit_price')::numeric, 0.00),
      v_item_weight_kg, v_qty, coalesce((v_item->>'line_total')::numeric, 0.00),
      v_pack_option_id, v_pieces_per_unit, v_physical_qty
    );
  end loop;

  update public.orders
  set item_count = v_item_count, updated_at = now()
  where id = v_order_id;

  return jsonb_build_object('success', true, 'order_id', v_order_id, 'order_number', p_order_number);
end;
$function$;

-- Admin cancellation must return the physical piece quantity to the same shared pool.
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
  v_inventory_size text;
  v_restore_qty integer;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Unauthorized: Only staff or administrators can update order status.' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  if upper(p_new_status) in ('CANCELLED', 'CANCELED')
     and upper(coalesce(v_order.order_status, '')) not in ('CANCELLED', 'CANCELED') then
    for v_item in select * from public.order_items where order_id = p_order_id
    loop
      v_inventory_size := case when v_item.pack_option_id is not null then 'Shared Stock' else coalesce(nullif(btrim(v_item.size), ''), 'Free Size') end;
      v_restore_qty := coalesce(v_item.physical_quantity, v_item.quantity * greatest(1, coalesce(v_item.pieces_per_unit, 1)));

      select * into v_inv
      from public.inventory
      where product_id = v_item.product_id and size = v_inventory_size
      for update;

      if not found then
        raise exception 'Inventory record not found for product % (Inventory: %)', v_item.product_id, v_inventory_size;
      end if;

      update public.inventory
      set available_quantity = available_quantity + v_restore_qty,
          sold_quantity = greatest(0, sold_quantity - v_restore_qty),
          reserved_quantity = greatest(0, reserved_quantity - v_restore_qty),
          updated_at = now()
      where id = v_inv.id;

      insert into public.inventory_movements (
        product_id, order_id, size, quantity, movement_type,
        previous_quantity, new_quantity, reference, notes, created_by
      ) values (
        v_item.product_id, p_order_id, v_inventory_size, v_restore_qty, 'ORDER_RELEASED',
        v_inv.available_quantity, v_inv.available_quantity + v_restore_qty,
        v_order.order_number, coalesce(p_notes, 'Order cancelled - stock released'), p_actor
      );
    end loop;
  end if;

  update public.orders
  set order_status = case when upper(p_new_status) = 'CANCELED' then 'CANCELLED' else upper(p_new_status) end,
      courier_partner = coalesce(p_courier, courier_partner),
      tracking_number = coalesce(p_tracking, tracking_number),
      updated_at = now()
  where id = p_order_id;

  insert into public.order_status_history (
    order_id, previous_status, new_status, notes, changed_by
  ) values (
    p_order_id, v_order.order_status,
    case when upper(p_new_status) = 'CANCELED' then 'CANCELLED' else upper(p_new_status) end,
    p_notes, p_actor
  );

  return jsonb_build_object('success', true);
end;
$function$;
