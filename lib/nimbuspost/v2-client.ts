import 'server-only';

import {
  requestNimbusServiceabilityWithConfig,
  selectLowestCostCourier,
  NimbusPostV2Error,
  type NimbusServiceabilityInput,
  type NimbusServiceabilityResponse,
} from '@/lib/nimbuspost/v2-transport';

export * from '@/lib/nimbuspost/v2-transport';

function readServerConfiguration() {
  const apiKey = process.env.NIMBUSPOST_API_KEY?.trim();
  const apiSecret = process.env.NIMBUSPOST_API_SECRET?.trim();
  const pickupPincode =
    process.env.NIMBUSPOST_PICKUP_PINCODE?.trim();

  if (!apiKey || !apiSecret) {
    throw new NimbusPostV2Error({
      kind: 'configuration',
      message: 'NimbusPost V2 credentials are not configured.',
    });
  }

  if (!pickupPincode || !/^\d{6}$/.test(pickupPincode)) {
    throw new NimbusPostV2Error({
      kind: 'configuration',
      message:
        'NimbusPost pickup PIN configuration is missing or invalid.',
    });
  }

  return {
    apiKey,
    apiSecret,
    pickupPincode,
  };
}

export async function requestNimbusServiceability(
  input: NimbusServiceabilityInput
): Promise<NimbusServiceabilityResponse> {
  const deliveryPincode =
    String(input.deliveryPincode ?? '').trim();

  if (!/^\d{6}$/.test(deliveryPincode)) {
    throw new NimbusPostV2Error({
      kind: 'validation',
      message: 'Delivery PIN must be exactly 6 digits.',
    });
  }

  if (
    input.paymentMode !== 'cod' &&
    input.paymentMode !== 'prepaid'
  ) {
    throw new NimbusPostV2Error({
      kind: 'validation',
      message: 'Invalid NimbusPost payment mode.',
    });
  }

  if (
    !Array.isArray(input.packages) ||
    input.packages.length === 0
  ) {
    throw new NimbusPostV2Error({
      kind: 'validation',
      message: 'At least one package is required.',
    });
  }

  const orderValuePaise = input.orderValuePaise;

  if (
    typeof orderValuePaise !== 'number' ||
    !Number.isInteger(orderValuePaise) ||
    orderValuePaise <= 0
  ) {
    throw new NimbusPostV2Error({
      kind: 'validation',
      message:
        'A valid positive order value in paise is required for delivery verification.',
    });
  }

  const normalizedInput: NimbusServiceabilityInput = {
    ...input,
    deliveryPincode,
    orderValuePaise,
  };

  return requestNimbusServiceabilityWithConfig(
    normalizedInput,
    readServerConfiguration()
  );
}

export { selectLowestCostCourier };