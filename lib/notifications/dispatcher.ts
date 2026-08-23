import { sendOrderConfirmationEmail, EmailOrderPayload } from './email';
import { sendOrderConfirmationWhatsApp } from './whatsapp';

export interface NotificationPayload extends EmailOrderPayload {
  // Inherits all order fields
}

export async function dispatchOrderNotifications(payload: NotificationPayload) {
  // Count actual units ordered, not just the number of different line items.
  const itemCount = Math.max(
    1,
    (payload.items || []).reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    )
  );

  // Fire both notifications in parallel. Notification failures must not block
  // an otherwise successful checkout.
  const [emailResult, whatsappResult] = await Promise.allSettled([
    sendOrderConfirmationEmail(payload),
    sendOrderConfirmationWhatsApp({
      orderNumber: payload.orderNumber,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      grandTotal: payload.grandTotal,
      itemCount,
    }),
  ]);

  return {
    email:
      emailResult.status === 'fulfilled'
        ? emailResult.value
        : { success: false, error: emailResult.reason },
    whatsapp:
      whatsappResult.status === 'fulfilled'
        ? whatsappResult.value
        : { success: false, error: whatsappResult.reason },
  };
}
