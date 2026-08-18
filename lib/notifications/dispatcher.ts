import { sendOrderConfirmationEmail, EmailOrderPayload } from './email';
import { sendOrderConfirmationWhatsApp } from './whatsapp';

export interface NotificationPayload extends EmailOrderPayload {
  // Inherits all order fields
}

export async function dispatchOrderNotifications(payload: NotificationPayload) {
  // Fire both notifications in parallel
  const [emailResult, whatsappResult] = await Promise.allSettled([
    sendOrderConfirmationEmail(payload),
    sendOrderConfirmationWhatsApp({
      orderNumber: payload.orderNumber,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      grandTotal: payload.grandTotal,
      itemCount: payload.items?.length || 1,
    }),
  ]);

  return {
    email: emailResult.status === 'fulfilled' ? emailResult.value : { success: false, error: emailResult.reason },
    whatsapp: whatsappResult.status === 'fulfilled' ? whatsappResult.value : { success: false, error: whatsappResult.reason },
  };
}