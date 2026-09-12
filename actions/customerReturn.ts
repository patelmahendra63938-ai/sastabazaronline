'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface CreateReturnInput {
  orderId: string;
  orderItemId: string;
  productId: string;
  quantity: number;
  reason: string;
  comment?: string;
  upiId?: string;
}

export async function submitReturnRequestAction(input: CreateReturnInput) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please login to request a return.' };
    }

    if (!input.reason || !input.orderId || !input.orderItemId || !input.productId) {
      return { success: false, error: 'Please provide all required return details.' };
    }

    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      return { success: false, error: 'Invalid return quantity.' };
    }

    const supabase = await createServerSupabaseClient();

    // 1. Verify order ownership, delivered state and 7-day return window.
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, order_status, grand_total, customer_id, customer_name, created_at, updated_at')
      .eq('id', input.orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found.' };
    }

    if (order.customer_id && order.customer_id !== user.id) {
      return { success: false, error: 'Unauthorized: You can only return your own orders.' };
    }

    if (order.order_status !== 'DELIVERED') {
      return { success: false, error: 'Return can only be requested for delivered orders.' };
    }

    const deliveredAt = new Date(order.updated_at || order.created_at).getTime();
    if (!Number.isFinite(deliveredAt) || Date.now() - deliveredAt > RETURN_WINDOW_MS) {
      return { success: false, error: 'The 7-day return window for this order has expired.' };
    }

    // 2. Verify the selected item belongs to this order and the requested quantity is valid.
    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, unit_price, quantity')
      .eq('id', input.orderItemId)
      .eq('order_id', order.id)
      .eq('product_id', input.productId)
      .single();

    if (itemError || !item) {
      return { success: false, error: 'Order item not found.' };
    }

    if (input.quantity > Number(item.quantity || 0)) {
      return { success: false, error: 'Return quantity cannot exceed the purchased quantity.' };
    }

    const refundRequested = Number(item.unit_price) * input.quantity;
    const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Create return request. Eligible returns have free reverse shipping per policy.
    const { data: returnRecord, error: returnInsertError } = await supabase
      .from('returns')
      .insert({
        return_number: returnNumber,
        order_id: order.id,
        customer_id: user.id,
        customer_name: order.customer_name,
        status: 'RETURN_REQUESTED',
        total_refund_requested: refundRequested,
        total_refund_approved: 0.0,
      })
      .select('id')
      .single();

    if (returnInsertError) {
      return { success: false, error: returnInsertError.message };
    }

    // 4. Create return item entry.
    const { error: returnItemError } = await supabase.from('return_items').insert({
      return_id: returnRecord.id,
      order_item_id: input.orderItemId,
      product_id: input.productId,
      quantity: input.quantity,
      reason: input.reason,
      customer_comment: input.comment || '',
      disposition: 'PENDING',
    });

    if (returnItemError) {
      return { success: false, error: returnItemError.message };
    }

    // 5. Update order status after a valid return request is recorded.
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({ order_status: 'RETURN_REQUESTED', updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('order_status', 'DELIVERED');

    if (orderUpdateError) {
      return { success: false, error: orderUpdateError.message };
    }

    revalidatePath(`/orders/${order.id}`);
    revalidatePath('/orders');
    return { success: true, returnNumber };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit return request.' };
  }
}
