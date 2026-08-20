'use server';

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
 * Validates and retrieves orders using authenticated user ID or verified guest email.
 */
export async function lookupOrdersAction(input?: { email?: string; phone?: string }): Promise<OrderLookupResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { user } = await getCurrentUser();

    // =========================================================================
    // CASE 1: CUSTOMER IS LOGGED IN
    // =========================================================================
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

    // =========================================================================
    // CASE 2: GUEST CUSTOMER (EMAIL LOOKUP VIA SECURE RPC)
    // =========================================================================
    if (!input?.email || !input.email.trim() || !input.phone) {
      return { success: false, error: 'Enter the email and phone number used when placing your order.' };
    }

    const cleanEmail = input.email.trim().toLowerCase();
    const cleanPhone = input.phone.replace(/\D/g, '');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (cleanPhone.length < 10) return { success: false, error: 'Enter a valid order phone number.' };

    // Extract client IP for rate limiting
    const headersList = await headers();
    const clientIp = 
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
      headersList.get('x-real-ip') || 
      'anonymous-client';

    // Invoke PostgreSQL Security Definer RPC
    const { data: rpcResponse, error: rpcError } = await supabase.rpc('get_orders_by_guest_identity', {
      p_email: cleanEmail,
      p_phone: cleanPhone,
      p_ip: clientIp
    });

    if (rpcError) {
      return { success: false, error: 'Order lookup service is momentarily unavailable.' };
    }

    if (!rpcResponse?.success) {
      return { success: false, error: rpcResponse?.error || 'Failed to search orders.' };
    }

    return {
      success: true,
      orders: rpcResponse.orders || [],
      isLoggedIn: false,
      email: cleanEmail
    };

  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred during order lookup.' };
  }
}
