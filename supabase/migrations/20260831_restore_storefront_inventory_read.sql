-- Restore the read-only inventory access required by the storefront product page.
-- The product page needs size, stock, SKU and weight data to let customers
-- select a valid variant before pincode/serviceability and checkout checks.
-- This policy grants SELECT only. It does not grant INSERT/UPDATE/DELETE.

alter table public.inventory enable row level security;

grant select on table public.inventory to anon, authenticated;

drop policy if exists "Storefront can read active product inventory" on public.inventory;

create policy "Storefront can read active product inventory"
  on public.inventory
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = inventory.product_id
        and p.is_active = true
    )
  );

comment on policy "Storefront can read active product inventory" on public.inventory is
'Read-only storefront access for variants of active products. Inventory writes remain protected.';
