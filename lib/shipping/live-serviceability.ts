import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedProductPackage } from '@/lib/catalog/product-package';

import {
  calculateNimbusCustomerPricing,
  NimbusCustomerPricingError,
  type NimbusCustomerPricing,
} from '@/lib/pricing/nimbus-customer-pricing';

import {
  buildAuthoritativePackages,
  type ProductPackageRow,
  type ServiceabilityCartReference,
} from '@/lib/shipping/package-builder';

import {
  NimbusPostV2Error,
  requestNimbusServiceability,
  selectLowestCostCourier,
  type NimbusAvailableCourier,
  type NimbusPaymentMode,
} from '@/lib/nimbuspost/v2-client';

export interface LiveServiceabilityResult {
  serviceable: boolean;
  packages: NormalizedProductPackage[];
  selectedCourier: NimbusAvailableCourier | null;
  customerPricing: NimbusCustomerPricing | null;
  actualCourierCost: number | null;
  totalChargeableGrams: number | null;
}

export async function verifyLiveServiceability(input: {
  db: SupabaseClient;
  cart: ServiceabilityCartReference[];
  deliveryPincode: string;
  paymentMode: NimbusPaymentMode;
  orderValuePaise: number;
}): Promise<LiveServiceabilityResult> {
  const productIds = [
    ...new Set(
      input.cart
        .map((item) => item.product_id || item.id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (
    !productIds.length ||
    input.cart.some(
      (item) =>
        !String(item.product_id || item.id || '').trim()
    )
  ) {
    throw new Error(
      'No valid product references were found for delivery verification.'
    );
  }

  const { data, error } = await input.db
    .from('products')
    .select(
      'id, title, is_active, net_weight_grams, package_length_cm, package_width_cm, package_height_cm'
    )
    .in('id', productIds);

  if (error || !data) {
    throw new Error(
      'Authoritative package details could not be loaded.'
    );
  }

  const productRows =
    data as unknown as ProductPackageRow[];

  const packages = buildAuthoritativePackages(
    input.cart,
    productRows
  );

  try {
    const response = await requestNimbusServiceability({
      deliveryPincode: input.deliveryPincode,
      paymentMode: input.paymentMode,
      packages,

      // Live NimbusPost currently requires Order Value
      // for both COD and prepaid requests.
      orderValuePaise: input.orderValuePaise,
    });

    const selectedCourier = selectLowestCostCourier(
      response.data?.available ?? []
    );

    if (!selectedCourier) {
      return {
        serviceable: false,
        packages,
        selectedCourier: null,
        customerPricing: null,
        actualCourierCost: null,
        totalChargeableGrams:
          response.data?.totalChargeableGrams ?? null,
      };
    }

    const customerPricing =
      calculateNimbusCustomerPricing(
        selectedCourier.result,
        input.paymentMode
      );

    return {
      serviceable: true,
      packages,
      selectedCourier,
      customerPricing,

      // NimbusPost totalPaise is stored as the
      // actual courier cost returned by NimbusPost.
      actualCourierCost:
        selectedCourier.result.totalPaise / 100,

      totalChargeableGrams:
        response.data?.totalChargeableGrams ?? null,
    };
  } catch (error) {
    if (error instanceof NimbusPostV2Error) {
      console.error(
        '[NIMBUSPOST_V2_SERVICEABILITY_ERROR]',
        {
          kind: error.kind,
          status: error.status,
          code: error.code,
          detail: error.detail,
          requestId: error.requestId,
          traceId: error.traceId,
        }
      );
    }

    throw error;
  }
}

export function customerServiceabilityError(
  error: unknown
): string {
  if (error instanceof NimbusCustomerPricingError) {
    return 'Live delivery pricing is temporarily unavailable. Please try again.';
  }

  if (error instanceof NimbusPostV2Error) {
    if (error.kind === 'rate_limit') {
      return 'Delivery verification is temporarily busy. Please try again shortly.';
    }

    if (error.kind === 'validation') {
      return 'Delivery details could not be verified for this PIN code.';
    }

    return 'Live delivery verification is temporarily unavailable. Please try again.';
  }

  return error instanceof Error
    ? error.message
    : 'Live delivery verification could not be completed.';
}