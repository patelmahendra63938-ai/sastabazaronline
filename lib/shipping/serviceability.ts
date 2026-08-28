import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ShippingPackageInput {
  weight: number; // grams
  length: number; // cm
  width: number;  // cm
  height: number; // cm
}

export interface PincodeShippingResult {
  isServiceable: boolean;
  courierPartnerName?: string;
  estimatedDeliveryDays?: string;
  baseCourierCost: number;
  customerShippingCharge: number;
  displayWeight: string;
  actualWeightKg: number;
  chargeableWeightKg: number;
  message?: string;
}

type NimbusRateResult = {
  chargeableGrams?: number;
  chargedGrams?: number;
  shippingChargesPaise?: number;
  codChargesPaise?: number;
  surchargesPaise?: number;
  insurancePaise?: number;
  rtoChargesPaise?: number;
  totalPaise?: number;
  taxableBasePaise?: number;
};

type NimbusCourier = {
  courierId?: string | number;
  courierName?: string;
  courierDisplayName?: string;
  tatDays?: number;
  result?: NimbusRateResult;
};

type NimbusServiceabilityResponse = {
  success?: boolean;
  data?: {
    totalChargeableGrams?: number;
    available?: NimbusCourier[];
    excluded?: unknown[];
  };
  error?: {
    code?: string;
    detail?: string;
  };
};

function cleanEnv(value?: string | null) {
  return String(value || '').trim();
}

