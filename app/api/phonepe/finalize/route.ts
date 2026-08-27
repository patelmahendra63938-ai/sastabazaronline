import { NextResponse } from 'next/server';

import {
  finalizePhonePePayment,
} from '@/lib/phonepe/finalize-payment';

export const runtime = 'nodejs';

interface FinalizeBody {
  merchantOrderId?: string;
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as FinalizeBody;

    const merchantOrderId =
      String(
        body.merchantOrderId || ''
      ).trim();

    if (!merchantOrderId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Merchant order ID is required.',
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
        error:
          error instanceof Error
            ? error.message
            : 'Unable to finalize PhonePe payment.',
      },
      {
        status: 500,
      }
    );
  }
}