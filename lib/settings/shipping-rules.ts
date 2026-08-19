export type CodFeeType = 'tiered' | 'flat';

export interface ShippingRules {
  free_shipping_enabled: boolean;
  free_shipping_threshold: number;
  apply_courier_charge: boolean;
  courier_markup_pct: number;
  weight_buffer_pct: number;
  cod_fee_type: CodFeeType;
  cod_fee_flat: number;
  cod_fee_threshold: number;
  cod_fee_above_threshold: number;
}

export interface ShippingActionState {
  status: 'idle' | 'success' | 'error';
  message: string;
}

export const DEFAULT_SHIPPING_RULES: ShippingRules = {
  free_shipping_enabled: false,
  free_shipping_threshold: 499,
  apply_courier_charge: true,
  courier_markup_pct: 30,
  weight_buffer_pct: 0,
  cod_fee_type: 'tiered',
  cod_fee_flat: 40,
  cod_fee_threshold: 1000,
  cod_fee_above_threshold: 50,
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function parseShippingRules(value: unknown): ShippingRules {
  const rules = asRecord(value);
  const legacyMarkup = finiteNumber(rules.cost_buffer_pct, DEFAULT_SHIPPING_RULES.courier_markup_pct);

  return {
    free_shipping_enabled: booleanValue(
      rules.free_shipping_enabled,
      DEFAULT_SHIPPING_RULES.free_shipping_enabled
    ),
    free_shipping_threshold: finiteNumber(
      rules.free_shipping_threshold,
      DEFAULT_SHIPPING_RULES.free_shipping_threshold
    ),
    apply_courier_charge: booleanValue(
      rules.apply_courier_charge,
      DEFAULT_SHIPPING_RULES.apply_courier_charge
    ),
    courier_markup_pct: finiteNumber(rules.courier_markup_pct, legacyMarkup),
    weight_buffer_pct: finiteNumber(
      rules.weight_buffer_pct,
      DEFAULT_SHIPPING_RULES.weight_buffer_pct
    ),
    cod_fee_type: rules.cod_fee_type === 'flat' ? 'flat' : 'tiered',
    cod_fee_flat: finiteNumber(
      rules.cod_fee_flat ?? rules.cod_charge,
      DEFAULT_SHIPPING_RULES.cod_fee_flat
    ),
    cod_fee_threshold: finiteNumber(
      rules.cod_fee_threshold,
      DEFAULT_SHIPPING_RULES.cod_fee_threshold
    ),
    cod_fee_above_threshold: finiteNumber(
      rules.cod_fee_above_threshold,
      DEFAULT_SHIPPING_RULES.cod_fee_above_threshold
    ),
  };
}

export function validateShippingRules(rules: ShippingRules): string[] {
  const errors: string[] = [];
  const nonNegativeFields: Array<[string, number]> = [
    ['Free shipping threshold', rules.free_shipping_threshold],
    ['Courier markup', rules.courier_markup_pct],
    ['Weight buffer', rules.weight_buffer_pct],
    ['COD flat fee', rules.cod_fee_flat],
    ['COD threshold', rules.cod_fee_threshold],
    ['COD fee above threshold', rules.cod_fee_above_threshold],
  ];

  for (const [label, value] of nonNegativeFields) {
    if (!Number.isFinite(value) || value < 0) {
      errors.push(`${label} must be zero or greater.`);
    }
  }

  if (rules.courier_markup_pct > 500 || rules.weight_buffer_pct > 500) {
    errors.push('Percentage values cannot exceed 500%.');
  }

  return errors;
}
