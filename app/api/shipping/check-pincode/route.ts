import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateAuthoritativeOrderPricing } from '@/lib/pricing/pricing-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!/^\d{6}$/.test(String(body.pincode || '').trim()) || !Array.isArray(body.cart) || !body.cart.length) return NextResponse.json({ serviceable: false, message: 'A valid PIN code and non-empty cart are required.' }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ serviceable: false, message: 'Server pricing is unavailable.' }, { status: 503 });
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const quote = await calculateAuthoritativeOrderPricing({ db, pincode: body.pincode, paymentMethod: body.paymentMethod === 'COD' ? 'COD' : 'ONLINE', cart: body.cart, couponCode: body.couponCode });
    return NextResponse.json(quote);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pricing could not be verified.';
    return NextResponse.json({ serviceable: false, message }, { status: 422 });
  }
}
