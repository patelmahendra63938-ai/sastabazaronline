'use server';

import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORDER_PATTERN = /^SBZ-[A-Z0-9-]{6,40}$/i;

export async function getVerifiedOrderDetailAction(input: { orderRef: string; email?: string; phone?: string }) {
  const orderRef = String(input.orderRef || '').trim();
  if (!UUID_PATTERN.test(orderRef) && !ORDER_PATTERN.test(orderRef)) return { success: false, error: 'Invalid order reference.' };

  const supabase = await createServerSupabaseClient();
  const { user } = await getCurrentUser();

  if (user) {
    let query = supabase.from('orders').select('*, order_items(*)').eq('customer_id', user.id);
    query = UUID_PATTERN.test(orderRef) ? query.eq('id', orderRef) : query.eq('order_number', orderRef);
    let { data: order, error } = await query.maybeSingle();

    // If the historical order is not linked to the current auth UUID, allow
    // recovery by the account's verified email. Supabase Auth keeps email
    // unique, so the verified signed-in email is the ownership proof here.
    if ((!order || error) && user.email) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceRoleKey) {
        const admin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });

        let legacyQuery = admin
          .from('orders')
          .select('*, order_items(*)')
          .ilike('customer_email', user.email.trim().toLowerCase());
        legacyQuery = UUID_PATTERN.test(orderRef) ? legacyQuery.eq('id', orderRef) : legacyQuery.eq('order_number', orderRef);
        const legacy = await legacyQuery.maybeSingle();

        if (legacy.data && !legacy.error) {
          order = legacy.data;
          error = null;

          if (!legacy.data.customer_id) {
            await admin
              .from('orders')
              .update({ customer_id: user.id })
              .eq('id', legacy.data.id)
              .is('customer_id', null);
          }
        }
      }
    }

    if (error || !order) return { success: false, error: 'This order does not belong to the signed-in account.' };

    const [{ data: returnRequest }, { data: refundRecord }] = await Promise.all([
      supabase.from('returns').select('*, return_items(*)').eq('order_id', order.id).maybeSingle(),
      supabase.from('refunds').select('id, status, refund_amount, refund_utr, created_at').eq('order_id', order.id).maybeSingle(),
    ]);

    return { success: true, order, returnRequest, refundRecord, canManage: true };
  }

  const email = String(input.email || '').trim().toLowerCase();
  const phone = String(input.phone || '').replace(/\D/g, '');
  if (!email || phone.length < 10) return { success: false, requiresVerification: true, error: 'Enter the order email and phone number to continue.' };

  const headerStore = await headers();
  const clientIp = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || headerStore.get('x-real-ip') || 'anonymous-client';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[ORDER_DETAIL_CONFIG_ERROR] Secure guest lookup is unavailable.');
    return { success: false, requiresVerification: true, error: 'Order lookup is temporarily unavailable.' };
  }

  // Guest lookup is exposed only through this validated server action. The
  // underlying SECURITY DEFINER RPC is restricted to service_role so it cannot
  // be called directly with the public Supabase key.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await admin.rpc('get_guest_order_secure', { p_order_number: orderRef, p_email: email, p_phone: phone, p_ip: clientIp });
  if (error || !data?.success || !data?.order) return { success: false, requiresVerification: true, error: 'Order details did not match. Check the order number, email, and phone.' };
  return { success: true, order: data.order, returnRequest: null, refundRecord: null, canManage: false };
}
