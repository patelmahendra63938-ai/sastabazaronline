'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type ReturnRequestType = 'RETURN' | 'EXCHANGE';

interface CreateReturnInput {
  orderId: string;
  orderItemId: string;
  productId: string;
  quantity: number;
  reason: string;
  comment?: string;
  upiId?: string;
}

interface CreateOrderReturnInput {
  orderId: string;
  requestType: ReturnRequestType;
  reason: string;
  comment?: string;
  targetSize?: string;
  refundUpiId?: string;
}

function isInsideReturnWindow(deliveredAtValue?: string | null) {
  if (!deliveredAtValue) return false;
  const deliveredAt = new Date(deliveredAtValue).getTime();
  return Number.isFinite(deliveredAt) && Date.now() - deliveredAt <= RETURN_WINDOW_MS;
}

async function getOwnedDeliveredOrder(orderId: string) {
  const { user } = await getCurrentUser();
  if (!user) {
    return { success: false as const, error: 'Please login to request a return.' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, order_status, grand_total, total_amount, customer_id, customer_name, created_at, updated_at')
    .eq('id', orderId)
    .single();

  if (error || !order) return { success: false as const, error: 'Order not found.' };
  if (order.customer_id && order.customer_id !== user.id) {
    return { success: false as const, error: 'Unauthorized: You can only return your own orders.' };
  }
  if (order.order_status !== 'DELIVERED') {
    return { success: false as const, error: 'Return can only be requested for delivered orders.' };
  }
  if (!isInsideReturnWindow(order.updated_at || order.created_at)) {
    return { success: false as const, error: 'The 7-day return window for this order has expired.' };
  }

  const { data: existingReturn } = await supabase
    .from('returns')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle();

  if (existingReturn) {
    return { success: false as const, error: 'A return or exchange request already exists for this order.' };
  }

  return { success: true as const, user, supabase, order };
}

export async function submitOrderReturnRequestAction(input: CreateOrderReturnInput) {
  try {
    if (!input.orderId || !input.reason || !['RETURN', 'EXCHANGE'].includes(input.requestType)) {
      return { success: false, error: 'Please provide all required return details.' };
    }

    const verified = await getOwnedDeliveredOrder(input.orderId);
    if (!verified.success) return verified;

    const { supabase, user, order } = verified;
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('id, product_id, unit_price, quantity')
      .eq('order_id', order.id);

    if (itemsError || !items?.length) {
      return { success: false, error: 'No eligible order items were found.' };
    }

    if (input.requestType === 'EXCHANGE' && !input.targetSize?.trim()) {
      return { success: false, error: 'Please select the exchange size.' };
    }

    const totalRefundRequested = input.requestType === 'RETURN'
      ? items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0)
      : 0;
    const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: returnRecord, error: returnInsertError } = await supabase
      .from('returns')
      .insert({
        return_number: returnNumber,
        order_id: order.id,
        customer_id: user.id,
        customer_name: order.customer_name,
        status: input.requestType === 'EXCHANGE' ? 'EXCHANGE_REQUESTED' : 'RETURN_REQUESTED',
        total_refund_requested: totalRefundRequested,
        total_refund_approved: 0.0,
        expected_pickup_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (returnInsertError || !returnRecord) {
      return { success: false, error: returnInsertError?.message || 'Failed to create the return request.' };
    }

    const targetSizeText = input.requestType === 'EXCHANGE'
      ? ` (Target Size: ${input.targetSize?.trim()})`
      : '';
    const itemsPayload = items.map((item) => ({
      return_id: returnRecord.id,
      order_item_id: item.id,
      product_id: item.product_id,
      quantity: Number(item.quantity || 0),
      reason: `${input.requestType}: ${input.reason}${targetSizeText}`,
      customer_comment: input.comment?.trim() || null,
      disposition: 'PENDING',
    }));

    const { error: returnItemsError } = await supabase.from('return_items').insert(itemsPayload);
    if (returnItemsError) {
      await supabase.from('returns').delete().eq('id', returnRecord.id);
      return { success: false, error: returnItemsError.message };
    }

    if (input.requestType === 'RETURN' && input.refundUpiId?.trim()) {
      const refundNumber = `REF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error: refundError } = await supabase.from('refunds').insert({
        refund_number: refundNumber,
        return_id: returnRecord.id,
        order_id: order.id,
        refund_amount: totalRefundRequested || Number(order.grand_total || order.total_amount || 0),
        refund_method: 'UPI',
        status: 'REFUND_PENDING',
        customer_upi_id: input.refundUpiId.trim(),
      });

      if (refundError) {
        return { success: false, error: refundError.message };
      }
    }

    const newOrderStatus = input.requestType === 'EXCHANGE' ? 'EXCHANGE_REQUESTED' : 'RETURN_REQUESTED';
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({ order_status: newOrderStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('order_status', 'DELIVERED');

    if (orderUpdateError) {
      return { success: false, error: orderUpdateError.message };
    }

    revalidatePath(`/orders/${order.id}`);
    revalidatePath('/orders');
    return { success: true, returnNumber, requestType: input.requestType };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit return request.' };
  }
}

export async function submitReturnRequestAction(input: CreateReturnInput) {
  try {
    if (!input.reason || !input.orderId || !input.orderItemId || !input.productId) {
      return { success: false, error: 'Please provide all required return details.' };
    }

    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      return { success: false, error: 'Invalid return quantity.' };
    }

    const verified = await getOwnedDeliveredOrder(input.orderId);
    if (!verified.success) return verified;

    const { supabase, user, order } = verified;
    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, unit_price, quantity')
      .eq('id', input.orderItemId)
      .eq('order_id', order.id)
      .eq('product_id', input.productId)
      .single();

    if (itemError || !item) return { success: false, error: 'Order item not found.' };
    if (input.quantity > Number(item.quantity || 0)) {
      return { success: false, error: 'Return quantity cannot exceed the purchased quantity.' };
    }

    const refundRequested = Number(item.unit_price) * input.quantity;
    const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

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

    if (returnInsertError || !returnRecord) {
      return { success: false, error: returnInsertError?.message || 'Failed to create the return request.' };
    }

    const { error: returnItemError } = await supabase.from('return_items').insert({
      return_id: returnRecord.id,
      order_item_id: input.orderItemId,
      product_id: input.productId,
      quantity: input.quantity,
      reason: input.reason,
      customer_comment: input.comment || '',
      disposition: 'PENDING',
    });

    if (returnItemError) return { success: false, error: returnItemError.message };

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({ order_status: 'RETURN_REQUESTED', updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('order_status', 'DELIVERED');

    if (orderUpdateError) return { success: false, error: orderUpdateError.message };

    revalidatePath(`/orders/${order.id}`);
    revalidatePath('/orders');
    return { success: true, returnNumber };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit return request.' };
  }
}
