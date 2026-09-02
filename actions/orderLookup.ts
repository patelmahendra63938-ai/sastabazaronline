'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { headers } from 'next/headers';

export interface OrderLookupResult {
  success: boolean;
  orders?: any[];
  error?: string;
  isLoggedIn?: boolean;
  email?: string;
}

/**
 * Validates and retrieves orders using authenticated user ID or verified guest email + phone.
 */
export async function lookupOrdersAction(input?: { email?: string; phone?: string }): Promise<OrderLookupResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { user } = await getCurrentUser();

    // CASE 1: CUSTOMER IS LOGGED IN
    if (user) {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          order_status,
          payment_method,
          payment_status,
          subtotal,
          shipping_charge,
          cod_charge,
          discount_amount,
          grand_total,
          item_count,
          courier_partner,
          tracking_number,
          created_at,
          order_items (
            id,
            product_id,
            product_title,
            quantity,
            unit_price,
            mrp,
            line_total
          ),
          shipments (
            id,
            awb_number,
            shipment_status,
            tracking_url,
            courier_partners (name)
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        return { success: false, error: ordersError.message };
      }

      return {
        success: true,
        orders: orders || [],
        isLoggedIn: true,
        email: user.email || 'Email not available'
      };
    }

    // CASE 2: GUEST CUSTOMER
    if (!input?.email || !input.email.trim() || !input.phone) {
      return { success: false, error: 'Enter the email and phone number used when placing your order.' };
    }

    const cleanEmail = input.email.trim().toLowerCase();
    const cleanPhone = input.phone.replace(/\D/g, '');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (cleanPhone.length < 10) {
      return { success: false, error: 'Enter a valid order phone number.' };
    }

    const headersList = await headers();
    const clientIp =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip') ||
      'anonymous-client';

    // This RPC is intentionally executable only by service_role. Because this
    // is a server action and the RPC itself verifies email + phone, invoke it
    // with the service-role client instead of the public/anon client.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[ORDER_LOOKUP] Missing secure Supabase server credentials.');
      return { success: false, error: 'Order lookup service is temporarily unavailable.' };
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: rpcResponse, error: rpcError } = await admin.rpc('get_orders_by_guest_identity', {
      p_email: cleanEmail,
      p_phone: cleanPhone,
      p_ip: clientIp,
    });

    if (rpcError) {
      console.error('[ORDER_LOOKUP_RPC_ERROR]', rpcError.message);
      return { success: false, error: 'Order lookup service is temporarily unavailable.' };
    }

    if (!rpcResponse?.success) {
      return { success: false, error: rpcResponse?.error || 'Failed to search orders.' };
    }

    return {
      success: true,
      orders: rpcResponse.orders || [],
      isLoggedIn: false,
      email: cleanEmail,
    };
  } catch (err: any) {
    console.error('[ORDER_LOOKUP_ERROR]', err);
    return { success: false, error: 'Unable to look up this order right now. Please try again.' };
  }
}
