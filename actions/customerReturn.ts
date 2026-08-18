'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

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

    if (!input.reason || !input.orderId || !input.productId) {
      return { success: false, error: 'Please provide all required return details.' };
    }

    const supabase = await createServerSupabaseClient();

    // 1. Verify Order Ownership and Delivered Status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, order_status, grand_total, customer_id, customer_name, created_at')
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

    // 2. Fetch Item Snapshot for Price Calculation
    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .select('unit_price, quantity')
      .eq('id', input.orderItemId)
      .single();

    if (itemError || !item) {
      return { success: false, error: 'Order item not found.' };
    }

    const refundRequested = Number(item.unit_price) * Number(input.quantity);
    const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Create Return Request Entry
    const { data: returnRecord, error: returnInsertError } = await supabase
      .from('returns')
      .insert({
        return_number: returnNumber,
        order_id: order.id,
        customer_id: user.id,
        customer_name: order.customer_name,
        status: 'RETURN_REQUESTED',
        total_refund_requested: refundRequested,
        total_refund_approved: 0.00
      })
      .select('id')
      .single();

    if (returnInsertError) {
      return { success: false, error: returnInsertError.message };
    }

    // 4. Create Return Item Entry
    await supabase.from('return_items').insert({
      return_id: returnRecord.id,
      order_item_id: input.orderItemId,
      product_id: input.productId,
      quantity: input.quantity,
      reason: input.reason,
      customer_comment: input.comment || '',
      disposition: 'PENDING'
    });

    // 5. Update Order Status
    await supabase
      .from('orders')
      .update({ order_status: 'RETURN_REQUESTED', updated_at: new Date().toISOString() })
      .eq('id', order.id);

    revalidatePath(`/orders/${order.id}`);
    revalidatePath('/orders');
    return { success: true, returnNumber };

  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit return request.' };
  }
}