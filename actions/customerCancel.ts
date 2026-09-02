'use server';

import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

interface CancelCustomerOrderInput {
  orderId: string;
  reason?: string;
  email?: string;
  phone?: string;
}

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING'];

export async function cancelCustomerOrderAction(input: CancelCustomerOrderInput) {
  try {
    const orderId = String(input.orderId || '').trim();
    const reason = String(input.reason || 'Customer requested cancellation').trim();

    if (!orderId) return { success: false, error: 'Order ID is required.' };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Secure cancellation service is unavailable.' };
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { user } = await getCurrentUser();

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        customer_email,
        customer_phone,
        order_status,
        payment_method,
        payment_status,
        grand_total,
        order_items (
          id,
          product_id,
          quantity,
          size
        )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) return { success: false, error: 'Order not found.' };

    if (user) {
      const ownsById = order.customer_id === user.id;
      const ownsByVerifiedEmail = Boolean(
        user.email &&
        String(order.customer_email || '').trim().toLowerCase() === user.email.trim().toLowerCase()
      );

      if (!ownsById && !ownsByVerifiedEmail) {
        return { success: false, error: 'You can only cancel your own order.' };
      }
    } else {
      const cleanEmail = String(input.email || '').trim().toLowerCase();
      const cleanPhone = String(input.phone || '').replace(/\D/g, '').slice(-10);
      const orderEmail = String(order.customer_email || '').trim().toLowerCase();
      const orderPhone = String(order.customer_phone || '').replace(/\D/g, '').slice(-10);

      if (!cleanEmail || cleanPhone.length !== 10 || cleanEmail !== orderEmail || cleanPhone !== orderPhone) {
        return { success: false, error: 'Order verification failed. Please search again with the order email and phone.' };
      }
    }

    const currentStatus = String(order.order_status || '').toUpperCase();
    if (!CANCELLABLE_STATUSES.includes(currentStatus)) {
      return {
        success: false,
        error: currentStatus === 'CANCELLED'
          ? 'This order is already cancelled.'
          : 'This order can no longer be cancelled because processing has progressed too far.',
      };
    }

    const paymentMethod = String(order.payment_method || '').toUpperCase();
    const paymentStatus = String(order.payment_status || '').toUpperCase();
    const isPrepaid = paymentMethod.includes('ONLINE') || paymentMethod.includes('UPI') || paymentStatus === 'PAID';

    const { data: cancelledOrder, error: cancelError } = await admin
      .from('orders')
      .update({
        order_status: 'CANCELLED',
        payment_status: isPrepaid ? 'REFUND_PENDING' : order.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .in('order_status', CANCELLABLE_STATUSES)
      .select('id')
      .maybeSingle();

    if (cancelError) return { success: false, error: cancelError.message };
    if (!cancelledOrder) {
      return { success: false, error: 'Order status changed before cancellation could complete. Please refresh and check the order.' };
    }

    for (const item of order.order_items || []) {
      if (!item.product_id || !item.quantity) continue;

      let inventoryQuery = admin
        .from('inventory')
        .select('id, available_quantity')
        .eq('product_id', item.product_id);

      if (item.size) inventoryQuery = inventoryQuery.eq('size', item.size);

      const { data: inventoryRow } = await inventoryQuery.maybeSingle();
      if (!inventoryRow) continue;

      await admin
        .from('inventory')
        .update({ available_quantity: Number(inventoryRow.available_quantity || 0) + Number(item.quantity || 0) })
        .eq('id', inventoryRow.id);
    }

    await admin.from('order_status_history').insert({
      order_id: order.id,
      previous_status: currentStatus,
      new_status: 'CANCELLED',
      notes: `Customer cancelled order. Reason: ${reason}.${isPrepaid ? ' Payment marked REFUND_PENDING; gateway refund must be processed by the configured refund integration.' : ' COD order; no payment refund required.'}`,
      changed_by: user ? user.id : 'CUSTOMER_GUEST',
    });

    revalidatePath('/orders');
    revalidatePath(`/orders/${order.order_number}`);

    return {
      success: true,
      orderStatus: 'CANCELLED',
      paymentStatus: isPrepaid ? 'REFUND_PENDING' : order.payment_status,
      refundPending: isPrepaid,
      message: isPrepaid
        ? 'Order cancelled successfully. Your payment is marked for refund processing.'
        : 'Order cancelled successfully. No payment refund is required for COD.',
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Unable to cancel this order right now.' };
  }
}
