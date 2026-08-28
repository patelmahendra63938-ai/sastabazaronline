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
  providerCodCharge: number;
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
  const shipping = positiveNumber(result.shippingChargesPaise);
  const surcharges = positiveNumber(result.surchargesPaise);
  const insurance = positiveNumber(result.insurancePaise);
  const directForwardCost = shipping + surcharges + insurance;

  if (directForwardCost > 0) return directForwardCost;

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
 * Shipping shown to customer = NimbusPost forward courier rate x 1.30.
 * COD shown to customer = NimbusPost original COD charge (no markup).
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

  const unavailable = (message: string): PincodeShippingResult => ({
    isServiceable: false,
    baseCourierCost: 0,
    customerShippingCharge: 0,
    providerCodCharge: 0,
    displayWeight,
    actualWeightKg: actualWeight,
    chargeableWeightKg: actualWeight,
    message,
  });

  if (!/^\d{6}$/.test(cleanPin)) {
    return unavailable('Please enter a valid 6-digit delivery PIN code.');
  }

  const apiKey = cleanEnv(process.env.NIMBUSPOST_API_KEY || process.env.COURIER_API_KEY);
  const apiSecret = cleanEnv(process.env.NIMBUSPOST_API_SECRET || process.env.COURIER_SECRET_KEY);
  const pickupPincode = cleanEnv(process.env.NIMBUSPOST_PICKUP_PINCODE);

  if (!apiKey || !apiSecret) {
    return unavailable('NimbusPost courier pricing is not fully configured.');
  }

  if (!/^\d{6}$/.test(pickupPincode)) {
    return unavailable('NimbusPost pickup PIN configuration is missing or invalid.');
  }

  const validPackages = packages.filter((pkg) =>
    Number.isFinite(pkg.weight) && pkg.weight > 0 &&
    Number.isFinite(pkg.length) && pkg.length > 0 &&
    Number.isFinite(pkg.width) && pkg.width > 0 &&
    Number.isFinite(pkg.height) && pkg.height > 0
  );

  if (!validPackages.length || validPackages.length !== packages.length) {
    return unavailable('Product package weight and dimensions are required for live NimbusPost pricing.');
  }

  const orderValuePaise = Math.round(Number(subtotal) * 100);
  if (!Number.isInteger(orderValuePaise) || orderValuePaise <= 0) {
    return unavailable('A valid order value is required for live NimbusPost pricing.');
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
      return unavailable(
        response.status === 401
          ? 'NimbusPost authentication failed. Please check the server API key and secret.'
          : 'Live courier pricing is temporarily unavailable for this PIN code.'
      );
    }

    const available = data.data?.available || [];

    console.info('[NIMBUSPOST_V2_SERVICEABILITY_SUMMARY]', {
      availableCount: available.length,
      excludedCount: Array.isArray(data.data?.excluded) ? data.data?.excluded.length : 0,
      quotedCouriers: available.map((courier) => ({
        courierIdPresent: courier.courierId !== undefined,
        hasShippingCharge: positiveNumber(courier.result?.shippingChargesPaise) > 0,
        hasCodCharge: positiveNumber(courier.result?.codChargesPaise) > 0,
        hasTotal: positiveNumber(courier.result?.totalPaise) > 0,
      })),
    });

    const pricedCouriers = available
      .map((courier) => ({ courier, courierPaise: getCourierCostPaise(courier) }))
      .filter((entry) => entry.courierPaise > 0)
      .sort((a, b) => a.courierPaise - b.courierPaise);

    const best = pricedCouriers[0];
    if (!best) {
      return unavailable(
        available.length === 0
          ? 'Delivery is not currently available for this PIN code.'
          : 'Courier options were returned but no valid shipping rate is available. Please retry.'
      );
    }

    const baseCourierRate = best.courierPaise / 100;
    const finalCustomerShipping = Math.ceil(baseCourierRate * 1.30);
    const providerCodCharge =
      paymentType === 'COD'
        ? positiveNumber(best.courier.result?.codChargesPaise) / 100
        : 0;
    const chargeableWeightKg = Number(data.data?.totalChargeableGrams || 0) / 1000 || actualWeight;

    return {
      isServiceable: true,
      courierPartnerName: best.courier.courierDisplayName || best.courier.courierName || 'Courier Partner',
      estimatedDeliveryDays: String(best.courier.tatDays || ''),
      baseCourierCost: baseCourierRate,
      customerShippingCharge: finalCustomerShipping,
      providerCodCharge,
      displayWeight,
      actualWeightKg: actualWeight,
      chargeableWeightKg,
      message: 'Delivery is available for this PIN code.',
    };
  } catch (error) {
    console.error('[NIMBUSPOST_V2_RATE_EXCEPTION]', error);
    return unavailable(
      controller.signal.aborted
        ? 'Courier pricing request timed out. Please try again.'
        : 'Live courier pricing is temporarily unavailable for this PIN code.'
    );
  } finally {
    clearTimeout(timeout);
  }
}
