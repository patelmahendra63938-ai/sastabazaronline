import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { calculateAuthoritativeOrderPricing } from '@/lib/pricing/pricing-engine';
import { dispatchOrderNotifications } from '@/lib/notifications/dispatcher';
import { getPhonePeClient } from '@/lib/phonepe/client';
import { normalizeCheckoutGstDetails } from '@/lib/gst/checkout-gst';

interface FinalizePhonePeInput {
  merchantOrderId: string;
  skipPhonePeStatusCheck?: boolean;
  confirmedPhonePeState?: string;
}

interface StoredCustomerPayload {
  customer_name?: string;
  fullName?: string;
  customer_email?: string;
  email?: string;
  customer_phone?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  coupon_code?: string;
  customer_id?: string | null;
  gst_invoice?: unknown;
}

interface StoredCartItem {
  id?: string;
  product_id?: string;
  size?: string;
  quantity: number;
  selected_campaign_id?: string;
}

function createLocalOrderNumber() {
  const year = new Date().getFullYear();

  return `SBZ-${year}-${Math.floor(
    100000 + Math.random() * 900000
  )}`;
}

export async function finalizePhonePePayment(
  input: FinalizePhonePeInput
) {
  const merchantOrderId = String(input.merchantOrderId || '').trim();

  if (!merchantOrderId) {
    return {
      success: false,
      statusCode: 400,
      error: 'Merchant order ID is required.',
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      statusCode: 500,
      error: 'Secure payment verification is unavailable.',
    };
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: session, error: sessionError } = await db
    .from('phonepe_payment_sessions')
    .select(`
      merchant_order_id,
      status,
      customer_payload,
      cart_payload,
      expected_amount,
      local_order_number,
      phonepe_state
    `)
    .eq('merchant_order_id', merchantOrderId)
    .maybeSingle();

  if (sessionError) {
    console.error('[PHONEPE_SESSION_READ_ERROR]', sessionError);

    return {
      success: false,
      statusCode: 500,
      error: 'Unable to read payment session.',
    };
  }

  if (!session) {
    return {
      success: false,
      statusCode: 404,
      error: 'Payment session was not found.',
    };
  }

  if (session.status === 'COMPLETED' && session.local_order_number) {
    return {
      success: true,
      statusCode: 200,
      paymentComplete: true,
      alreadyFinalized: true,
      merchantOrderId,
      orderNumber: session.local_order_number,
    };
  }

  const { data: existingOrder, error: existingOrderError } = await db
    .from('orders')
    .select('order_number, payment_status')
    .eq('phonepe_merchant_order_id', merchantOrderId)
    .maybeSingle();

  if (existingOrderError) {
    console.error('[PHONEPE_EXISTING_ORDER_READ_ERROR]', existingOrderError);

    return {
      success: false,
      statusCode: 500,
      error: 'Unable to verify existing PhonePe order.',
    };
  }

  if (existingOrder?.order_number) {
    await db
      .from('phonepe_payment_sessions')
      .update({
        status: 'COMPLETED',
        phonepe_state: 'COMPLETED',
        local_order_number: existingOrder.order_number,
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_order_id', merchantOrderId);

    return {
      success: true,
      statusCode: 200,
      paymentComplete: true,
      alreadyFinalized: true,
      merchantOrderId,
      orderNumber: existingOrder.order_number,
    };
  }

  let phonePeState = String(input.confirmedPhonePeState || '').toUpperCase();
  let phonePeStatus: Record<string, unknown> | null = null;

  if (!input.skipPhonePeStatusCheck) {
    const client = getPhonePeClient();
    const response = await client.getOrderStatus(merchantOrderId);

    phonePeStatus = response as unknown as Record<string, unknown>;
    phonePeState = String((response as { state?: string }).state || '').toUpperCase();
  }

  await db
    .from('phonepe_payment_sessions')
    .update({
      phonepe_state: phonePeState || 'UNKNOWN',
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_order_id', merchantOrderId);

  if (phonePeState !== 'COMPLETED') {
    return {
      success: true,
      statusCode: 200,
      paymentComplete: false,
      merchantOrderId,
      state: phonePeState || 'UNKNOWN',
    };
  }

  const statusAmountPaise = Number(phonePeStatus?.amount);
  const expectedAmountPaise = Math.round(Number(session.expected_amount) * 100);

  if (
    Number.isFinite(statusAmountPaise) &&
    statusAmountPaise > 0 &&
    statusAmountPaise !== expectedAmountPaise
  ) {
    console.error('[PHONEPE_AMOUNT_MISMATCH]', {
      merchantOrderId,
      expectedAmountPaise,
      statusAmountPaise,
    });

    await db
      .from('phonepe_payment_sessions')
      .update({
        status: 'AMOUNT_MISMATCH',
        phonepe_state: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_order_id', merchantOrderId);

    return {
      success: false,
      statusCode: 409,
      paymentComplete: true,
      error: 'Payment amount verification failed.',
    };
  }

  const customer = session.customer_payload as StoredCustomerPayload;
  const cart = session.cart_payload as StoredCartItem[];

  if (!Array.isArray(cart) || cart.length === 0) {
    return {
      success: false,
      statusCode: 500,
      paymentComplete: true,
      error: 'Stored checkout cart is unavailable.',
    };
  }

  const customerName = String(customer.customer_name || customer.fullName || '').trim();
  const customerEmail = String(customer.customer_email || customer.email || '').trim();
  const customerPhone = String(customer.customer_phone || customer.phone || '').trim();
  const address = String(customer.address || '').trim();
  const city = String(customer.city || '').trim();
  const state = String(customer.state || 'Gujarat').trim();
  const pincode = String(customer.pincode || '').trim();
  const checkoutGst = normalizeCheckoutGstDetails(customer.gst_invoice);

  const pricing = await calculateAuthoritativeOrderPricing({
    db,
    pincode,
    paymentMethod: 'ONLINE',
    cart,
    couponCode: customer.coupon_code,
  });

  const currentTotalPaise = Math.round(pricing.totalPayable * 100);

  if (currentTotalPaise !== expectedAmountPaise) {
    console.error('[PHONEPE_FINALIZE_PRICE_CHANGED]', {
      merchantOrderId,
      expectedAmountPaise,
      currentTotalPaise,
    });

    await db
      .from('phonepe_payment_sessions')
      .update({
        status: 'FINALIZE_FAILED',
        phonepe_state: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_order_id', merchantOrderId);

    return {
      success: false,
      statusCode: 409,
      paymentComplete: true,
      error: 'Payment succeeded, but checkout pricing changed before order finalization. Manual review is required.',
    };
  }

  const localOrderNumber = createLocalOrderNumber();

  const shippingAddressJson = {
    address,
    city,
    state,
    pincode,
    country: 'India',
    ...(checkoutGst ? { gst_invoice: checkoutGst } : {}),
  };

  const { data: rpcResult, error: rpcError } = await db.rpc(
    'place_phonepe_order_atomic_secure',
    {
      p_phonepe_merchant_order_id: merchantOrderId,
      p_order_number: localOrderNumber,
      p_customer_id: customer.customer_id || null,
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone,
      p_shipping_address: shippingAddressJson,
      p_subtotal: pricing.discountedSubtotal,
      p_tax_amount: pricing.totalTaxAmount,
      p_actual_weight_kg: pricing.actualWeightGrams / 1000,
      p_chargeable_weight_kg: pricing.chargeableWeightGrams / 1000,
      p_actual_courier_cost: 0,
      p_shipping_charge: pricing.shippingCharge,
      p_cod_charge: 0,
      p_discount_amount: pricing.discountDeductionAmount,
      p_grand_total: pricing.totalPayable,
      p_items: pricing.verifiedItems.map((item) => ({
        product_id: item.product_id,
        product_title: item.product_title,
        size: item.size,
        sku: item.sku,
        hsn_code: item.hsn_code,
        gst_rate: item.gst_rate,
        unit_price: item.unit_price,
        weight_kg: item.weight_kg,
        quantity: item.quantity,
        line_total: item.line_total,
      })),
    }
  );

  if (rpcError) {
    console.error('[PHONEPE_ATOMIC_ORDER_ERROR]', rpcError);

    await db
      .from('phonepe_payment_sessions')
      .update({
        status: 'FINALIZE_FAILED',
        phonepe_state: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_order_id', merchantOrderId);

    return {
      success: false,
      statusCode: 500,
      paymentComplete: true,
      error: rpcError.message || 'Payment succeeded, but the order could not be finalized.',
    };
  }

  if (!rpcResult || rpcResult.success !== true || !rpcResult.order_number) {
    console.error('[PHONEPE_ATOMIC_ORDER_INVALID_RESULT]', rpcResult);

    return {
      success: false,
      statusCode: 500,
      paymentComplete: true,
      error: 'Payment succeeded, but order finalization returned an invalid response.',
    };
  }

  const finalOrderNumber = String(rpcResult.order_number);

  const { error: sessionCompleteError } = await db
    .from('phonepe_payment_sessions')
    .update({
      status: 'COMPLETED',
      phonepe_state: 'COMPLETED',
      local_order_number: finalOrderNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_order_id', merchantOrderId);

  if (sessionCompleteError) {
    console.warn('[PHONEPE_SESSION_CLOSE_WARNING]', sessionCompleteError);
  }

  try {
    const fullAddress = `${address}, ${city} - ${pincode}`;

    await dispatchOrderNotifications({
      orderNumber: finalOrderNumber,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: fullAddress,
      paymentMethod: 'PhonePe Online Payment',
      grandTotal: pricing.totalPayable,
      subtotal: pricing.discountedSubtotal,
      shippingCharge: pricing.shippingCharge,
      codCharge: 0,
      discountAmount: pricing.discountDeductionAmount,
      taxAmount: pricing.totalTaxAmount,
      items: pricing.verifiedItems,
    });
  } catch (notificationError) {
    console.warn('[PHONEPE_NOTIFICATION_WARNING]', notificationError);
  }

  return {
    success: true,
    statusCode: 200,
    paymentComplete: true,
    merchantOrderId,
    orderNumber: finalOrderNumber,
    alreadyFinalized: Boolean(rpcResult.already_finalized),
  };
}
