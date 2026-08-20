export interface ProductPackageInput {
  net_weight_grams: unknown;
  package_length_cm: unknown;
  package_width_cm: unknown;
  package_height_cm: unknown;
}

export interface NormalizedProductPackage {
  weight: number;
  length: number;
  width: number;
  height: number;
}

export interface CartPackageInput extends ProductPackageInput {
  quantity: unknown;
}

export class ProductPackageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductPackageValidationError';
  }
}

function parsePositiveGrams(value: unknown): number {
  if (typeof value === 'string' && !value.trim()) {
    throw new ProductPackageValidationError('Exact physical weight is required.');
  }

  const grams = Number(value);
  if (!Number.isInteger(grams) || grams <= 0) {
    throw new ProductPackageValidationError(
      'Exact physical weight must be a positive whole number of grams.'
    );
  }
  return grams;
}

function parsePositiveCentimetres(value: unknown, label: string): number {
  if (typeof value === 'string' && !value.trim()) {
    throw new ProductPackageValidationError(`${label} is required.`);
  }

  const centimetres = Number(value);
  if (!Number.isFinite(centimetres) || centimetres <= 0) {
    throw new ProductPackageValidationError(`${label} must be a positive number.`);
  }

  // numeric(8,2) stores at most two decimal places. Reject extra precision
  // instead of allowing PostgreSQL to round a physical measurement silently.
  const scaledCentimetres = centimetres * 100;
  if (Math.abs(scaledCentimetres - Math.round(scaledCentimetres)) > 1e-8) {
    throw new ProductPackageValidationError(
      `${label} must have no more than two decimal places.`
    );
  }

  if (centimetres > 999999.99) {
    throw new ProductPackageValidationError(`${label} exceeds the supported range.`);
  }

  return centimetres;
}

export function normalizeProductPackage(
  input: ProductPackageInput
): NormalizedProductPackage {
  return {
    weight: parsePositiveGrams(input.net_weight_grams),
    length: parsePositiveCentimetres(input.package_length_cm, 'Package length'),
    width: parsePositiveCentimetres(input.package_width_cm, 'Package width'),
    height: parsePositiveCentimetres(input.package_height_cm, 'Package height'),
  };
}

export function expandCartPackages(
  items: CartPackageInput[]
): NormalizedProductPackage[] {
  return items.flatMap((item) => {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ProductPackageValidationError(
        'Package quantity must be a positive whole number.'
      );
    }

    const productPackage = normalizeProductPackage(item);
    return Array.from({ length: quantity }, () => ({ ...productPackage }));
  });
}
