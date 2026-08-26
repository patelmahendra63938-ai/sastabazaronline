import { NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/api/admin-authorization';

export const dynamic = 'force-dynamic';

// Shared dispatcher function for both GET and POST requests
async function handleWhatsAppDispatch(customRecipient?: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
  
  const recipientNumber = (
    customRecipient || process.env.TEST_WHATSAPP_RECIPIENT || ''
  ).replace(/\D/g, '');

  if (!/^\d{8,15}$/.test(recipientNumber)) {
    return NextResponse.json(
      { success: false, error: 'A valid international phone number is required.' },
      { status: 400 }
    );
  }

  if (!phoneId || !token) {
    return NextResponse.json(
      {
        success: false,
        error: 'WhatsApp test messaging is not configured.',
      },
      { status: 400 }
    );
  }

  // Meta Cloud API Graph Endpoint (v19.0)
  const url = `https://graph.facebook.com/v26.0/${phoneId}/messages`;

  // Payload using Meta's pre-approved 'hello_world' template (guaranteed delivery in sandbox mode)
  const templatePayload = {
    messaging_product: 'whatsapp',
    to: recipientNumber,
    type: 'template',
    template: {
      name: 'hello_world',
      language: {
        code: 'en_US',
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templatePayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'WhatsApp rejected the test message.',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `WhatsApp test template delivered successfully to +${recipientNumber}`,
      messageId: data?.messages?.[0]?.id ?? null,
    });
  } catch (error: unknown) {
    console.error('[WhatsApp API Fetch Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to dispatch the WhatsApp test message.',
      },
      { status: 500 }
    );
  }
}

// Direct admin-only browser test handler.
export async function GET(request: Request) {
  const admin = await requireAdminApiSession();
  if (!admin.authorized) return admin.response;

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone') || undefined;
  return handleWhatsAppDispatch(phone);
}

// Programmatic admin-only test handler.
export async function POST(request: Request) {
  const admin = await requireAdminApiSession();
  if (!admin.authorized) return admin.response;

  try {
    const body = await request.json().catch(() => ({}));
    const phone = body?.phone || undefined;
    return handleWhatsAppDispatch(phone);
  } catch {
    return handleWhatsAppDispatch();
  }
}
