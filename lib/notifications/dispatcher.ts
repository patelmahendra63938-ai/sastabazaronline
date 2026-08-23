import { sendOrderConfirmationEmail, EmailOrderPayload } from './email';
import { sendOrderConfirmationWhatsApp } from './whatsapp';

export interface NotificationPayload extends EmailOrderPayload {
  // Inherits all order fields
}

export async function dispatchOrderNotifications(payload: NotificationPayload) {
  const itemCount = Math.max(
    1,
    (payload.items || []).reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    )
  );

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

  const result = {
    email:
      emailResult.status === 'fulfilled'
        ? emailResult.value
        : { success: false, error: String(emailResult.reason) },
    whatsapp:
      whatsappResult.status === 'fulfilled'
        ? whatsappResult.value
        : { success: false, error: String(whatsappResult.reason) },
  };

  console.info('[ORDER_NOTIFICATION_RESULT]', {
    orderNumber: payload.orderNumber,
    customerPhone: payload.customerPhone,
    customerEmail: payload.customerEmail,
    email: result.email,
    whatsapp: result.whatsapp,
  });

  return result;
}
