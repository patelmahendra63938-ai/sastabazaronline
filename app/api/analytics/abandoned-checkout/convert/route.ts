import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const visitorId = String(body.visitorId || '').trim().slice(0, 120);
    const orderNumber = String(body.orderNumber || '').trim().slice(0, 120);

    if (!visitorId || !orderNumber) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('abandoned_checkouts')
      .update({
        status: 'converted',
        order_number: orderNumber,
        converted_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq('visitor_id', visitorId)
      .eq('status', 'abandoned');

    if (error) {
      console.error('[ABANDONED_CHECKOUT_CONVERT_ERROR]', error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
