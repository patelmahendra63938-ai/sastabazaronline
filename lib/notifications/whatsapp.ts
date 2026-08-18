export interface WhatsAppOrderPayload {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  itemCount: number;
}

// Format 10-digit Indian phone number to E.164 (91XXXXXXXXXX)
function formatIndianPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

export async function sendOrderConfirmationWhatsApp(payload: WhatsAppOrderPayload) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const isEnabled = process.env.WHATSAPP_ENABLED === 'true';

  if (!isEnabled || !token || !phoneNumberId) {
    return {
      success: false,
      reason: 'WHATSAPP_NOT_CONFIGURED',
      message: 'WhatsApp Cloud API credentials not configured in .env.local',
    };
  }

  const recipientPhone = formatIndianPhoneNumber(payload.customerPhone);

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
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
          type: 'text',
          text: {
            preview_url: true,
            body: `🎉 *Order Confirmed! - SastaBazar Online*\n\nHi ${payload.customerName},\nThank you for your order *#${payload.orderNumber}* containing *${payload.itemCount} item(s)* for a total of *₹${payload.grandTotal}*.\n\n📦 *Live Order Tracking:* https://sastabazaronline.in/orders/${payload.orderNumber}\n\nOur team in Surat is packing your order. For any queries, reply to this message or email sales@sastabazaronline.in.`,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp Cloud API Error]:', data);
      return { success: false, error: data.error?.message || 'API request failed' };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error: any) {
    console.error('[WhatsApp Network Error]:', error);
    return { success: false, error: error.message };
  }
}