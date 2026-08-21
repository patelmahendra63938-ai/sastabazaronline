import { expandCartPackages, type CartPackageInput, type NormalizedProductPackage } from '../catalog/product-package';

export interface ServiceabilityCartReference { id?: string; product_id?: string; quantity: number; }
export interface ProductPackageRow { id: string; title: string | null; is_active: boolean | null; net_weight_grams: unknown; package_length_cm: unknown; package_width_cm: unknown; package_height_cm: unknown; }

export function buildAuthoritativePackages(cart: ServiceabilityCartReference[], products: ProductPackageRow[]): NormalizedProductPackage[] {
  const packageInputs: CartPackageInput[] = cart.map((item) => {
    const productId = item.product_id || item.id;
    const product = products.find((row) => row.id === productId);
    if (!product || product.is_active !== true) throw new Error('A cart product is unavailable for delivery.');
    return { net_weight_grams: product.net_weight_grams, package_length_cm: product.package_length_cm, package_width_cm: product.package_width_cm, package_height_cm: product.package_height_cm, quantity: item.quantity };
  });
  return expandCartPackages(packageInputs);
}
