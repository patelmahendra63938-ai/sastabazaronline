# Inventory P0/P1/P2 hardening

## P0
- Stock adjustments target the exact inventory row and pass both `product_id` and the exact stored variant label (`size`) to `adjust_inventory_stock`.
- Inventory table keys and selectors use `inventory.id`, not `product_id`.
- History is filtered by `product_id + size` so size/option variants do not mix.

## P1
- Edit Product no longer overwrites `available_quantity` directly for existing rows.
- Quantity differences are applied through `adjust_inventory_stock`, preserving movement history and atomic validation.
- Product total stock continues to be synchronized by the existing `trg_sync_product_stock_from_inventory` database trigger.
- Colour, size/option, SKU and stock are handled together as the inventory variant. To remain compatible with the existing checkout, colour variants use the existing canonical `inventory.size` key: generic products can use the colour as the option label, while sized products use `Size / Colour`.

## P2
- Inventory table shows Size/Option, Colour, SKU, Available, Reserved and Sold columns.
- Search matches product title, category, SKU, size/option and colour.
- Edit Product exposes colour management and variant-level colour selection.

This design keeps the current checkout and order database contract compatible while making admin stock operations variant-safe.
