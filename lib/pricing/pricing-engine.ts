import 'server-only';
import { SupabaseClient } from '@supabase/supabase-js';
import { Campaign, calculateDiscountedPrice, getActiveCampaigns } from '@/lib/promotions';
import { checkPincodeShippingRate, type ShippingPackageInput } from '@/lib/shipping/serviceability';

export type PricingPaymentMethod = 'COD' | 'ONLINE' | 'UPI_QR';
export interface PricingCartItem { id?: string; product_id?: string; size?: string; quantity: number; selected_campaign_id?: string; }
export interface VerifiedPricingItem { product_id: string; product_title: string; size: string; sku: string; hsn_code: string; gst_rate: number; unit_price: number; original_price: number; applied_offer_label: string | null; discount_reduction: number; weight_kg: number; quantity: number; line_total: number; }
export interface PricingBreakdown { pricingMode: 'nimbuspost_live'; originalProductPriceTotal: number; discountDeductionAmount: number; primaryOfferName: string | null; discountedSubtotal: number; totalTaxAmount: number; actualWeightGrams: number; chargeableWeightGrams: number; shippingCharge: number; codCharge: number; totalPayable: number; freeShippingApplied: boolean; serviceable: boolean; message: string; verifiedItems: VerifiedPricingItem[]; ruleVersion: number; }

const WELCOME50_CODE = 'WELCOME50';
const WELCOME50_MINIMUM_ORDER = 499;
const WELCOME50_DISCOUNT = 50;
const WELCOME50_END_AT_UTC = Date.parse('2026-09-07T18:29:59.999Z'); // 07 Sep 2026, 23:59:59 IST
const MAX_RETAIL_QTY_PER_PRODUCT_SIZE = 5;

