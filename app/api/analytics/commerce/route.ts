import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const EVENT_TYPES = new Set(['add_to_cart', 'begin_checkout', 'purchase']);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const clientEventId = String(body.clientEventId || '').trim().slice(0, 120);
    const visitorId = String(body.visitorId || '').trim().slice(0, 120);
    const sessionId = String(body.sessionId || '').trim().slice(0, 120);
    const eventType = String(body.eventType || '').trim();
    const productId = body.productId ? String(body.productId).trim().slice(0, 120) : null;
    const orderNumber = body.orderNumber ? String(body.orderNumber).trim().slice(0, 120) : null;
    const pagePath = body.pagePath ? String(body.pagePath).trim().slice(0, 300) : null;
    const quantity = Math.min(100, Math.max(1, Number(body.quantity || 1)));
    const value = Math.max(0, Number(body.value || 0));

    if (!clientEventId || !visitorId || !sessionId || !EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('commerce_events').insert({
      client_event_id: clientEventId,
      visitor_id: visitorId,
      session_id: sessionId,
      event_type: eventType,
      product_id: productId,
      quantity: Math.round(quantity),
      value: Number.isFinite(value) ? value : 0,
      order_number: orderNumber,
      page_path: pagePath,
    });

    if (error && error.code !== '23505') {
      console.error('[COMMERCE_ANALYTICS_INSERT_ERROR]', error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
