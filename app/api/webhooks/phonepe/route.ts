import { NextResponse } from 'next/server';

import { getPhonePeClient } from '@/lib/phonepe/client';
import { finalizePhonePePayment } from '@/lib/phonepe/finalize-payment';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const username =
      process.env.PHONEPE_WEBHOOK_USERNAME;

    const password =
      process.env.PHONEPE_WEBHOOK_PASSWORD;

    if (!username || !password) {
      console.error(
        '[PHONEPE_WEBHOOK_CONFIG_ERROR] Missing webhook credentials.'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Webhook configuration is unavailable.',
        },
        { status: 500 }
      );
    }

    const authorizationHeader =
      request.headers.get('authorization') || '';

    /*
     * PhonePe callback validation requires the raw
     * request body string. Do not call request.json()
     * before validateCallback().
     */
    const rawBody =
      await request.text();

    if (!authorizationHeader || !rawBody) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid PhonePe callback request.',
        },
        { status: 400 }
      );
    }

    const client =
      getPhonePeClient();

    let callbackResponse;

    try {
      callbackResponse =
        client.validateCallback(
          username,
          password,
          authorizationHeader,
          rawBody
        );
    } catch (validationError) {
      console.error(
        '[PHONEPE_WEBHOOK_VALIDATION_FAILED]',
        validationError
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid PhonePe callback.',
        },
        { status: 401 }
      );
    }

    const payload =
      callbackResponse?.payload as
        | {
            orderId?: string;
            state?: string;
          }
        | undefined;

    const merchantOrderId =
      String(
        payload?.orderId || ''
      ).trim();

    const phonePeState =
      String(
        payload?.state || ''
      )
        .trim()
        .toUpperCase();

    if (!merchantOrderId) {
      console.error(
        '[PHONEPE_WEBHOOK_MISSING_ORDER_ID]',
        callbackResponse
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'PhonePe callback is missing merchant order ID.',
        },
        { status: 400 }
      );
    }

    /*
     * Persist/finalize only through the shared
     * idempotent finalizer.
     *
     * The callback has already been cryptographically
     * validated by the SDK, so we can pass the state
     * as confirmed webhook state.
     */
    const result =
      await finalizePhonePePayment({
        merchantOrderId,
        skipPhonePeStatusCheck: true,
        confirmedPhonePeState:
          phonePeState,
      });

    /*
     * For non-COMPLETED states we still return 200
     * after successful callback validation so PhonePe
     * does not needlessly retry a legitimate event.
     */
    if (
      result.success === true &&
      result.paymentComplete === false
    ) {
      return NextResponse.json({
        success: true,
        acknowledged: true,
        merchantOrderId,
        state:
          phonePeState || 'UNKNOWN',
      });
    }

    if (!result.success) {
      console.error(
        '[PHONEPE_WEBHOOK_FINALIZE_FAILED]',
        {
          merchantOrderId,
          phonePeState,
          result,
        }
      );

      /*
       * Return 500 for a valid COMPLETED callback that
       * could not be finalized, allowing delivery retry.
       */
      return NextResponse.json(
        {
          success: false,
          error:
            result.error ||
            'PhonePe payment finalization failed.',
        },
        {
          status:
            result.statusCode &&
            result.statusCode >= 500
              ? result.statusCode
              : 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      acknowledged: true,
      paymentComplete:
        Boolean(
          result.paymentComplete
        ),
      merchantOrderId,
      orderNumber:
        result.orderNumber || null,
      alreadyFinalized:
        Boolean(
          result.alreadyFinalized
        ),
    });
  } catch (error: unknown) {
    console.error(
      '[PHONEPE_WEBHOOK_ERROR]',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to process PhonePe callback.',
      },
      { status: 500 }
    );
  }
}