import { createClient } from '@supabase/supabase-js';
import { getActiveCampaigns, calculateDiscountedPrice, Campaign } from '@/lib/promotions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ozzxrzyahbnavldyrlms.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_jXpCXLTZTtwJ6oVeEq8M9g_ZRx0K1ex'
);

export interface PricingCalculationInput {
  pincode: string;
  paymentMethod: 'COD' | 'ONLINE';
  cart: Array<{
    id?: string;
    product_id: string;
    size?: string;
    quantity: number;
    selected_campaign_id?: string;
  }>;
  couponCode?: string;
}

export interface PricingBreakdown {
  originalProductPriceTotal: number;
  discountDeductionAmount: number;
  primaryOfferName: string | null;
  discountedSubtotal: number;
  totalActualWeightKg: number;
  chargeableWeightKg: number;
  displayWeight: string;
  courierBaseRate: number;
  courierRiskAdjustment: number;
  courierMultiplier: number;
  isFreeShipping: boolean;
  freeShippingThreshold: number;
  customerCourierCharge: number;
  codCharge: number;
  grandTotal: number;
  courierPartnerName: string;
  isServiceable: boolean;
  serviceMessage: string;
  verifiedItems: any[];
  ruleVersion: number;
}

export async function calculateAuthoritativeOrderPricing(
  input: PricingCalculationInput
): Promise<{ success: boolean; data?: PricingBreakdown; error?: string }> {
  try {
    const { pincode, paymentMethod, cart, couponCode } = input;
    const sanitizedPin = String(pincode || '').trim();

    if (!sanitizedPin || sanitizedPin.length !== 6 || !/^\d{6}$/.test(sanitizedPin)) {
      return { success: false, error: 'Please enter a valid 6-digit delivery PIN code.' };
    }

    if (!cart || cart.length === 0) {
      return { success: false, error: 'Cart cannot be empty.' };
    }

    // 1. Fetch live admin rules from Supabase (using standardized key & value columns)
    const { data: settingsRow } = await supabase
      .from('store_settings')
      .select('value, version')
      .eq('key', 'shipping_rules')
      .maybeSingle();

    const rules = settingsRow?.value || {
      weight_buffer_pct: 15,
      cost_buffer_pct: 30,
      courier_multiplier: 1.30,
      cod_charge: 35.00,
      free_shipping_enabled: true,
      free_shipping_threshold: 499.00
    };
    const ruleVersion = settingsRow?.version || 1;

    // 2. Fetch active promotions
    const { data: rawPromotions } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_enabled', true);
    const activeCampaigns = getActiveCampaigns((rawPromotions as Campaign[]) || []);

    // 3. Fetch products and variant inventory
    const productIds = Array.from(new Set(cart.map(c => c.product_id || c.id!)));
    const { data: dbProducts } = await supabase
      .from('products')
      .select('id, title, price, mrp, category, hsn_code, gst_rate')
      .in('id', productIds);

    const { data: dbInventory } = await supabase
      .from('inventory')
      .select('product_id, size, sku, weight_kg, available_quantity')
      .in('product_id', productIds);

    if (!dbProducts || !dbInventory) {
      return { success: false, error: 'Catalog verification failed.' };
    }

    // 4. Combined calculations
    let originalProductPriceTotal = 0;
    let discountedSubtotal = 0;
    let totalTaxAmount = 0;
    let totalActualWeightKg = 0;
    let primaryOfferName: string | null = null;
    const verifiedItems: any[] = [];

    for (const item of cart) {
      const pId = item.product_id || item.id!;
      const size = item.size || 'Free Size';
      const qty = Math.max(1, Number(item.quantity) || 1);

      const prod = dbProducts.find(p => p.id === pId);
      const inv = dbInventory.find(i => i.product_id === pId && i.size === size);

      if (!prod || !inv) {
        return { success: false, error: `Item "${prod?.title || pId}" (${size}) is unavailable.` };
      }

      if (inv.available_quantity < qty) {
        return { 
          success: false, 
          error: `Insufficient stock for "${prod.title}" (${size}). Available: ${inv.available_quantity}` 
        };
      }

      const origPrice = Number(prod.price || prod.mrp || 0);
      const { finalPrice, appliedOffer } = calculateDiscountedPrice(
        origPrice,
        activeCampaigns,
        prod.category,
        prod.id,
        couponCode,
        item.selected_campaign_id
      );

      const unitWeight = Number(inv.weight_kg || 0.5);
      const lineItemTotal = finalPrice * qty;
      const gstRate = Number(prod.gst_rate || 5);
      const taxableAmount = lineItemTotal / (1 + gstRate / 100);
      const gstAmount = lineItemTotal - taxableAmount;

      originalProductPriceTotal += origPrice * qty;
      discountedSubtotal += lineItemTotal;
      totalTaxAmount += gstAmount;
      totalActualWeightKg += unitWeight * qty;

      if (appliedOffer && !primaryOfferName) {
        primaryOfferName = appliedOffer.offerLabel;
      }

      verifiedItems.push({
        product_id: prod.id,
        product_title: prod.title,
        size,
        sku: inv.sku || `SKU-${prod.id.slice(0, 4)}-${size}`,
        hsn_code: prod.hsn_code || '6204',
        gst_rate: gstRate,
        unit_price: finalPrice,
        mrp: origPrice,
        applied_offer_label: appliedOffer?.offerLabel || null,
        weight_kg: unitWeight,
        quantity: qty,
        line_total: lineItemTotal
      });
    }

    const discountDeductionAmount = Math.max(0, originalProductPriceTotal - discountedSubtotal);

    // 5. Weight Calculation: Weight Buffer (Default +15%)
    const weightBufferMultiplier = 1 + ((Number(rules.weight_buffer_pct) || 15) / 100);
    const chargeableWeightKg = Math.max(0.5, Math.round(totalActualWeightKg * weightBufferMultiplier * 1000) / 1000);
    const displayWeight = `${chargeableWeightKg.toFixed(2)} kg`;

    // 6. Base Courier Rate (Live NimbusPost Lookup with Standard Fallback)
    let courierBaseRate = 45 + Math.max(0, Math.ceil(chargeableWeightKg - 0.5) * 35);
    let courierPartnerName = 'Express Courier';
    let isServiceable = true;

    const apiKey = process.env.COURIER_API_KEY;
    const originPin = process.env.WAREHOUSE_PINCODE || '395006';

    if (apiKey) {
      try {
        const nimbusRes = await fetch('https://api.nimbuspost.com/v1/courier/serviceability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            origin: originPin,
            destination: sanitizedPin,
            payment_type: paymentMethod === 'ONLINE' ? 'prepaid' : 'cod',
            weight: Math.round(chargeableWeightKg * 1000),
            length: 10,
            breadth: 10,
            height: 5,
            amount: discountedSubtotal
          }),
          signal: AbortSignal.timeout(4000)
        });

        const nimbusData = await nimbusRes.json();
        if (nimbusRes.ok && nimbusData.status && Array.isArray(nimbusData.data) && nimbusData.data.length > 0) {
          const cheapest = nimbusData.data.reduce((prev: any, curr: any) => 
            Number(curr.rate || curr.total_charges) < Number(prev.rate || prev.total_charges) ? curr : prev
          );
          courierBaseRate = Number(cheapest.rate || cheapest.total_charges || courierBaseRate);
          courierPartnerName = cheapest.name || cheapest.courier_name || 'NimbusPost Partner';
        }
      } catch (err) {
        console.warn('Courier API lookup timed out, applying standard rates.');
      }
    }

    // 7. Authoritative Courier Multiplier (1.30 = +30% RTO risk)
    const courierMultiplier = Number(rules.courier_multiplier) || 1.30;
    const calculatedCustomerCourier = Math.ceil(courierBaseRate * courierMultiplier);
    const courierRiskAdjustment = Math.max(0, calculatedCustomerCourier - courierBaseRate);

    // 8. Admin-Controlled Free Shipping Rule
    const freeShippingThreshold = Number(rules.free_shipping_threshold) || 499;
    const isFreeShipping = Boolean(rules.free_shipping_enabled) && (discountedSubtotal >= freeShippingThreshold);
    const customerCourierCharge = isFreeShipping ? 0 : calculatedCustomerCourier;

    // 9. COD Fee Separation
    const configuredCodCharge = Number(rules.cod_charge) ?? 35.00;
    const finalCodCharge = paymentMethod === 'COD' ? configuredCodCharge : 0;

    // 10. Grand Total
    const grandTotal = discountedSubtotal + customerCourierCharge + finalCodCharge;

    return {
      success: true,
      data: {
        originalProductPriceTotal,
        discountDeductionAmount,
        primaryOfferName,
        discountedSubtotal,
        totalActualWeightKg,
        chargeableWeightKg,
        displayWeight,
        courierBaseRate,
        courierRiskAdjustment,
        courierMultiplier,
        isFreeShipping,
        freeShippingThreshold,
        customerCourierCharge,
        codCharge: finalCodCharge,
        grandTotal,
        courierPartnerName,
        isServiceable,
        serviceMessage: `✓ Delivery available via ${courierPartnerName}`,
        verifiedItems,
        ruleVersion
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal pricing error.' };
  }
}