export async function calculateAuthoritativeOrderPricing(input: { db: SupabaseClient; pincode: string; paymentMethod: PricingPaymentMethod; cart: PricingCartItem[]; couponCode?: string; }): Promise<PricingBreakdown> {
  const cleanPin = String(input.pincode || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) throw new Error('Please enter a valid 6-digit delivery PIN code.');
  if (!Array.isArray(input.cart) || !input.cart.length) throw new Error('Cart cannot be empty.');

  const retailQuantityByProductSize = new Map<string, number>();
  for (const item of input.cart) {
    const productId = item.product_id || item.id;
    const size = String(item.size || 'Free Size').trim().toLowerCase();
    const quantity = Number(item.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Invalid retail cart quantity.');
    }

    const key = `${productId}::${size}`;
    const totalForProductSize = (retailQuantityByProductSize.get(key) || 0) + quantity;
    if (totalForProductSize > MAX_RETAIL_QTY_PER_PRODUCT_SIZE) {
      throw new Error('Retail orders allow a maximum of 5 pcs of the same Product + Size. Please use Bulk Order / Contact Us for larger quantities.');
    }
    retailQuantityByProductSize.set(key, totalForProductSize);
  }

  const productIds = [...new Set(input.cart.map((item) => item.product_id || item.id).filter((id): id is string => Boolean(id)))];
  if (!productIds.length) throw new Error('No valid product references were found in the cart.');

  const [productsResult, inventoryResult, promotionsResult] = await Promise.all([
    input.db.from('products').select('id, title, price, mrp, category, hsn_code, gst_rate, net_weight_grams, package_length_cm, package_width_cm, package_height_cm').in('id', productIds),
    input.db.from('inventory').select('product_id, size, sku, available_quantity').in('product_id', productIds),
    input.db.from('promotions').select('*').eq('is_enabled', true),
  ]);

  if (productsResult.error || !productsResult.data) throw new Error('Catalog verification failed.');
  if (inventoryResult.error || !inventoryResult.data) throw new Error('Inventory verification failed.');
  if (promotionsResult.error) throw new Error('Promotion pricing could not be verified.');

  const campaigns = getActiveCampaigns((promotionsResult.data as Campaign[]) || []);

  let originalProductPriceTotal = 0;
  let discountedSubtotal = 0;
  let totalTaxAmount = 0;
  let actualWeightGrams = 0;
  let combinedPackageLength = 0;
  let combinedPackageWidth = 0;
  let combinedPackageHeight = 0;
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
    if (!Number.isInteger(exactWeight) || exactWeight <= 0) {
      throw new Error(`Exact physical weight is missing for "${product.title}". Please update products.net_weight_grams in Admin.`);
    }

    const packageLength = Number(product.package_length_cm);
    const packageWidth = Number(product.package_width_cm);
    const packageHeight = Number(product.package_height_cm);
    if (
      !Number.isFinite(packageLength) || packageLength <= 0 ||
      !Number.isFinite(packageWidth) || packageWidth <= 0 ||
      !Number.isFinite(packageHeight) || packageHeight <= 0
    ) {
      throw new Error(`Package dimensions are missing for "${product.title}". Please update length, width and height in Admin.`);
    }

    const originalPrice = Number(product.price);
    if (!Number.isFinite(originalPrice) || originalPrice < 0) throw new Error(`Invalid server price for "${product.title}".`);

    const { finalPrice, appliedOffer } = calculateDiscountedPrice(
      originalPrice,
      campaigns,
      product.category,
      product.id,
      input.couponCode,
      item.selected_campaign_id
    );

    const lineTotal = Number(finalPrice) * quantity;
    const originalLineTotal = originalPrice * quantity;
    const gstRate = Number(product.gst_rate || 5);

    originalProductPriceTotal += originalLineTotal;
    discountedSubtotal += lineTotal;
    totalTaxAmount += lineTotal - lineTotal / (1 + gstRate / 100);
    actualWeightGrams += exactWeight * quantity;

    // One customer order is shipped as one combined parcel.
    // Keep the largest footprint and stack each item's packed height.
    combinedPackageLength = Math.max(combinedPackageLength, packageLength);
    combinedPackageWidth = Math.max(combinedPackageWidth, packageWidth);
    combinedPackageHeight += packageHeight * quantity;

    if (appliedOffer && !primaryOfferName) primaryOfferName = appliedOffer.offerLabel;

    verifiedItems.push({
      product_id: product.id,
      product_title: product.title,
      size,
      sku: inventory.sku || `SKU-${product.id.slice(0, 4)}-${size}`,
      hsn_code: product.hsn_code || '6204',
      gst_rate: gstRate,
      unit_price: Number(finalPrice),
      original_price: originalPrice,
      applied_offer_label: appliedOffer?.offerLabel || null,
      discount_reduction: Math.max(0, originalLineTotal - lineTotal),
      weight_kg: exactWeight / 1000,
      quantity,
      line_total: lineTotal,
    });
  }

  // WELCOME50 is an ORDER-LEVEL launch offer. It is auto-applied when the
  // customer has no other coupon, or honored when WELCOME50 is explicitly set.
  // The generic campaign engine discounts per product, so keeping this here
  // prevents a fixed ₹50 discount from multiplying across a multi-item cart.
  const normalizedCouponCode = String(input.couponCode || '').trim().toUpperCase();
  const productCampaignDiscount = Math.max(0, originalProductPriceTotal - discountedSubtotal);
  const isWelcome50Active = Date.now() <= WELCOME50_END_AT_UTC;
  const hasNoCompetingCoupon = normalizedCouponCode === '' || normalizedCouponCode === WELCOME50_CODE;
  const canApplyWelcome50 =
    hasNoCompetingCoupon &&
    isWelcome50Active &&
    discountedSubtotal >= WELCOME50_MINIMUM_ORDER &&
    productCampaignDiscount === 0;

  if (canApplyWelcome50) {
    const subtotalBeforeCoupon = discountedSubtotal;
    const subtotalBeforeCouponCents = Math.round(subtotalBeforeCoupon * 100);
    const couponCents = Math.min(
      Math.round(WELCOME50_DISCOUNT * 100),
      subtotalBeforeCouponCents
    );
    let remainingCouponCents = couponCents;

    // Allocate the single order-level discount across item lines. This keeps
    // order_items, subtotal, GST and invoice accounting internally consistent.
    verifiedItems.forEach((item, index) => {
      const lineCents = Math.round(item.line_total * 100);
      const isLastItem = index === verifiedItems.length - 1;
      const proportionalCents = subtotalBeforeCouponCents > 0
        ? Math.round((couponCents * lineCents) / subtotalBeforeCouponCents)
        : 0;
      const allocatedCents = isLastItem
        ? remainingCouponCents
        : Math.min(lineCents, remainingCouponCents, proportionalCents);
      const discountedLineCents = Math.max(0, lineCents - allocatedCents);

      item.line_total = discountedLineCents / 100;
      item.unit_price = item.quantity > 0
        ? item.line_total / item.quantity
        : item.unit_price;
      item.discount_reduction = Math.round((item.discount_reduction + allocatedCents / 100) * 100) / 100;
      item.applied_offer_label = 'Website Launch Offer — ₹50 OFF (WELCOME50)';

      remainingCouponCents -= allocatedCents;
    });

    discountedSubtotal = verifiedItems.reduce((sum, item) => sum + item.line_total, 0);
    discountedSubtotal = Math.round(discountedSubtotal * 100) / 100;

    // Prices are GST-inclusive. Treat the order-level coupon as a proportional
    // reduction across the basket so the included tax reduces consistently.
    if (subtotalBeforeCoupon > 0) {
      totalTaxAmount *= discountedSubtotal / subtotalBeforeCoupon;
    }

    primaryOfferName = 'Website Launch Offer — ₹50 OFF (WELCOME50)';
  }

  const combinedShipment: ShippingPackageInput[] = [{
    weight: actualWeightGrams,
    length: combinedPackageLength,
    width: combinedPackageWidth,
    height: combinedPackageHeight,
  }];

  const shipping = await checkPincodeShippingRate(
    cleanPin,
    actualWeightGrams / 1000,
    discountedSubtotal,
    input.paymentMethod === 'COD' ? 'COD' : 'PREPAID',
    combinedShipment
  );

  if (!shipping.isServiceable) {
    throw new Error(shipping.message || 'Delivery is currently unavailable for this PIN code.');
  }

  const shippingCharge = shipping.customerShippingCharge;
  const codCharge = input.paymentMethod === 'COD' ? shipping.providerCodCharge : 0;
  const totalPayable = discountedSubtotal + shippingCharge + codCharge;

  return {
    pricingMode: 'nimbuspost_live',
    originalProductPriceTotal,
    discountDeductionAmount: Math.max(0, originalProductPriceTotal - discountedSubtotal),
    primaryOfferName,
    discountedSubtotal,
    totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
    actualWeightGrams,
    chargeableWeightGrams: Math.round(shipping.chargeableWeightKg * 1000),
    shippingCharge,
    codCharge,
    totalPayable,
    freeShippingApplied: false,
    serviceable: true,
    message: canApplyWelcome50
      ? 'Delivery is available. WELCOME50 launch offer applied.'
      : 'Delivery is available for this PIN code.',
    verifiedItems,
    ruleVersion: 2,
  };
}
