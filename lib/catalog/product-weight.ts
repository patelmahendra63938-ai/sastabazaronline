/**
 * Product physical weight helpers.
 *
 * Admin-entered product weight is stored in grams as an integer.
 * Example: 150g => 150, 151g => 151, 225g => 225.
 * There are no courier weight slabs in this layer.
 */

export function gramsToKg(grams: number): number {
  const value = Number(grams);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Product weight must be greater than 0 grams.');
  }

  return value / 1000;
}

export function kgToGrams(kg: number): number {
  const value = Number(kg);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Product weight must be greater than 0 kg.');
  }

  return Math.round(value * 1000);
}

export function calculateCartPhysicalWeightKg(
  items: Array<{ weightGrams: number; quantity: number }>
): number {
  const totalGrams = items.reduce((total, item) => {
    const grams = Number(item.weightGrams);
    const quantity = Number(item.quantity);

    if (!Number.isFinite(grams) || grams <= 0) {
      throw new Error('Every product must have a valid physical weight.');
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Cart quantity must be greater than 0.');
    }

    return total + grams * quantity;
  }, 0);

  return totalGrams / 1000;
}
