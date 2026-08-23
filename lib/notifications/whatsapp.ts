export interface WhatsAppOrderPayload {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  itemCount: number;
}

function formatIndianPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

export async function sendOrderConfirmationWhatsApp(payload: WhatsAppOrderPayload) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_ORDER_TEMPLATE_NAME || 'sastabazar_order_confirmation';
  const templateLanguage = process.env.WHATSAPP_ORDER_TEMPLATE_LANGUAGE || 'en_US';

  if (!token || !phoneNumberId) {
    return {
      success: false,
      reason: 'WHATSAPP_NOT_CONFIGURED',
      message: 'WhatsApp Cloud API credentials are not configured.',
    };
  }

  const recipientPhone = formatIndianPhoneNumber(payload.customerPhone);

  if (!/^91\d{10}$/.test(recipientPhone)) {
    return {
      success: false,
      reason: 'INVALID_CUSTOMER_PHONE',
      message: 'Customer WhatsApp number is invalid.',
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v26.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: templateLanguage,
            },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: payload.customerName },
                  { type: 'text', text: payload.orderNumber },
                  { type: 'text', text: String(payload.itemCount) },
                  { type: 'text', text: payload.grandTotal.toFixed(2) },
                ],
              },
            ],
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp Cloud API Error]:', data);
      return {
        success: false,
        error: data.error?.message || 'WhatsApp API request failed',
        metaError: data,
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      status: data.messages?.[0]?.message_status || 'accepted',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'WhatsApp network request failed';
    console.error('[WhatsApp Network Error]:', error);
    return { success: false, error: message };
  }
}
