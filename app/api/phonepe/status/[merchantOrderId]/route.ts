import { NextResponse } from 'next/server';

import { getPhonePeClient } from '@/lib/phonepe/client';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    merchantOrderId: string;
  }>;
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `phonepe-status:${clientIp}`,
      limit: 60,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many payment status requests. Please try again shortly.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const { merchantOrderId } = await context.params;
    const cleanMerchantOrderId = String(merchantOrderId || '').trim();

    if (!/^PP-\d{10,16}-[A-Z0-9]{12}$/.test(cleanMerchantOrderId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid merchant order ID.' },
        { status: 400 }
      );
    }

    const client = getPhonePeClient();
    const response = await client.getOrderStatus(cleanMerchantOrderId);

    return NextResponse.json({
      success: true,
      merchantOrderId: cleanMerchantOrderId,
      state: response?.state ?? null,
    });
  } catch (error: unknown) {
    console.error('[PHONEPE_STATUS_ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Unable to verify PhonePe payment status.',
      },
      { status: 500 }
    );
  }
}
