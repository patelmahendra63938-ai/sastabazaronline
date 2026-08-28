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

const ORDER_PATTERN = /^SBZ-[A-Z0-9-]{6,40}$/i;

export async function lookupOrdersAction(input?: { orderNumber?: string; email?: string; phone?: string }): Promise<OrderLookupResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { user } = await getCurrentUser();

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
        return { success: false, error: 'Unable to load your orders.' };
      }

      return {
        success: true,
        orders: orders || [],
        isLoggedIn: true,
        email: user.email || 'Email not available',
      };
    }

    const orderNumber = String(input?.orderNumber || '').trim().toUpperCase();
    const cleanEmail = String(input?.email || '').trim().toLowerCase();
    const cleanPhone = String(input?.phone || '').replace(/\D/g, '');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!ORDER_PATTERN.test(orderNumber)) {
      return { success: false, error: 'Enter a valid order number.' };
    }
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

    const { data: rpcResponse, error: rpcError } = await supabase.rpc('get_guest_order_secure', {
      p_order_number: orderNumber,
      p_email: cleanEmail,
      p_phone: cleanPhone,
      p_ip: clientIp,
    });

    if (rpcError || !rpcResponse?.success || !rpcResponse?.order) {
      return {
        success: false,
        error: 'Order details did not match. Check the order number, email, and phone.',
      };
    }

    return {
      success: true,
      orders: [rpcResponse.order],
      isLoggedIn: false,
      email: cleanEmail,
    };
  } catch (err: unknown) {
    console.error('[ORDER_LOOKUP_ERROR]', err);
    return { success: false, error: 'Order lookup is temporarily unavailable.' };
  }
}
