import type { NormalizedProductPackage } from '../catalog/product-package.ts';

const NIMBUSPOST_V2_BASE_URL = 'https://api-v2.nimbuspost.com';
const DEFAULT_TIMEOUT_MS = 8_000;

export type NimbusPaymentMode = 'cod' | 'prepaid';

export interface NimbusServiceabilityInput {
  deliveryPincode: string;
  paymentMode: NimbusPaymentMode;
  packages: NormalizedProductPackage[];
  orderValuePaise?: number;
}

export interface NimbusRateResult {
  chargeableGrams: number;
  chargedGrams: number;
  shippingChargesPaise: number;
  codChargesPaise: number;
  surchargesPaise: number;
  insurancePaise: number;
  rtoChargesPaise: number;
  totalPaise: number;
  totalIfRtoPaise: number;
  taxableBasePaise: number;
  primarySlab: unknown;
}

export interface NimbusAvailableCourier {
  courierId: string | number;
  courierCode: string;
  courierName: string;
  courierDisplayName: string;
  courierType: string;
  zone: string;
  zoneLabel: string;
  tatDays: number;
  result: NimbusRateResult;
}

export interface NimbusExcludedCourier {
  courierId?: string | number;
  courierCode?: string;
  courierName?: string;
  courierDisplayName?: string;
  [key: string]: unknown;
}

export interface NimbusServiceabilityResponse {
  success: boolean;
  data?: {
    pickupPincode: string;
    deliveryPincode: string;
    paymentMode: NimbusPaymentMode;
    totalChargeableGrams: number;
    available: NimbusAvailableCourier[];
    excluded: NimbusExcludedCourier[];
  };
  error?: {
    code?: string;
    detail?: string;
  };
  meta?: {
    requestId?: string;
    traceId?: string;
  };
}

export type NimbusErrorKind =
  | 'configuration'
  | 'validation'
  | 'authentication'
  | 'rate_limit'
  | 'timeout'
  | 'network'
  | 'api';

export class NimbusPostV2Error extends Error {
  readonly kind: NimbusErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly detail?: string;
  readonly requestId?: string;
  readonly traceId?: string;

  constructor(input: {
    message: string;
    kind: NimbusErrorKind;
    status?: number;
    code?: string;
    detail?: string;
    requestId?: string;
    traceId?: string;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });

    this.name = 'NimbusPostV2Error';
    this.kind = input.kind;
    this.status = input.status;
    this.code = input.code;
    this.detail = input.detail;
    this.requestId = input.requestId;
    this.traceId = input.traceId;
  }
}

export interface NimbusTransportConfig {
  apiKey: string;
  apiSecret: string;
  pickupPincode: string;
}

export interface NimbusTransportOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function validateConfiguration(config: NimbusTransportConfig) {
  if (!config.apiKey || !config.apiSecret) {
    throw new NimbusPostV2Error({
      kind: 'configuration',
      message: 'NimbusPost V2 credentials are not configured.',
    });
  }

  if (!/^\d{6}$/.test(config.pickupPincode)) {
    throw new NimbusPostV2Error({
      kind: 'configuration',
      message:
        'NimbusPost pickup PIN configuration is missing or invalid.',
    });
  }
}

function validateInput(input: NimbusServiceabilityInput) {
  if (!/^\d{6}$/.test(String(input.deliveryPincode).trim())) {
    throw new NimbusPostV2Error({
      kind: 'validation',
      message: 'A valid delivery PIN code is required.',
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
      message: 'At least one authoritative package is required.',
    });
  }

  const invalidPackage = input.packages.some(
    (pkg) =>
      !Number.isFinite(pkg.weight) ||
      pkg.weight <= 0 ||
      !Number.isFinite(pkg.length) ||
      pkg.length <= 0 ||
      !Number.isFinite(pkg.width) ||
      pkg.width <= 0 ||
      !Number.isFinite(pkg.height) ||
      pkg.height <= 0
  );

  if (invalidPackage) {
    throw new NimbusPostV2Error({
      kind: 'validation',
      message:
        'Authoritative package weight and dimensions are required.',
    });
  }

  /*
   * NimbusPost V2 documentation describes orderValuePaise as
   * COD-required, but the verified live provider endpoint also
   * requires Order Value for prepaid requests.
   *
   * Therefore we intentionally require and send authoritative
   * orderValuePaise for BOTH COD and prepaid serviceability.
   */
  if (
    !Number.isInteger(input.orderValuePaise) ||
    Number(input.orderValuePaise) <= 0
  ) {
    throw new NimbusPostV2Error({
      kind: 'validation',
      message:
        'A positive authoritative order value in paise is required for delivery verification.',
    });
  }
}

