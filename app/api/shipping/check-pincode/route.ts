import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateAuthoritativeOrderPricing } from '@/lib/pricing/pricing-engine';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `shipping-quote:${clientIp}`,
      limit: 60,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { serviceable: false, message: 'Too many shipping checks. Please try again shortly.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json();
    if (!/^\d{6}$/.test(String(body.pincode || '').trim()) || !Array.isArray(body.cart) || !body.cart.length) {
      return NextResponse.json(
        { serviceable: false, message: 'A valid PIN code and non-empty cart are required.' },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { serviceable: false, message: 'Server pricing is unavailable.' },
        { status: 503 }
      );
    }

    const db = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const quote = await calculateAuthoritativeOrderPricing({
      db,
      pincode: body.pincode,
      paymentMethod: body.paymentMethod === 'COD' ? 'COD' : 'ONLINE',
      cart: body.cart,
      couponCode: body.couponCode,
    });

    return NextResponse.json(quote);
  } catch (error) {
    console.error('[SHIPPING_QUOTE_ERROR]', error);
    return NextResponse.json(
      { serviceable: false, message: 'Pricing could not be verified.' },
      { status: 422 }
    );
  }
}
