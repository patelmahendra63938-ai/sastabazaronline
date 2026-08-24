export function normalizeAdminOrderStatus(status: unknown): string {
  const normalized = String(status ?? '').trim().toUpperCase();
  return normalized === 'CANCELED' ? 'CANCELLED' : normalized;
}

export function isCancelledOrderStatus(status: unknown): boolean {
  return normalizeAdminOrderStatus(status) === 'CANCELLED';
}
