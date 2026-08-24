import { XCircle } from 'lucide-react';
import { isCancelledOrderStatus, normalizeAdminOrderStatus } from '@/lib/orders/admin-order-status';

export default function OrderStatusBadge({ status }: { status: unknown }) {
  const normalized = normalizeAdminOrderStatus(status) || 'CONFIRMED';
  const cancelled = isCancelledOrderStatus(normalized);

  return (
    <span
      aria-label={cancelled ? 'Order cancelled' : `Order status: ${normalized}`}
      className={cancelled
        ? 'inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-700'
        : 'inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black text-gray-700'}
    >
      {cancelled && <XCircle aria-hidden="true" size={12} />}
      {normalized}
    </span>
  );
}
