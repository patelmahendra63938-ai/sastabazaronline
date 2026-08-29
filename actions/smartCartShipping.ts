'use server';

import {
  checkPincodeShippingRate,
  type ShippingPackageInput,
} from '@/lib/shipping/serviceability';

export interface SmartCartShippingInput {
  pincode: string;
  totalWeightKg: number;
  subtotal: number;
  packages: ShippingPackageInput[];
}

export async function getSmartCartShippingQuoteAction(
  input: SmartCartShippingInput
) {
  try {
    const result = await checkPincodeShippingRate(
      input.pincode,
      input.totalWeightKg,
      input.subtotal,
      'PREPAID',
      input.packages
    );

    return {
      success: true,
      isServiceable: result.isServiceable,
      customerShippingCharge: result.customerShippingCharge,
      courierPartnerName: result.courierPartnerName,
      estimatedDeliveryDays: result.estimatedDeliveryDays,
      chargeableWeightKg: result.chargeableWeightKg,
      message: result.message,
    };
  } catch (error: any) {
    return {
      success: false,
      isServiceable: false,
      customerShippingCharge: 0,
      error: error?.message || 'Unable to calculate Smart Cart delivery saving.',
    };
  }
}