function positiveNumber(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getCourierCostPaise(courier: NimbusCourier): number {
  const result = courier.result || {};

  // NimbusPost V2 exposes the forward freight separately. This is the correct
  // source for the website's courier charge because COD remains a separate
  // customer charge in our checkout logic.
  const shipping = positiveNumber(result.shippingChargesPaise);
  const surcharges = positiveNumber(result.surchargesPaise);
  const insurance = positiveNumber(result.insurancePaise);
  const directForwardCost = shipping + surcharges + insurance;

  if (directForwardCost > 0) {
    return directForwardCost;
  }

  // Defensive fallback for valid provider responses where only an aggregate
  // total is populated. Remove COD and RTO components so we keep forward
  // courier cost only.
  const total = positiveNumber(result.totalPaise);
  const cod = positiveNumber(result.codChargesPaise);
  const rto = positiveNumber(result.rtoChargesPaise);
  const aggregateForwardCost = total - cod - rto;

  return Number.isFinite(aggregateForwardCost) && aggregateForwardCost > 0
    ? aggregateForwardCost
    : 0;
}

/**
 * Customer shipping price authority.
 * Rule: customer courier charge = live NimbusPost forward courier rate x 1.30.
 * NimbusPost Partner API v2 only; no fabricated rate fallback.
 */
export async function checkPincodeShippingRate(
  destinationPincode: string,
  totalActualWeightKg: number,
  subtotal: number,
  paymentType: 'COD' | 'PREPAID' = 'COD',
  packages: ShippingPackageInput[] = []
): Promise<PincodeShippingResult> {
  const cleanPin = destinationPincode.trim();
  const actualWeight = Math.max(0.001, Number(totalActualWeightKg) || 0);
  const displayWeight = `${actualWeight.toFixed(2)} kg`;

  if (!/^\d{6}$/.test(cleanPin)) {
    return {
      isServiceable: false,
      baseCourierCost: 0,
      customerShippingCharge: 0,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg: actualWeight,
      message: 'Please enter a valid 6-digit delivery PIN code.'
    };
  }

  const apiKey = cleanEnv(process.env.NIMBUSPOST_API_KEY || process.env.COURIER_API_KEY);
  const apiSecret = cleanEnv(process.env.NIMBUSPOST_API_SECRET || process.env.COURIER_SECRET_KEY);
  const pickupPincode = cleanEnv(process.env.NIMBUSPOST_PICKUP_PINCODE);

  if (!apiKey || !apiSecret) {
    return {
      isServiceable: false,
      baseCourierCost: 0,
      customerShippingCharge: 0,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg: actualWeight,
      message: 'NimbusPost courier pricing is not fully configured.'
    };
  }

  if (!/^\d{6}$/.test(pickupPincode)) {
    return {
      isServiceable: false,
      baseCourierCost: 0,
      customerShippingCharge: 0,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg: actualWeight,
      message: 'NimbusPost pickup PIN configuration is missing or invalid.'
    };
  }

  const validPackages = packages.filter((pkg) =>
    Number.isFinite(pkg.weight) && pkg.weight > 0 &&
    Number.isFinite(pkg.length) && pkg.length > 0 &&
    Number.isFinite(pkg.width) && pkg.width > 0 &&
    Number.isFinite(pkg.height) && pkg.height > 0
  );

  if (!validPackages.length || validPackages.length !== packages.length) {
    return {
      isServiceable: false,
      baseCourierCost: 0,
      customerShippingCharge: 0,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg: actualWeight,
      message: 'Product package weight and dimensions are required for live NimbusPost pricing.'
    };
  }

  const orderValuePaise = Math.round(Number(subtotal) * 100);
  if (!Number.isInteger(orderValuePaise) || orderValuePaise <= 0) {
    return {
      isServiceable: false,
      baseCourierCost: 0,
      customerShippingCharge: 0,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg: actualWeight,
      message: 'A valid order value is required for live NimbusPost pricing.'
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch('https://api-v2.nimbuspost.com/v2/serviceability', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-api-secret': apiSecret,
      },
      body: JSON.stringify({
        pickupPincode,
        deliveryPincode: cleanPin,
        paymentMode: paymentType === 'COD' ? 'cod' : 'prepaid',
        packages: validPackages,
        orderValuePaise,
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => ({}))) as NimbusServiceabilityResponse;

    if (!response.ok || data.success !== true || !Array.isArray(data.data?.available)) {
      console.error('[NIMBUSPOST_V2_RATE_ERROR]', {
        status: response.status,
        code: data.error?.code || null,
        detail: data.error?.detail || null,
      });

      return {
        isServiceable: false,
        baseCourierCost: 0,
        customerShippingCharge: 0,
        displayWeight,
        actualWeightKg: actualWeight,
        chargeableWeightKg: actualWeight,
        message: response.status === 401
          ? 'NimbusPost authentication failed. Please check the server API key and secret.'
          : 'Live NimbusPost courier pricing is temporarily unavailable for this PIN code.'
      };
    }

    const available = data.data?.available || [];

    console.info('[NIMBUSPOST_V2_SERVICEABILITY_SUMMARY]', {
      availableCount: available.length,
      excludedCount: Array.isArray(data.data?.excluded) ? data.data?.excluded.length : 0,
      quotedCouriers: available.map((courier) => ({
        courierIdPresent: courier.courierId !== undefined,
        hasShippingCharge: positiveNumber(courier.result?.shippingChargesPaise) > 0,
        hasTotal: positiveNumber(courier.result?.totalPaise) > 0,
      })),
    });

    const pricedCouriers = available
      .map((courier) => ({ courier, courierPaise: getCourierCostPaise(courier) }))
      .filter((entry) => entry.courierPaise > 0)
      .sort((a, b) => a.courierPaise - b.courierPaise);

    const best = pricedCouriers[0];
    if (!best) {
      return {
        isServiceable: false,
        baseCourierCost: 0,
        customerShippingCharge: 0,
        displayWeight,
        actualWeightKg: actualWeight,
        chargeableWeightKg: Number(data.data?.totalChargeableGrams || 0) / 1000 || actualWeight,
        message: available.length === 0
          ? 'No NimbusPost courier is currently serviceable for this PIN code.'
          : 'NimbusPost returned courier options but no valid forward shipping rate. Please retry.'
      };
    }

    const baseCourierRate = best.courierPaise / 100;
    const finalCustomerShipping = Math.ceil(baseCourierRate * 1.30);
    const chargeableWeightKg = Number(data.data?.totalChargeableGrams || 0) / 1000 || actualWeight;

    return {
      isServiceable: true,
      courierPartnerName: best.courier.courierDisplayName || best.courier.courierName || 'NimbusPost Courier',
      estimatedDeliveryDays: String(best.courier.tatDays || ''),
      baseCourierCost: baseCourierRate,
      customerShippingCharge: finalCustomerShipping,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg,
    };
  } catch (error) {
    console.error('[NIMBUSPOST_V2_RATE_EXCEPTION]', error);
    return {
      isServiceable: false,
      baseCourierCost: 0,
      customerShippingCharge: 0,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg: actualWeight,
      message: controller.signal.aborted
        ? 'NimbusPost courier pricing request timed out. Please try again.'
        : 'Live NimbusPost courier pricing is temporarily unavailable for this PIN code.'
    };
  } finally {
    clearTimeout(timeout);
  }
}
