import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function authorizeTestEndpoint() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Not found.' },
      { status: 404 }
    );
  }

  const { user, role } = await getCurrentUser();
  if (!user || !role || !['admin', 'super_admin', 'staff'].includes(role)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin access required.' },
      { status: 403 }
    );
  }

  return null;
}

async function handleWhatsAppDispatch(customRecipient?: string) {
  const authResponse = await authorizeTestEndpoint();
  if (authResponse) return authResponse;

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
  const recipientNumber = (customRecipient || '').replace(/\D/g, '');

  if (!phoneId || !token) {
    return NextResponse.json(
      {
        success: false,
        error: 'WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN is missing.',
      },
      { status: 400 }
    );
  }

  if (!/^91\d{10}$/.test(recipientNumber)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Provide a valid Indian recipient with ?phone=91XXXXXXXXXX',
      },
      { status: 400 }
    );
  }

  const url = `https://graph.facebook.com/v26.0/${phoneId}/messages`;

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
        Authorization: `Bearer ${token}`,
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
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `WhatsApp test template delivered successfully to +${recipientNumber}`,
      metaResponse: data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to dispatch WhatsApp message via Meta API';
    console.error('[WhatsApp API Fetch Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone') || undefined;
  return handleWhatsAppDispatch(phone);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = body?.phone || undefined;
    return handleWhatsAppDispatch(phone);
  } catch {
    return handleWhatsAppDispatch();
  }
}
