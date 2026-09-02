'use server';

import { createClient } from '@supabase/supabase-js';
import { getVerifiedOrderDetailAction } from '@/actions/orderDetails';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export async function saveCustomerGstInvoiceAction(input: {
  orderRef: string;
  gstin: string;
  billingAddress: string;
  email?: string;
  phone?: string;
}) {
  const orderRef = String(input.orderRef || '').trim();
  const gstin = String(input.gstin || '').trim().toUpperCase();
  const billingAddress = String(input.billingAddress || '').trim();
  const email = String(input.email || '').trim();
  const phone = String(input.phone || '').trim();

  if (!GSTIN_PATTERN.test(gstin)) {
    return {
      success: false,
      error: 'Please enter a valid 15-character GSTIN.',
    };
  }

  if (billingAddress.length < 10) {
    return {
      success: false,
      error: 'Please enter the complete GST billing address.',
    };
  }

  const verified = await getVerifiedOrderDetailAction({
    orderRef,
    email: email || undefined,
    phone: phone || undefined,
  });

  if (!verified.success || !verified.order) {
    return {
      success: false,
      error: verified.error || 'Order ownership could not be verified.',
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      error: 'GST invoice service is temporarily unavailable.',
    };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const existingShippingAddress = verified.order.shipping_address;
  const shippingAddress =
    existingShippingAddress &&
    typeof existingShippingAddress === 'object' &&
    !Array.isArray(existingShippingAddress)
      ? { ...existingShippingAddress }
      : { address: String(existingShippingAddress || '') };

  shippingAddress.gst_invoice = {
    requested: true,
    gstin,
    billing_address: billingAddress,
    submitted_at: new Date().toISOString(),
    source: 'customer_provided',
  };

  const { error } = await admin
    .from('orders')
    .update({
      shipping_address: shippingAddress,
      updated_at: new Date().toISOString(),
    })
    .eq('id', verified.order.id);

  if (error) {
    console.error('[CUSTOMER_GST_INVOICE_SAVE_ERROR]', error);
    return {
      success: false,
      error: 'GST invoice details could not be saved. Please try again.',
    };
  }

  return {
    success: true,
    gstin,
    billingAddress,
  };
}
