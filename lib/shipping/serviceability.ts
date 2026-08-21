import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface PincodeShippingResult {
  isServiceable: boolean;
  courierPartnerName?: string;
  estimatedDeliveryDays?: string;
  baseCourierCost: number;       // INTERNAL: Actual courier rate from NimbusPost
  customerShippingCharge: number; // CUSTOMER-FACING: After markup or free shipping waiver
  displayWeight: string;         // CUSTOMER-FACING: e.g. "1.15 kg"
  actualWeightKg: number;        // INTERNAL
  chargeableWeightKg: number;    // INTERNAL
  message?: string;
}

/**
 * @deprecated Not a pricing authority. Phase B checkout uses the temporary-slabs
 * pricing engine and local six-digit PIN validation. Retained only for legacy
 * non-checkout callers until the verified NimbusPost v2 contract is implemented.
 */
export async function checkPincodeShippingRate(
  destinationPincode: string,
  totalActualWeightKg: number,
  subtotal: number,
  paymentType: 'COD' | 'PREPAID' = 'COD'
): Promise<PincodeShippingResult> {
  const cleanPin = destinationPincode.trim();
  if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
    return {
      isServiceable: false,
      baseCourierCost: 0,
      customerShippingCharge: 0,
      displayWeight: '0.50 kg',
      actualWeightKg: 0.5,
      chargeableWeightKg: 0.5,
      message: 'Please enter a valid 6-digit delivery PIN code.'
    };
  }

  // 1. Fetch Shipping Business Rules from store_settings
  const { data: settingsData } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'shipping_rules')
    .maybeSingle();

  const rules = settingsData?.value || {
    weight_buffer_pct: 15,
    cost_buffer_pct: 30,
    apply_courier_charge: true,
    free_shipping_threshold: 499,
    free_shipping_enabled: true
  };

  // 2. Internal Weight Buffer Calculation (15% packaging buffer)
  const weightBufferMultiplier = 1 + ((rules.weight_buffer_pct ?? 15) / 100);
  const actualWeight = Math.max(0.1, totalActualWeightKg);
  const chargeableWeightKg = Math.round(actualWeight * weightBufferMultiplier * 1000) / 1000;
  const weightInGrams = Math.max(100, Math.round(chargeableWeightKg * 1000));
  const displayWeight = `${chargeableWeightKg.toFixed(2)} kg`;

  // 3. Query Courier Partner API (NimbusPost)
  const apiKey = process.env.COURIER_API_KEY || process.env.NIMBUSPOST_API_KEY;
  let baseCourierRate = 0;
  let isServiceable = false;
  let courierName = 'Express Courier';
  let estimatedDays = '3-5';

  if (apiKey) {
    try {
      const response = await fetch('https://api.nimbuspost.com/v1/courier/serviceability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'api-key': apiKey,
          'api-secret': process.env.COURIER_SECRET_KEY || process.env.NIMBUSPOST_API_SECRET || ''
        },
        body: JSON.stringify({
          origin: '395006', // Surat Fulfillment Center
          destination: cleanPin,
          payment_type: paymentType.toLowerCase(),
          weight: weightInGrams,
          length: 15,
          breadth: 12,
          height: 5,
          amount: subtotal
        }),
        cache: 'no-store'
      });

      const data = await response.json();

      if (response.ok && data.status && Array.isArray(data.data) && data.data.length > 0) {
        isServiceable = true;
        // Select lowest-cost serviceable courier partner
        const sortedCouriers = [...data.data].sort((a, b) => {
          const rateA = Number(a.rate || a.total_charges || 999);
          const rateB = Number(b.rate || b.total_charges || 999);
          return rateA - rateB;
        });

        const bestCourier = sortedCouriers[0];
        baseCourierRate = Number(bestCourier.rate || bestCourier.total_charges || 45);
        courierName = bestCourier.name || bestCourier.courier_name || 'Standard Courier';
        estimatedDays = String(bestCourier.estimated_delivery_days || '3-4');
      } else {
        isServiceable = false;
      }
    } catch (err) {
      console.warn('Live courier partner check fallback:', err);
      // Fallback rate estimation for testing if API is unreachable
      isServiceable = true;
      baseCourierRate = 45 + Math.max(0, Math.ceil(chargeableWeightKg - 0.5) * 35);
    }
  } else {
    // Standard baseline fallback if courier credentials are not yet configured
    isServiceable = true;
    baseCourierRate = 45 + Math.max(0, Math.ceil(chargeableWeightKg - 0.5) * 35);
  }

  if (!isServiceable) {
    return {
      isServiceable: false,
      baseCourierCost: 0,
      customerShippingCharge: 0,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg,
      message: 'Delivery is currently unavailable for this PIN code.'
    };
  }

  // 4. Apply Business Markup (30% default)
  const markupMultiplier = 1 + ((rules.cost_buffer_pct ?? 30) / 100);
  let finalCustomerShipping = Math.ceil(baseCourierRate * markupMultiplier);

  // 5. Apply Free Shipping Threshold or Admin Toggle
  const applyCourierCharge = rules.apply_courier_charge !== false;
  const meetsFreeShipping = rules.free_shipping_enabled && subtotal >= (rules.free_shipping_threshold ?? 499);

  if (!applyCourierCharge || meetsFreeShipping) {
    finalCustomerShipping = 0;
  }

  return {
    isServiceable: true,
    courierPartnerName: courierName,
    estimatedDeliveryDays: estimatedDays,
    baseCourierCost: baseCourierRate,
    customerShippingCharge: finalCustomerShipping,
    displayWeight,
    actualWeightKg: actualWeight,
    chargeableWeightKg
  };
}
