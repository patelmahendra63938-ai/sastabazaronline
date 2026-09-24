import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function clean(value: unknown, max: number) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const visitorId = clean(body.visitorId, 120);
    const sessionId = clean(body.sessionId, 120);
    const phone = clean(body.phone, 20);
    const email = clean(body.email, 254)?.toLowerCase() ?? null;
    const fullName = clean(body.fullName, 120);
    const address = clean(body.address, 500);
    const city = clean(body.city, 120);
    const state = clean(body.state, 120);
    const pincode = clean(body.pincode, 10);
    const cart = Array.isArray(body.cart) ? body.cart.slice(0, 50).map((item: any) => ({
      product_id: String(item.product_id || item.id || '').slice(0, 120),
      title: String(item.title || item.name || 'Product').slice(0, 200),
      size: item.size ? String(item.size).slice(0, 50) : null,
      quantity: Math.min(100, Math.max(1, Number(item.quantity || 1))),
      price: Math.max(0, Number(item.price || 0)),
    })) : [];
    const cartValue = Math.max(0, Number(body.cartValue || 0));

    if (!visitorId || !sessionId || cart.length === 0) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const hasUsableContact =
      /^\d{10}$/.test(phone || '') ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');

    if (!hasUsableContact) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { error } = await supabaseAdmin
      .from('abandoned_checkouts')
      .upsert({
        visitor_id: visitorId,
        session_id: sessionId,
        full_name: fullName,
        phone,
        email,
        address,
        city,
        state,
        pincode,
        cart,
        cart_value: Number.isFinite(cartValue) ? cartValue : 0,
        status: 'abandoned',
        order_number: null,
        converted_at: null,
        last_activity_at: new Date().toISOString(),
      }, { onConflict: 'visitor_id' });

    if (error) {
      console.error('[ABANDONED_CHECKOUT_SAVE_ERROR]', error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
