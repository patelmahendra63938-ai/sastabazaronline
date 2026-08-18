'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { sendTransactionalOrderEmail } from '@/lib/email/emailService';
import { EmailTemplateType } from '@/lib/email/templates/orderTemplates';
import { revalidatePath } from 'next/cache';

export async function retryOrderEmailAction(notificationId: string) {
  try {
    const { user, role } = await getCurrentUser();
    if (!user || !role || !['admin', 'super_admin', 'staff'].includes(role)) {
      return { success: false, error: 'Unauthorized: Admin access required.' };
    }

    const supabase = await createServerSupabaseClient();

    // 1. Fetch Notification Audit Record
    const { data: notification, error: notifError } = await supabase
      .from('order_notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (notifError || !notification) {
      return { success: false, error: 'Notification record not found.' };
    }

    // 2. Fetch Fresh Order Data with Items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', notification.order_id)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Associated order could not be found.' };
    }

    // Increment retry count
    await supabase
      .from('order_notifications')
      .update({ retry_count: (notification.retry_count || 0) + 1 })
      .eq('id', notificationId);

    // 3. Dispatch Retry
    const addressStr = typeof order.shipping_address === 'object'
      ? `${order.shipping_address.address}, ${order.shipping_address.city} - ${order.shipping_address.pincode}`
      : order.shipping_address || order.address || 'Address on record';

    const result = await sendTransactionalOrderEmail(
      (notification.template_type as EmailTemplateType) || 'ORDER_CONFIRMED',
      {
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerEmail: order.customer_email || notification.recipient,
        customerPhone: order.customer_phone,
        shippingAddress: addressStr,
        items: (order.order_items || []).map((item: any) => ({
          title: item.product_title,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          lineTotal: item.line_total,
        })),
        subtotal: order.subtotal,
        shippingCharge: order.shipping_charge,
        grandTotal: order.grand_total,
        paymentMethod: order.payment_method,
        orderDate: new Date(order.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      }
    );

    revalidatePath('/admin/dashboard');
    return result;

  } catch (err: any) {
    return { success: false, error: err.message || 'Email retry failed.' };
  }
}