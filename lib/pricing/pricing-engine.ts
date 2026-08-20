import 'server-only';
import { SupabaseClient } from '@supabase/supabase-js';
import { Campaign, calculateDiscountedPrice, getActiveCampaigns } from '@/lib/promotions';
import { parseShippingRules } from '@/lib/settings/shipping-rules';
import { calculateTemporarySlabCharges } from '@/lib/pricing/temporary-slabs';

export type PricingPaymentMethod = 'COD' | 'ONLINE' | 'UPI_QR';
export interface PricingCartItem { id?: string; product_id?: string; size?: string; quantity: number; selected_campaign_id?: string; }
export interface VerifiedPricingItem { product_id: string; product_title: string; size: string; sku: string; hsn_code: string; gst_rate: number; unit_price: number; original_price: number; applied_offer_label: string | null; discount_reduction: number; weight_kg: number; quantity: number; line_total: number; }
export interface PricingBreakdown { pricingMode: 'temporary_slabs'; originalProductPriceTotal: number; discountDeductionAmount: number; primaryOfferName: string | null; discountedSubtotal: number; totalTaxAmount: number; actualWeightGrams: number; chargeableWeightGrams: number; shippingCharge: number; codCharge: number; totalPayable: number; freeShippingApplied: boolean; serviceable: boolean; message: string; verifiedItems: VerifiedPricingItem[]; ruleVersion: number; }

export async function calculateAuthoritativeOrderPricing(input: { db: SupabaseClient; pincode: string; paymentMethod: PricingPaymentMethod; cart: PricingCartItem[]; couponCode?: string; }): Promise<PricingBreakdown> {
  const cleanPin = String(input.pincode || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) throw new Error('Please enter a valid 6-digit delivery PIN code.');
  if (!Array.isArray(input.cart) || !input.cart.length) throw new Error('Cart cannot be empty.');
  const productIds = [...new Set(input.cart.map((item) => item.product_id || item.id).filter((id): id is string => Boolean(id)))];
  if (!productIds.length) throw new Error('No valid product references were found in the cart.');
  const [productsResult, inventoryResult, promotionsResult, settingsResult] = await Promise.all([
    input.db.from('products').select('id, title, price, mrp, category, hsn_code, gst_rate, net_weight_grams').in('id', productIds),
    input.db.from('inventory').select('product_id, size, sku, available_quantity').in('product_id', productIds),
    input.db.from('promotions').select('*').eq('is_enabled', true),
    input.db.from('store_settings').select('value, version').eq('key', 'shipping_rules').maybeSingle(),
  ]);
  if (productsResult.error || !productsResult.data) throw new Error('Catalog verification failed.');
  if (inventoryResult.error || !inventoryResult.data) throw new Error('Inventory verification failed.');
  if (promotionsResult.error) throw new Error('Promotion pricing could not be verified.');
  if (settingsResult.error) throw new Error('Shipping settings could not be verified.');
  const rules = parseShippingRules(settingsResult.data?.value);
  const campaigns = getActiveCampaigns((promotionsResult.data as Campaign[]) || []);
  let originalProductPriceTotal = 0, discountedSubtotal = 0, totalTaxAmount = 0, actualWeightGrams = 0;
  let primaryOfferName: string | null = null;
  const verifiedItems: VerifiedPricingItem[] = [];
  for (const item of input.cart) {
    const productId = item.product_id || item.id;
    const size = item.size || 'Free Size';
    const quantity = Number(item.quantity);
    const product = productsResult.data.find((row) => row.id === productId);
    const inventory = inventoryResult.data.find((row) => row.product_id === productId && row.size === size);
    if (!product) throw new Error(`Product reference (${productId || 'missing'}) is unavailable.`);
    if (!inventory) throw new Error(`Size "${size}" for "${product.title}" is unavailable.`);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(`Invalid quantity for "${product.title}".`);
    if (Number(inventory.available_quantity) < quantity) throw new Error(`Insufficient stock for "${product.title}" (${size}).`);
    const exactWeight = Number(product.net_weight_grams);
    if (!Number.isInteger(exactWeight) || exactWeight <= 0) throw new Error(`Exact physical weight is missing for "${product.title}". Please update products.net_weight_grams in Admin.`);
    const originalPrice = Number(product.price);
    if (!Number.isFinite(originalPrice) || originalPrice < 0) throw new Error(`Invalid server price for "${product.title}".`);
    const { finalPrice, appliedOffer } = calculateDiscountedPrice(originalPrice, campaigns, product.category, product.id, input.couponCode, item.selected_campaign_id);
    const lineTotal = Number(finalPrice) * quantity;
    const originalLineTotal = originalPrice * quantity;
    const gstRate = Number(product.gst_rate || 5);
    originalProductPriceTotal += originalLineTotal; discountedSubtotal += lineTotal;
    totalTaxAmount += lineTotal - lineTotal / (1 + gstRate / 100); actualWeightGrams += exactWeight * quantity;
    if (appliedOffer && !primaryOfferName) primaryOfferName = appliedOffer.offerLabel;
    verifiedItems.push({ product_id: product.id, product_title: product.title, size, sku: inventory.sku || `SKU-${product.id.slice(0, 4)}-${size}`, hsn_code: product.hsn_code || '6204', gst_rate: gstRate, unit_price: Number(finalPrice), original_price: originalPrice, applied_offer_label: appliedOffer?.offerLabel || null, discount_reduction: Math.max(0, originalLineTotal - lineTotal), weight_kg: exactWeight / 1000, quantity, line_total: lineTotal });
  }
  const charges = calculateTemporarySlabCharges({ actualWeightGrams, discountedSubtotal, paymentMethod: input.paymentMethod, rules });
  return { pricingMode: rules.pricing_mode, originalProductPriceTotal, discountDeductionAmount: Math.max(0, originalProductPriceTotal - discountedSubtotal), primaryOfferName, discountedSubtotal, totalTaxAmount: Math.round(totalTaxAmount * 100) / 100, actualWeightGrams, chargeableWeightGrams: actualWeightGrams, ...charges, serviceable: true, message: 'Delivery pricing is available for this PIN code using temporary slabs.', verifiedItems, ruleVersion: Number(settingsResult.data?.version || 0) };
}
