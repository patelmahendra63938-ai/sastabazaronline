export const SHARED_STOCK_SIZE = 'Shared Stock';

export type ProductPackOption = {
  id: string;
  product_id: string;
  label: string;
  pieces_per_unit: number;
  price: number;
  mrp?: number | null;
  sku?: string | null;
  display_order?: number | null;
  is_active?: boolean | null;
};

export function availablePackUnits(physicalPieces: number, piecesPerUnit: number) {
  const stock = Math.max(0, Math.floor(Number(physicalPieces) || 0));
  const pieces = Math.max(1, Math.floor(Number(piecesPerUnit) || 1));
  return Math.floor(stock / pieces);
}
