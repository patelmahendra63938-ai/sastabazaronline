export const PRODUCT_IMAGE_PLACEHOLDER = '/images/product-placeholder.svg';

const APPROVED_REMOTE_IMAGE_HOSTS = new Set([
  'ozzxrzyahbnavldyrlms.supabase.co',
]);

export function resolveStorefrontImageSrc(
  value: string | null | undefined,
  fallback = PRODUCT_IMAGE_PLACEHOLDER
): string {
  if (!value) return fallback;
  if (value.startsWith('/')) return value;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && APPROVED_REMOTE_IMAGE_HOSTS.has(url.hostname)
      ? value
      : fallback;
  } catch {
    return fallback;
  }
}