function errorKindForStatus(
  status: number
): NimbusErrorKind {
  if (status === 400 || status === 422) {
    return 'validation';
  }

  if (status === 401) {
    return 'authentication';
  }

  if (status === 429) {
    return 'rate_limit';
  }

  return 'api';
}

export async function requestNimbusServiceabilityWithConfig(
  input: NimbusServiceabilityInput,
  config: NimbusTransportConfig,
  options: NimbusTransportOptions = {}
): Promise<NimbusServiceabilityResponse> {
  validateInput(input);
  validateConfiguration(config);

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  /*
   * IMPORTANT:
   * orderValuePaise is deliberately sent for BOTH:
   *
   * paymentMode: "cod"
   * paymentMode: "prepaid"
   *
   * This matches the verified live NimbusPost validator behavior.
   */
  const body = {
    pickupPincode: config.pickupPincode,
    deliveryPincode: input.deliveryPincode.trim(),
    paymentMode: input.paymentMode,
    packages: input.packages,
    orderValuePaise: input.orderValuePaise,
  };

  /*
   * Safe diagnostics only.
   * No API key, secret, actual pickup PIN,
   * customer address, phone or email is logged.
   */
  console.info(
    '[NIMBUSPOST_V2_REQUEST_SUMMARY]',
    JSON.stringify({
      pickupPincodePresent:
        /^\d{6}$/.test(config.pickupPincode),

      deliveryPincodePresent:
        /^\d{6}$/.test(input.deliveryPincode),

      paymentMode: input.paymentMode,

      packageCount: input.packages.length,

      packageMeasurementsPresent:
        input.packages.every(
          (pkg) =>
            Number.isFinite(pkg.weight) &&
            pkg.weight > 0 &&
            Number.isFinite(pkg.length) &&
            pkg.length > 0 &&
            Number.isFinite(pkg.width) &&
            pkg.width > 0 &&
            Number.isFinite(pkg.height) &&
            pkg.height > 0
        ),

      orderValuePaiseIncluded:
        Object.hasOwn(body, 'orderValuePaise'),

      orderValuePaiseValid:
        Number.isInteger(input.orderValuePaise) &&
        Number(input.orderValuePaise) > 0,
    })
  );

  try {
    const response = await (
      options.fetchImpl ?? fetch
    )(
      `${NIMBUSPOST_V2_BASE_URL}/v2/serviceability`,
      {
        method: 'POST',

        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'x-api-secret': config.apiSecret,
        },

        body: JSON.stringify(body),

        cache: 'no-store',

        signal: controller.signal,
      }
    );

    const payload = (
      await response
        .json()
        .catch(() => ({}))
    ) as NimbusServiceabilityResponse;

    if (!response.ok) {
      console.error(
        '[NIMBUSPOST_V2_UPSTREAM_ERROR]',
        JSON.stringify({
          status: response.status,
          code: payload.error?.code ?? null,
          detail: payload.error?.detail ?? null,
          requestId:
            payload.meta?.requestId ?? null,
          traceId:
            payload.meta?.traceId ?? null,
        })
      );

      throw new NimbusPostV2Error({
        kind: errorKindForStatus(response.status),
        status: response.status,
        code: payload.error?.code,
        detail: payload.error?.detail,
        requestId: payload.meta?.requestId,
        traceId: payload.meta?.traceId,
        message:
          `NimbusPost V2 serviceability failed with HTTP ${response.status}.`,
      });
    }

    if (
      payload.success !== true ||
      !payload.data ||
      !Array.isArray(payload.data.available)
    ) {
      throw new NimbusPostV2Error({
        kind: 'api',
        status: response.status,
        code: payload.error?.code,
        detail: payload.error?.detail,
        requestId: payload.meta?.requestId,
        traceId: payload.meta?.traceId,
        message:
          'NimbusPost V2 returned an invalid serviceability response.',
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof NimbusPostV2Error) {
      throw error;
    }

    if (controller.signal.aborted) {
      throw new NimbusPostV2Error({
        kind: 'timeout',
        message:
          'NimbusPost V2 serviceability timed out.',
        cause: error,
      });
    }

    throw new NimbusPostV2Error({
      kind: 'network',
      message:
        'NimbusPost V2 serviceability could not be reached.',
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function selectLowestCostCourier(
  available: NimbusAvailableCourier[]
): NimbusAvailableCourier | null {
  const valid = available.filter((courier) => {
    const totalPaise = Number(
      courier.result?.totalPaise
    );

    return (
      courier.courierId !== undefined &&
      Number.isInteger(totalPaise) &&
      totalPaise > 0
    );
  });

  valid.sort((left, right) => {
    const rateDifference =
      left.result.totalPaise -
      right.result.totalPaise;

    if (rateDifference !== 0) {
      return rateDifference;
    }

    return String(left.courierId).localeCompare(
      String(right.courierId),
      'en'
    );
  });

  return valid[0] ?? null;
}