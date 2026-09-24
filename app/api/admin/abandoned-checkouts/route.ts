import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function fromRange(range: string) {
  if (range === '7D') return new Date(Date.now() - 7 * 86400000).toISOString();
  if (range === '30D') return new Date(Date.now() - 30 * 86400000).toISOString();
  return null;
}

export async function GET(request: Request) {
  await requireAdminUser();

  const range = new URL(request.url).searchParams.get('range') || 'ALL';
  const from = fromRange(range);

  let query = supabaseAdmin
    .from('abandoned_checkouts')
    .select('id,full_name,phone,email,address,city,state,pincode,cart,cart_value,last_activity_at')
    .eq('status', 'abandoned')
    .order('last_activity_at', { ascending: false })
    .limit(50);

  if (from) query = query.gte('last_activity_at', from);

  const { data, error } = await query;

  if (error) {
    console.error('[ABANDONED_CHECKOUT_ADMIN_ERROR]', error);
    return NextResponse.json({ error: 'Unable to load abandoned checkouts.' }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}
