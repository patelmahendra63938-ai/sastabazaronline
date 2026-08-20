import type { ShippingRules } from '../settings/shipping-rules.ts';

export type TemporaryPricingPaymentMethod = 'COD' | 'ONLINE' | 'UPI_QR';

export function calculateTemporarySlabCharges(input: { actualWeightGrams: number; discountedSubtotal: number; paymentMethod: TemporaryPricingPaymentMethod; rules: ShippingRules; }) {
  const { actualWeightGrams, discountedSubtotal, paymentMethod, rules } = input;
  if (!Number.isInteger(actualWeightGrams) || actualWeightGrams <= 0) throw new Error('Exact physical shipping weight is missing or invalid.');
  if (rules.pricing_mode !== 'temporary_slabs') throw new Error(`Unsupported shipping pricing mode: ${rules.pricing_mode}.`);
  if (actualWeightGrams > rules.temporary_max_weight_grams) throw new Error(`Cart weight exceeds the temporary ${rules.temporary_max_weight_grams} g shipping limit.`);
  const slabCharge = actualWeightGrams <= 500 ? rules.shipping_slab_500g : actualWeightGrams <= 1000 ? rules.shipping_slab_1000g : rules.shipping_slab_2000g;
  const freeShippingApplied = rules.free_shipping_enabled && discountedSubtotal >= rules.free_shipping_threshold;
  const shippingCharge = !rules.apply_courier_charge || freeShippingApplied ? 0 : slabCharge;
  const codCharge = paymentMethod !== 'COD' ? 0 : rules.cod_fee_type === 'flat' ? rules.cod_fee_flat : discountedSubtotal < rules.cod_fee_threshold ? rules.cod_fee_flat : rules.cod_fee_above_threshold;
  return { shippingCharge, codCharge, freeShippingApplied, totalPayable: discountedSubtotal + shippingCharge + codCharge };
}
