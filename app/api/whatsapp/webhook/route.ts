import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    mode === 'subscribe' &&
    token &&
    verifyToken &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  return NextResponse.json(
    { success: false, error: 'Webhook verification failed' },
    { status: 403 }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log('[WhatsApp Webhook]', JSON.stringify(body));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp Webhook Error]', error);

    return NextResponse.json(
      { success: false },
      { status: 400 }
    );
  }
}
