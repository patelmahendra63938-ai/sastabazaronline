-- Foreign-key indexes recommended by Supabase performance advisor.
-- Prepared only; not applied to production by this branch.

create index if not exists idx_cod_settlements_created_by on public.cod_settlements(created_by);
create index if not exists idx_credit_notes_created_by on public.credit_notes(created_by);
create index if not exists idx_credit_notes_order_id on public.credit_notes(order_id);
create index if not exists idx_inventory_movements_order_id on public.inventory_movements(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);
create index if not exists idx_order_status_history_order_id on public.order_status_history(order_id);
create index if not exists idx_product_translations_language_code on public.product_translations(language_code);
create index if not exists idx_promotions_target_product_id on public.promotions(target_product_id);
create index if not exists idx_refund_status_history_refund_id on public.refund_status_history(refund_id);
create index if not exists idx_refunds_order_id on public.refunds(order_id);
create index if not exists idx_refunds_return_id on public.refunds(return_id);
create index if not exists idx_return_items_order_item_id on public.return_items(order_item_id);
create index if not exists idx_return_items_product_id on public.return_items(product_id);
create index if not exists idx_return_items_return_id on public.return_items(return_id);
create index if not exists idx_return_pickups_return_id on public.return_pickups(return_id);
create index if not exists idx_return_qc_return_id on public.return_qc(return_id);
create index if not exists idx_returns_order_id on public.returns(order_id);
create index if not exists idx_shipments_courier_partner_id on public.shipments(courier_partner_id);
create index if not exists idx_supplier_tax_invoices_created_by on public.supplier_tax_invoices(created_by);
