import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

import {
  StandardCheckoutPayRequest,
} from '@phonepe-pg/pg-sdk-node';

import { getPhonePeClient } from '@/lib/phonepe/client';
import { calculateAuthoritativeOrderPricing } from '@/lib/pricing/pricing-engine';
import { CHECKOUT_GST_COOKIE, parseCheckoutGstCookie } from '@/lib/gst/checkout-gst';

export const runtime = 'nodejs';

interface PhonePeCartItem {
  id?: string;
  product_id?: string;
  size?: string;
  quantity: number;
  selected_campaign_id?: string;
}

interface CreatePhonePePaymentBody {
  fullName?: string;
  customer_name?: string;
  email?: string;
  customer_email?: string;
  phone?: string;
  customer_phone?: string;
  address: string;
  city: string;
  state?: string;
  pincode: string;
  cart: PhonePeCartItem[];
  coupon_code?: string;
}

function createMerchantOrderId() {
  const timestamp = Date.now();
  const randomPart = randomUUID()
    .replace(/-/g, '')
    .slice(0, 12)
    .toUpperCase();

  return `PP-${timestamp}-${randomPart}`;
}

export async function POST(request: Request) {
  let merchantOrderId: string | null = null;

  try {
    const body = (await request.json()) as CreatePhonePePaymentBody;
    const cookieStore = await cookies();
    const checkoutGst = parseCheckoutGstCookie(
      cookieStore.get(CHECKOUT_GST_COOKIE)?.value
    );

    const customerName = String(body.customer_name || body.fullName || '').trim();
    const customerEmail = String(body.customer_email || body.email || '').trim();
    const customerPhone = String(body.customer_phone || body.phone || '')
      .replace(/\D/g, '')
      .slice(-10);
    const address = String(body.address || '').trim();
    const city = String(body.city || '').trim();
    const state = String(body.state || '').trim();
    const pincode = String(body.pincode || '').trim();

    if (!customerName) {
      return NextResponse.json({ success: false, error: 'Customer name is required.' }, { status: 400 });
    }

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ success: false, error: 'A valid customer email address is required.' }, { status: 400 });
    }

    if (!/^\d{10}$/.test(customerPhone)) {
      return NextResponse.json({ success: false, error: 'A valid 10-digit mobile number is required.' }, { status: 400 });
    }

    if (!address || !city || !state) {
      return NextResponse.json({ success: false, error: 'Complete delivery address, city and state are required.' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid 6-digit delivery PIN code.' }, { status: 400 });
    }

    if (!Array.isArray(body.cart) || body.cart.length === 0) {
      return NextResponse.json({ success: false, error: 'Your cart is empty.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[PHONEPE_CONFIG_ERROR] Supabase server configuration is missing.');
      return NextResponse.json({ success: false, error: 'Secure payment service is temporarily unavailable.' }, { status: 500 });
    }

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const pricing = await calculateAuthoritativeOrderPricing({
      db,
      pincode,
      paymentMethod: 'ONLINE',
      cart: body.cart,
      couponCode: body.coupon_code,
    });

    if (!pricing.serviceable || !Number.isFinite(pricing.totalPayable) || pricing.totalPayable <= 0) {
      return NextResponse.json({ success: false, error: 'A valid payable amount could not be calculated.' }, { status: 400 });
    }

    const expectedAmount = Math.round(pricing.totalPayable * 100) / 100;
    const amountPaise = Math.round(expectedAmount * 100);
    merchantOrderId = createMerchantOrderId();

    const customerPayload = {
      customer_name: customerName,
      fullName: customerName,
      customer_email: customerEmail,
      email: customerEmail,
      customer_phone: customerPhone,
      phone: customerPhone,
      address,
      city,
      state,
      pincode,
      paymentMethod: 'ONLINE',
      payment_method: 'ONLINE',
      coupon_code: body.coupon_code || undefined,
      gst_invoice: checkoutGst || undefined,
    };

    const cartPayload = body.cart.map((item) => ({
      id: item.id,
      product_id: item.product_id || item.id,
      size: item.size || 'Free Size',
      quantity: Number(item.quantity),
      selected_campaign_id: item.selected_campaign_id,
    }));

    const { error: sessionInsertError } = await db
      .from('phonepe_payment_sessions')
      .insert({
        merchant_order_id: merchantOrderId,
        status: 'PENDING',
        customer_payload: customerPayload,
        cart_payload: cartPayload,
        expected_amount: expectedAmount,
        phonepe_state: 'PAYMENT_CREATED',
      });

    if (sessionInsertError) {
      console.error('[PHONEPE_SESSION_CREATE_ERROR]', sessionInsertError);
      return NextResponse.json({ success: false, error: 'Unable to initialize secure payment session.' }, { status: 500 });
    }

    const client = getPhonePeClient();
    const redirectUrl = `https://www.adhyeybrothers.in/checkout?phonepe_order_id=${encodeURIComponent(merchantOrderId)}`;

    const phonePeRequest = StandardCheckoutPayRequest
      .builder()
      .merchantOrderId(merchantOrderId)
      .amount(amountPaise)
      .redirectUrl(redirectUrl)
      .build();

    let phonePeResponse;

    try {
      phonePeResponse = await client.pay(phonePeRequest);
    } catch (phonePeError) {
      await db
        .from('phonepe_payment_sessions')
        .update({
          status: 'CREATE_FAILED',
          phonepe_state: 'CREATE_FAILED',
          updated_at: new Date().toISOString(),
        })
        .eq('merchant_order_id', merchantOrderId);
      throw phonePeError;
    }

    if (!phonePeResponse?.redirectUrl) {
      console.error('[PHONEPE_CREATE_PAYMENT_INVALID_RESPONSE]', phonePeResponse);

      await db
        .from('phonepe_payment_sessions')
        .update({
          status: 'CREATE_FAILED',
          phonepe_state: 'NO_REDIRECT_URL',
          updated_at: new Date().toISOString(),
        })
        .eq('merchant_order_id', merchantOrderId);

      return NextResponse.json({ success: false, error: 'PhonePe did not return a secure payment URL.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      merchantOrderId,
      redirectUrl: phonePeResponse.redirectUrl,
      amount: expectedAmount,
    });
  } catch (error: unknown) {
    console.error('[PHONEPE_CREATE_PAYMENT_ERROR]', { merchantOrderId, error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to create PhonePe payment.',
      },
      { status: 500 }
    );
  }
}
