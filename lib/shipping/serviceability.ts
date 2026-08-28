import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface PincodeShippingResult {
  isServiceable: boolean;
  courierPartnerName?: string;
  estimatedDeliveryDays?: string;
  baseCourierCost: number;         // INTERNAL: Actual courier rate from NimbusPost
  customerShippingCharge: number; // CUSTOMER-FACING: NimbusPost rate x 1.30
  displayWeight: string;
  actualWeightKg: number;
  chargeableWeightKg: number;
  message?: string;
}

/**
 * Customer shipping price authority.
 * Rule: customer courier charge = live NimbusPost courier rate x 1.30.
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

  // Read weight-buffer setting only. Courier markup is intentionally fixed at 1.30.
  const { data: settingsData } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'shipping_rules')
    .maybeSingle();

  const rules = settingsData?.value || { weight_buffer_pct: 0 };

  const weightBufferMultiplier = 1 + ((rules.weight_buffer_pct ?? 0) / 100);
  const actualWeight = Math.max(0.1, totalActualWeightKg);
  const chargeableWeightKg = Math.round(actualWeight * weightBufferMultiplier * 1000) / 1000;
  const weightInGrams = Math.max(100, Math.round(chargeableWeightKg * 1000));
  const displayWeight = `${chargeableWeightKg.toFixed(2)} kg`;

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
          origin: '395006',
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
        const sortedCouriers = [...data.data].sort((a, b) => {
          const rateA = Number(a.rate || a.total_charges || 999);
          const rateB = Number(b.rate || b.total_charges || 999);
          return rateA - rateB;
        });

        const bestCourier = sortedCouriers[0];
        baseCourierRate = Number(bestCourier.rate || bestCourier.total_charges || 0);
        courierName = bestCourier.name || bestCourier.courier_name || 'Standard Courier';
        estimatedDays = String(bestCourier.estimated_delivery_days || '3-4');

        if (!Number.isFinite(baseCourierRate) || baseCourierRate <= 0) {
          isServiceable = false;
        }
      }
    } catch (err) {
      console.warn('NimbusPost live courier-rate check failed:', err);
      isServiceable = false;
    }
  }

  if (!isServiceable) {
    return {
      isServiceable: false,
      baseCourierCost: 0,
      customerShippingCharge: 0,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg,
      message: apiKey
        ? 'Live NimbusPost courier pricing is temporarily unavailable for this PIN code.'
        : 'NimbusPost courier pricing is not configured.'
    };
  }

  // Exact business rule requested: NimbusPost courier rate x 1.30.
  const finalCustomerShipping = Math.ceil(baseCourierRate * 1.30);

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
