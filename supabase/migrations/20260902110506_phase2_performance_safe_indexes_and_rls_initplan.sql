-- Phase 2: low-risk database performance improvements.
-- 1. Add covering indexes for foreign keys reported by the database advisor.
-- 2. Cache auth.uid() once per statement in RLS policies instead of once per row.

create index if not exists idx_cod_settlements_created_by
  on public.cod_settlements (created_by);
create index if not exists idx_credit_notes_created_by
  on public.credit_notes (created_by);
create index if not exists idx_credit_notes_order_id
  on public.credit_notes (order_id);
create index if not exists idx_inventory_movements_order_id
  on public.inventory_movements (order_id);
create index if not exists idx_order_items_product_id
  on public.order_items (product_id);
create index if not exists idx_order_status_history_order_id
  on public.order_status_history (order_id);
create index if not exists idx_product_translations_language_code
  on public.product_translations (language_code);
create index if not exists idx_promotions_target_product_id
  on public.promotions (target_product_id);
create index if not exists idx_refund_status_history_refund_id
  on public.refund_status_history (refund_id);
create index if not exists idx_refunds_order_id
  on public.refunds (order_id);
create index if not exists idx_refunds_return_id
  on public.refunds (return_id);
create index if not exists idx_return_items_order_item_id
  on public.return_items (order_item_id);
create index if not exists idx_return_items_product_id
  on public.return_items (product_id);
create index if not exists idx_return_items_return_id
  on public.return_items (return_id);
create index if not exists idx_return_pickups_return_id
  on public.return_pickups (return_id);
create index if not exists idx_return_qc_return_id
  on public.return_qc (return_id);
create index if not exists idx_returns_order_id
  on public.returns (order_id);
create index if not exists idx_shipments_courier_partner_id
  on public.shipments (courier_partner_id);
create index if not exists idx_supplier_tax_invoices_created_by
  on public.supplier_tax_invoices (created_by);

do $$
declare
  policy_record record;
  optimized_using text;
  optimized_check text;
  alter_statement text;
begin
  for policy_record in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        replace(coalesce(qual, ''), '(SELECT auth.uid())', '') like '%auth.uid()%'
        or replace(coalesce(with_check, ''), '(SELECT auth.uid())', '') like '%auth.uid()%'
      )
  loop
    optimized_using := replace(policy_record.qual, 'auth.uid()', '(SELECT auth.uid())');
    optimized_check := replace(policy_record.with_check, 'auth.uid()', '(SELECT auth.uid())');
    alter_statement := format(
      'alter policy %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );

    if policy_record.qual is not null then
      alter_statement := alter_statement || format(' using (%s)', optimized_using);
    end if;

    if policy_record.with_check is not null then
      alter_statement := alter_statement || format(' with check (%s)', optimized_check);
    end if;

    execute alter_statement;
  end loop;
end;
$$;
