export interface OrderTotalSnapshot {
  subtotal?: number | string | null;
  shipping_charge?: number | string | null;
  cod_charge?: number | string | null;
  discount_amount?: number | string | null;
  grand_total?: number | string | null;
  total_amount?: number | string | null;
  payment_method?: string | null;
}

const money = (value: number | string | null | undefined) => Number(value || 0);

export function resolveOrderTotals(order: OrderTotalSnapshot) {
  const subtotal = money(order.subtotal);
  const shippingCharge = money(order.shipping_charge);
  const grandTotal = money(order.grand_total ?? order.total_amount);
  const isCod = String(order.payment_method || '').toUpperCase().includes('COD');
  const hasPersistedCodCharge = order.cod_charge !== null && order.cod_charge !== undefined;
  // Historical-only compatibility: old orders included COD in grand_total but did not snapshot it.
  const historicalResidual = Math.max(0, grandTotal - subtotal - shippingCharge);
  const codCharge = hasPersistedCodCharge ? money(order.cod_charge) : isCod ? historicalResidual : 0;
  const discountAmount = money(order.discount_amount);
  return { productSubtotal: subtotal + discountAmount, subtotal, shippingCharge, codCharge, discountAmount, grandTotal, isCod, usedHistoricalCodFallback: !hasPersistedCodCharge && isCod };
}
