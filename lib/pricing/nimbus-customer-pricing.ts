export type LivePricingPaymentMode = 'cod' | 'prepaid';

export interface NimbusCustomerRateInput {
  totalPaise: unknown;
  codChargesPaise?: unknown;
}

export interface NimbusCustomerPricing {
  nimbusTotalPaise: number;
  nimbusCodPaise: number;
  nonCodCourierPaise: number;
  customerDeliveryPaise: number;
  customerCodPaise: number;
}

export class NimbusCustomerPricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NimbusCustomerPricingError';
  }
}

export function calculateNimbusCustomerPricing(
  rate: NimbusCustomerRateInput,
  paymentMode: LivePricingPaymentMode
): NimbusCustomerPricing {
  const totalPaise = Number(rate.totalPaise);
  if (!Number.isInteger(totalPaise) || totalPaise <= 0) {
    throw new NimbusCustomerPricingError('NimbusPost total pricing is invalid.');
  }

  if (paymentMode === 'prepaid') {
    return {
      nimbusTotalPaise: totalPaise,
      nimbusCodPaise: 0,
      nonCodCourierPaise: totalPaise,
      customerDeliveryPaise: Math.ceil((totalPaise * 130) / 100),
      customerCodPaise: 0,
    };
  }

  const codPaise = Number(rate.codChargesPaise ?? 0);
  if (!Number.isInteger(codPaise) || codPaise < 0 || codPaise > totalPaise) {
    throw new NimbusCustomerPricingError('NimbusPost COD pricing is invalid.');
  }

  const nonCodCourierPaise = totalPaise - codPaise;
  return {
    nimbusTotalPaise: totalPaise,
    nimbusCodPaise: codPaise,
    nonCodCourierPaise,
    customerDeliveryPaise: Math.ceil((nonCodCourierPaise * 130) / 100),
    customerCodPaise: codPaise,
  };
}
