import { NextResponse } from 'next/server';

import { getPhonePeClient } from '@/lib/phonepe/client';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    merchantOrderId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { merchantOrderId } = await context.params;

    const cleanMerchantOrderId =
      String(merchantOrderId || '').trim();

    if (!cleanMerchantOrderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Merchant order ID is required.',
        },
        { status: 400 }
      );
    }

    const client = getPhonePeClient();

    const response =
      await client.getOrderStatus(
        cleanMerchantOrderId
      );

    return NextResponse.json({
      success: true,
      merchantOrderId: cleanMerchantOrderId,
      state: response?.state ?? null,
      response,
    });
  } catch (error: unknown) {
    console.error(
      '[PHONEPE_STATUS_ERROR]',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to verify PhonePe payment status.',
      },
      { status: 500 }
    );
  }
}