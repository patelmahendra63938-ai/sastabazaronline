import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Shared dispatcher function for both GET and POST requests
async function handleWhatsAppDispatch(customRecipient?: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  
  // Default to your verified sandbox recipient number
  const recipientNumber = (customRecipient || '919723268666').replace(/\D/g, '');

  if (!phoneId || !token) {
    return NextResponse.json(
      {
        success: false,
        error: 'WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_API_TOKEN is missing in .env.local',
      },
      { status: 400 }
    );
  }

  // Meta Cloud API Graph Endpoint (v19.0)
  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

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
          metaError: data,
          hint: 'Ensure your recipient number is added & verified in Meta Developer Portal -> WhatsApp -> API Setup -> To field.',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `WhatsApp test template delivered successfully to +${recipientNumber}`,
      metaResponse: data,
    });
  } catch (error: any) {
    console.error('[WhatsApp API Fetch Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to dispatch WhatsApp message via Meta API',
      },
      { status: 500 }
    );
  }
}

// 1. Direct Browser Access Handler (GET /api/test-whatsapp?phone=919723268666)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone') || undefined;
  return handleWhatsAppDispatch(phone);
}

// 2. Programmatic API Handler (POST /api/test-whatsapp)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = body?.phone || undefined;
    return handleWhatsAppDispatch(phone);
  } catch {
    return handleWhatsAppDispatch();
  }
}