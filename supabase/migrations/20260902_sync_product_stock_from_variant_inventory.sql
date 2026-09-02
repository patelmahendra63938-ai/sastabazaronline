create or replace function public.sync_product_stock_from_inventory()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_product_id uuid;
  v_old_product_id uuid;
begin
  v_product_id := case when tg_op = 'DELETE' then old.product_id else new.product_id end;
  v_old_product_id := case when tg_op = 'UPDATE' then old.product_id else null end;

  update public.products p
  set stock = coalesce((
    select sum(i.available_quantity)
    from public.inventory i
    where i.product_id = v_product_id
  ), 0)
  where p.id = v_product_id;

  if v_old_product_id is not null and v_old_product_id is distinct from v_product_id then
    update public.products p
    set stock = coalesce((
      select sum(i.available_quantity)
      from public.inventory i
      where i.product_id = v_old_product_id
    ), 0)
    where p.id = v_old_product_id;
  end if;

  return coalesce(new, old);
end;
$function$;

revoke all on function public.sync_product_stock_from_inventory() from public;
revoke all on function public.sync_product_stock_from_inventory() from anon;
revoke all on function public.sync_product_stock_from_inventory() from authenticated;

drop trigger if exists trg_sync_product_stock_from_inventory on public.inventory;
create trigger trg_sync_product_stock_from_inventory
after insert or delete or update of product_id, available_quantity
on public.inventory
for each row
execute function public.sync_product_stock_from_inventory();

update public.products p
set stock = coalesce((
  select sum(i.available_quantity)
  from public.inventory i
  where i.product_id = p.id
), 0);
