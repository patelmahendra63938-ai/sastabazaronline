import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { getPhonePeClient } from '@/lib/phonepe/client';
import { createVerifiedOrderAction } from '@/actions/checkout';

export const runtime = 'nodejs';

interface FinalizeBody {
  merchantOrderId: string;
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as FinalizeBody;

    const merchantOrderId =
      String(body.merchantOrderId || '').trim();

    if (!merchantOrderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Merchant order ID is required.',
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Secure payment verification is unavailable.',
        },
        { status: 500 }
      );
    }

    const db = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const {
      data: session,
      error: sessionError,
    } = await db
      .from('phonepe_payment_sessions')
      .select(
        `
        merchant_order_id,
        status,
        customer_payload,
        cart_payload,
        expected_amount,
        local_order_number,
        phonepe_state,
        updated_at
        `
      )
      .eq(
        'merchant_order_id',
        merchantOrderId
      )
      .maybeSingle();

    if (sessionError) {
      console.error(
        '[PHONEPE_SESSION_READ_ERROR]',
        sessionError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to read payment session.',
        },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Payment session was not found.',
        },
        { status: 404 }
      );
    }

    /*
     * Idempotent fast-path:
     * if this payment was already converted into
     * an order, return the existing order.
     */
    if (
      session.status === 'COMPLETED' &&
      session.local_order_number
    ) {
      return NextResponse.json({
        success: true,
        paymentComplete: true,
        alreadyFinalized: true,
        merchantOrderId,
        orderNumber:
          session.local_order_number,
      });
    }

    const client =
      getPhonePeClient();

    const phonePeStatus =
      await client.getOrderStatus(
        merchantOrderId
      );

    const phonePeState =
      String(
        phonePeStatus?.state || ''
      ).toUpperCase();

    /*
     * Always persist the latest PhonePe state.
     */
    await db
      .from('phonepe_payment_sessions')
      .update({
        phonepe_state:
          phonePeState || 'UNKNOWN',
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'merchant_order_id',
        merchantOrderId
      );

    /*
     * Only COMPLETED is treated as successful payment.
     */
    if (phonePeState !== 'COMPLETED') {
      return NextResponse.json({
        success: true,
        paymentComplete: false,
        merchantOrderId,
        state:
          phonePeState || 'UNKNOWN',
      });
    }

    /*
     * Optional amount verification when the SDK
     * returns amount in the status response.
     */
    const statusAmountPaise =
      Number(
        (
          phonePeStatus as {
            amount?: number;
          }
        ).amount
      );

    const expectedAmountPaise =
      Math.round(
        Number(
          session.expected_amount
        ) * 100
      );

    if (
      Number.isFinite(
        statusAmountPaise
      ) &&
      statusAmountPaise > 0 &&
      statusAmountPaise !==
        expectedAmountPaise
    ) {
      console.error(
        '[PHONEPE_AMOUNT_MISMATCH]',
        {
          merchantOrderId,
          expectedAmountPaise,
          statusAmountPaise,
        }
      );

      await db
        .from(
          'phonepe_payment_sessions'
        )
        .update({
          status:
            'AMOUNT_MISMATCH',
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'merchant_order_id',
          merchantOrderId
        );

      return NextResponse.json(
        {
          success: false,
          error:
            'Payment amount verification failed.',
        },
        { status: 409 }
      );
    }

    /*
     * Atomic-ish claim:
     * only one request should transition the
     * session into FINALIZING.
     */
    const {
      data: claimedSession,
      error: claimError,
    } = await db
      .from(
        'phonepe_payment_sessions'
      )
      .update({
        status: 'FINALIZING',
        phonepe_state:
          'COMPLETED',
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'merchant_order_id',
        merchantOrderId
      )
      .is(
        'local_order_number',
        null
      )
      .in(
        'status',
        [
          'PENDING',
          'PAYMENT_CREATED',
          'FINALIZE_FAILED',
        ]
      )
      .select(
        `
        customer_payload,
        cart_payload
        `
      )
      .maybeSingle();

    if (claimError) {
      console.error(
        '[PHONEPE_FINALIZE_CLAIM_ERROR]',
        claimError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to finalize payment safely.',
        },
        { status: 500 }
      );
    }

    /*
     * Another request may already be finalizing.
     */
    if (!claimedSession) {
      const {
        data: latestSession,
      } = await db
        .from(
          'phonepe_payment_sessions'
        )
        .select(
          'status, local_order_number'
        )
        .eq(
          'merchant_order_id',
          merchantOrderId
        )
        .maybeSingle();

      if (
        latestSession?.status ===
          'COMPLETED' &&
        latestSession
          .local_order_number
      ) {
        return NextResponse.json({
          success: true,
          paymentComplete: true,
          alreadyFinalized: true,
          merchantOrderId,
          orderNumber:
            latestSession
              .local_order_number,
        });
      }

      return NextResponse.json({
        success: true,
        paymentComplete: true,
        finalizing: true,
        merchantOrderId,
        state: 'COMPLETED',
      });
    }

    const customerPayload =
      claimedSession.customer_payload as Record<
        string,
        unknown
      >;

    const cartPayload =
      claimedSession.cart_payload as unknown[];

    const orderResult =
      await createVerifiedOrderAction({
        ...(customerPayload as any),
        paymentMethod: 'ONLINE',
        payment_method: 'ONLINE',
        cart:
          cartPayload as any[],
      });

    if (
      !orderResult.success ||
      !orderResult.orderNumber
    ) {
      console.error(
        '[PHONEPE_LOCAL_ORDER_CREATE_FAILED]',
        orderResult
      );

      await db
        .from(
          'phonepe_payment_sessions'
        )
        .update({
          status:
            'FINALIZE_FAILED',
          phonepe_state:
            'COMPLETED',
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'merchant_order_id',
          merchantOrderId
        );

      return NextResponse.json(
        {
          success: false,
          paymentComplete: true,
          error:
            orderResult.error ||
            'Payment succeeded, but the order could not be finalized.',
        },
        { status: 500 }
      );
    }

    const {
      error: completeError,
    } = await db
      .from(
        'phonepe_payment_sessions'
      )
      .update({
        status: 'COMPLETED',
        phonepe_state:
          'COMPLETED',
        local_order_number:
          orderResult.orderNumber,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'merchant_order_id',
        merchantOrderId
      );

    if (completeError) {
      console.error(
        '[PHONEPE_SESSION_COMPLETE_ERROR]',
        completeError
      );

      return NextResponse.json(
        {
          success: false,
          paymentComplete: true,
          error:
            'Order was created but payment session could not be closed safely.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentComplete: true,
      merchantOrderId,
      orderNumber:
        orderResult.orderNumber,
    });
  } catch (error: unknown) {
    console.error(
      '[PHONEPE_FINALIZE_ERROR]',
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
      { status: 500 }
    );
  }
}