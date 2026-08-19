import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const RTO_MARKUP_MULTIPLIER = 1.3;
const DEFAULT_ORIGIN_PINCODE = '395006';

export interface PincodeShippingResult {
  isServiceable: boolean;
  courierPartnerName?: string;
  estimatedDeliveryDays?: string;
  baseCourierCost: number;
  baseCodCost: number;
  customerShippingCharge: number;
  displayWeight: string;
  actualWeightKg: number;
  chargeableWeightKg: number;
  message?: string;
}

function numberFrom(...values: unknown[]): number {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function pickRate(row: any): number {
  return numberFrom(
    row?.rate,
    row?.total_charges,
    row?.total_charge,
    row?.shipping_charges,
    row?.shipping_charge,
    row?.freight_charge,
    row?.freight
  );
}

function pickCod(row: any): number {
  return numberFrom(
    row?.cod_charges,
    row?.cod_charge,
    row?.cod,
    row?.cod_amount,
    row?.cod_fee
  );
}

/**
 * Server-authoritative shipping quote.
 *
 * Business rule:
 * - Product weights are real physical weights stored by the admin.
 * - There is NO free-shipping threshold or free-shipping toggle.
 * - NimbusPost shipping + COD are combined and multiplied by 1.30.
 * - The browser must never be trusted for the final shipping price.
 */
export async function checkPincodeShippingRate(
  destinationPincode: string,
  totalActualWeightKg: number,
  subtotal: number,
  paymentType: 'COD' | 'PREPAID' = 'COD'
): Promise<PincodeShippingResult> {
  const cleanPin = destinationPincode.trim();
  const actualWeight = Math.max(0.001, Number(totalActualWeightKg) || 0);

  if (!/^\d{6}$/.test(cleanPin)) {
    return {
      isServiceable: false,
      baseCourierCost: 0,
      baseCodCost: 0,
      customerShippingCharge: 0,
      displayWeight: `${actualWeight.toFixed(3)} kg`,
      actualWeightKg: actualWeight,
      chargeableWeightKg: actualWeight,
      message: 'Please enter a valid 6-digit delivery PIN code.'
    };
  }

  // The checkout currently has authoritative physical product weights.
  // Until product dimensions are introduced, chargeable weight equals physical weight.
  const chargeableWeightKg = Math.round(actualWeight * 1000) / 1000;
  const weightInGrams = Math.max(1, Math.round(chargeableWeightKg * 1000));
  const displayWeight = `${chargeableWeightKg.toFixed(3)} kg`;

  const apiKey = process.env.COURIER_API_KEY || process.env.NIMBUSPOST_API_KEY;
  const apiUrl = process.env.COURIER_SERVICEABILITY_URL || 'https://api.nimbuspost.com/v1/courier/serviceability';

  if (!apiKey) {
    return {
      isServiceable: false,
      baseCourierCost: 0,
      baseCodCost: 0,
      customerShippingCharge: 0,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg,
      message: 'Courier service is temporarily unavailable. Please try again shortly.'
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(process.env.COURIER_API_KEY ? { 'api-key': apiKey } : {}),
        ...(process.env.COURIER_SECRET_KEY || process.env.NIMBUSPOST_API_SECRET
          ? { 'api-secret': process.env.COURIER_SECRET_KEY || process.env.NIMBUSPOST_API_SECRET! }
          : {})
      },
      body: JSON.stringify({
        origin: process.env.NIMBUSPOST_ORIGIN_PINCODE || DEFAULT_ORIGIN_PINCODE,
        destination: cleanPin,
        payment_type: paymentType.toLowerCase(),
        weight: weightInGrams,
        amount: Number(subtotal) || 0
      }),
      cache: 'no-store'
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.status) {
      return {
        isServiceable: false,
        baseCourierCost: 0,
        baseCodCost: 0,
        customerShippingCharge: 0,
        displayWeight,
        actualWeightKg: actualWeight,
        chargeableWeightKg,
        message: data?.message || 'Delivery is currently unavailable for this PIN code.'
      };
    }

    const couriers = Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.data?.couriers)
        ? data.data.couriers
        : data.data
          ? [data.data]
          : [];

    if (couriers.length === 0) {
      return {
        isServiceable: false,
        baseCourierCost: 0,
        baseCodCost: 0,
        customerShippingCharge: 0,
        displayWeight,
        actualWeightKg: actualWeight,
        chargeableWeightKg,
        message: 'No courier is serviceable for this PIN code.'
      };
    }

    const serviceableCouriers = couriers
      .map((row: any) => ({
        row,
        shipping: pickRate(row),
        cod: paymentType === 'COD' ? pickCod(row) : 0
      }))
      .filter((item: { shipping: number }) => item.shipping >= 0)
      .sort((a: { shipping: number; cod: number }, b: { shipping: number; cod: number }) =>
        (a.shipping + a.cod) - (b.shipping + b.cod)
      );

    const best = serviceableCouriers[0];
    if (!best) {
      return {
        isServiceable: false,
        baseCourierCost: 0,
        baseCodCost: 0,
        customerShippingCharge: 0,
        displayWeight,
        actualWeightKg: actualWeight,
        chargeableWeightKg,
        message: 'No valid courier rate was returned.'
      };
    }

    const baseCourierCost = best.shipping;
    const baseCodCost = best.cod;
    const courierTotal = baseCourierCost + baseCodCost;

    // FINAL CUSTOMER CHARGE. Never free shipping.
    const customerShippingCharge = Math.ceil(courierTotal * RTO_MARKUP_MULTIPLIER);

    return {
      isServiceable: true,
      courierPartnerName:
        best.row?.name || best.row?.courier_name || best.row?.courier_name_text || 'NimbusPost Courier',
      estimatedDeliveryDays: String(
        best.row?.estimated_delivery_days || best.row?.etd || best.row?.edd || '3-5'
      ),
      baseCourierCost,
      baseCodCost,
      customerShippingCharge,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg
    };
  } catch (error) {
    console.error('[NIMBUSPOST SERVICEABILITY ERROR]', error);

    return {
      isServiceable: false,
      baseCourierCost: 0,
      baseCodCost: 0,
      customerShippingCharge: 0,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg,
      message: 'Courier service is temporarily unavailable. Please try again shortly.'
    };
  }
}
