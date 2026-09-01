import { NextResponse } from 'next/server';

import {
  finalizePhonePePayment,
} from '@/lib/phonepe/finalize-payment';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

interface FinalizeBody {
  merchantOrderId?: string;
}

export async function POST(
  request: Request
) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `phonepe-finalize:${clientIp}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many payment verification requests. Please try again shortly.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const body =
      (await request.json()) as FinalizeBody;

    const merchantOrderId =
      String(
        body.merchantOrderId || ''
      ).trim();

    if (!/^PP-\d{10,16}-[A-Z0-9]{12}$/.test(merchantOrderId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid merchant order ID.',
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await finalizePhonePePayment({
        merchantOrderId,
      });

    const {
      statusCode,
      ...responseBody
    } = result;

    return NextResponse.json(
      responseBody,
      {
        status:
          statusCode || 200,
      }
    );
  } catch (error: unknown) {
    console.error(
      '[PHONEPE_FINALIZE_ROUTE_ERROR]',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Unable to finalize PhonePe payment.',
      },
      {
        status: 500,
      }
    );
  }
}
