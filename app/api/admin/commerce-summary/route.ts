import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function startDate(range: string) {
  if (range === '7D') return new Date(Date.now() - 7 * 86400000).toISOString();
  if (range === '30D') return new Date(Date.now() - 30 * 86400000).toISOString();
  return null;
}

export async function GET(request: Request) {
  await requireAdminUser();

  const range = new URL(request.url).searchParams.get('range') || 'ALL';
  const from = startDate(range);

  let query = supabaseAdmin
    .from('commerce_events')
    .select('event_type,visitor_id,session_id,value,created_at');

  if (from) query = query.gte('created_at', from);

  const { data, error } = await query.limit(10000);
  if (error) {
    console.error('[COMMERCE_ANALYTICS_SUMMARY_ERROR]', error);
    return NextResponse.json({ error: 'Unable to load commerce analytics.' }, { status: 500 });
  }

  const events = data ?? [];
  const byType = (type: string) => events.filter((event) => event.event_type === type);
  const uniqueVisitors = (rows: typeof events) => new Set(rows.map((row) => row.visitor_id)).size;
  const uniqueSessions = (rows: typeof events) => new Set(rows.map((row) => row.session_id)).size;

  const carts = byType('add_to_cart');
  const checkouts = byType('begin_checkout');
  const purchases = byType('purchase');

  const cartVisitors = uniqueVisitors(carts);
  const checkoutVisitors = uniqueVisitors(checkouts);
  const purchaseVisitors = uniqueVisitors(purchases);

  return NextResponse.json({
    range,
    cartEvents: carts.length,
    cartVisitors,
    cartSessions: uniqueSessions(carts),
    checkoutVisitors,
    purchaseVisitors,
    checkoutRateFromCart: cartVisitors ? (checkoutVisitors / cartVisitors) * 100 : 0,
    purchaseRateFromCart: cartVisitors ? (purchaseVisitors / cartVisitors) * 100 : 0,
    trackedPurchaseValue: purchases.reduce((sum, event) => sum + Number(event.value || 0), 0),
  });
}
