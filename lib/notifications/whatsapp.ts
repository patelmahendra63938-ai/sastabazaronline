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

function sanitizeTemplateText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getPublicSiteUrl(): string {
  const configuredUrl = String(
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    ''
  ).trim();

  if (configuredUrl) {
    try {
      const parsed = new URL(configuredUrl);
      const hostname = parsed.hostname.toLowerCase();
      const isLocalHost =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1';

      if (!isLocalHost && (parsed.protocol === 'https:' || parsed.protocol === 'http:')) {
        return parsed.origin.replace(/\/$/, '');
      }
    } catch {
      console.warn('[WHATSAPP_TRACKING_URL] Ignoring invalid configured site URL.');
    }
  }

  return 'https://www.adhyeybrothers.in';
}

async function sendTemplateMessage(args: {
  token: string;
  phoneNumberId: string;
  recipientPhone: string;
  templateName: string;
  templateLanguage: string;
  payload: WhatsAppOrderPayload;
}) {
  const orderTrackingUrl = `${getPublicSiteUrl()}/orders`;
  const customerName = sanitizeTemplateText(args.payload.customerName);
  const orderNumber = sanitizeTemplateText(args.payload.orderNumber);
  const grandTotal = sanitizeTemplateText(args.payload.grandTotal.toFixed(2));
  const trackingUrl = sanitizeTemplateText(orderTrackingUrl);

  const response = await fetch(
    `https://graph.facebook.com/v26.0/${args.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: args.recipientPhone,
        type: 'template',
        template: {
          name: args.templateName,
          language: { code: args.templateLanguage },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: orderNumber },
                { type: 'text', text: grandTotal },
                { type: 'text', text: trackingUrl },
              ],
            },
          ],
        },
      }),
    }
  );

  const data = await response.json();
  return { response, data };
}

export async function sendOrderConfirmationWhatsApp(payload: WhatsAppOrderPayload) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName =
    process.env.WHATSAPP_ORDER_TEMPLATE_NAME ||
    process.env.WHATSAPP_TEMPLATE_NAME ||
    'order_confirmation';
  const configuredLanguage =
    process.env.WHATSAPP_ORDER_TEMPLATE_LANGUAGE ||
    process.env.WHATSAPP_TEMPLATE_LANGUAGE ||
    'en';

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
    const languages = Array.from(new Set([configuredLanguage, 'en', 'en_US']));
    let lastData: any = null;

    for (const templateLanguage of languages) {
      const { response, data } = await sendTemplateMessage({
        token,
        phoneNumberId,
        recipientPhone,
        templateName,
        templateLanguage,
        payload,
      });

      if (response.ok) {
        return {
          success: true,
          messageId: data.messages?.[0]?.id,
          status: data.messages?.[0]?.message_status || 'accepted',
          templateLanguage,
        };
      }

      lastData = data;
      const code = data?.error?.code;
      const details = String(data?.error?.error_data?.details || '');
      const isTemplateLanguageMismatch =
        code === 132001 || details.toLowerCase().includes('does not exist in');

      if (!isTemplateLanguageMismatch) break;
    }

    console.error('[WhatsApp Cloud API Error]:', lastData);
    return {
      success: false,
      error: lastData?.error?.message || 'WhatsApp API request failed',
      metaError: lastData,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'WhatsApp network request failed';
    console.error('[WhatsApp Network Error]:', error);
    return { success: false, error: message };
  }
}
