'use server';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { calculateAuthoritativeOrderPricing } from '@/lib/pricing/pricing-engine';
import { dispatchOrderNotifications } from '@/lib/notifications/dispatcher';

export interface CheckoutCartItem {
  id?: string;
  product_id?: string;
  size?: string;
  quantity: number;
  title?: string;
  price?: number;
  original_price?: number;
  image?: string;
  net_weight?: number;
  weight_kg?: number;
  hsn_code?: string;
  gst_rate?: number;
  selected_campaign_id?: string;
  applied_offer_label?: string | null;
}

export interface CheckoutInput {
  customer_name?: string;
  customerName?: string;
  fullName?: string;
  customer_email?: string;
  customerEmail?: string;
  email?: string;
  customer_phone?: string;
  customerPhone?: string;
  phone?: string;
  pincode: string;
  address: string;
  city: string;
  state?: string;
  payment_method?: 'COD' | 'UPI_QR' | 'ONLINE' | string;
  paymentMethod?: string;
  upiRefId?: string;
  cart: CheckoutCartItem[];
  coupon_code?: string;
  shipping_address?: any;
}

export async function createVerifiedOrderAction(formData: CheckoutInput) {
  return processOrderCheckout(formData);
}

export async function placeOrderAction(formData: CheckoutInput) {
  return processOrderCheckout(formData);
}

export async function processSecureCheckout(payload: {
  cart: CheckoutCartItem[];
  coupon_code?: string;
  shipping_address?: any;
}) {
  return processOrderCheckout({
    cart: payload.cart,
    coupon_code: payload.coupon_code,
    address: payload.shipping_address?.address || '',
    city: payload.shipping_address?.city || '',
    state: payload.shipping_address?.state || '',
    pincode: payload.shipping_address?.pincode || '',
    paymentMethod: 'COD',
  });
}

export async function processOrderCheckout(formData: CheckoutInput) {
  try {
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return {
        success: false,
        error: 'Store database configuration is unavailable.',
      };
    }

    // Auth/session client. This client is used for the atomic RPC so auth.uid()
    // inside place_order_atomic can resolve the logged-in customer when present.
    const authSupabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    });

    // Server-side database client.
    // The secure checkout RPC is intentionally executable only by service_role.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error('[CHECKOUT_CONFIG_ERROR] SUPABASE_SERVICE_ROLE_KEY is missing.');
      return {
        success: false,
        error: 'Secure checkout is temporarily unavailable. Please try again later.',
      };
    }

    const dbSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const cleanPincode = String(formData.pincode || '').trim();

    if (!/^\d{6}$/.test(cleanPincode)) {
      return {
        success: false,
        error: 'Please enter a valid 6-digit postal PIN code.',
      };
    }

    if (!Array.isArray(formData.cart) || formData.cart.length === 0) {
      return {
        success: false,
        error: 'Your cart is empty.',
      };
    }

    const customerName = (
      formData.customer_name ||
      formData.customerName ||
      formData.fullName ||
      ''
    ).trim();

    const customerEmail = (
      formData.customer_email ||
      formData.customerEmail ||
      formData.email ||
      ''
    ).trim();

    const customerPhone = (
      formData.customer_phone ||
      formData.customerPhone ||
      formData.phone ||
      ''
    ).trim();

    if (!customerName) {
      return {
        success: false,
        error: 'Customer name is required.',
      };
    }

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return {
        success: false,
        error: 'A valid customer email address is required.',
      };
    }

    if (!customerPhone) {
      return {
        success: false,
        error: 'Customer phone number is required.',
      };
    }

    if (!formData.address?.trim() || !formData.city?.trim()) {
      return {
        success: false,
        error: 'Complete delivery address and city are required.',
      };
    }

    const rawPaymentMethod =
      formData.payment_method ||
      formData.paymentMethod ||
      'COD';

    const paymentMethod =
      rawPaymentMethod.startsWith('ONLINE') ||
      rawPaymentMethod.startsWith('Online UPI')
        ? 'ONLINE'
        : rawPaymentMethod === 'UPI_QR' || rawPaymentMethod === 'QR'
          ? 'UPI_QR'
          : 'COD';

    const pricing = await calculateAuthoritativeOrderPricing({ db: dbSupabase, pincode: cleanPincode, paymentMethod, cart: formData.cart, couponCode: formData.coupon_code });
    const serverOriginalTotal = pricing.originalProductPriceTotal;
    const serverSubtotal = pricing.discountedSubtotal;
    const serverTotalDiscount = pricing.discountDeductionAmount;
    const primaryOfferLabel = pricing.primaryOfferName;
    const verifiedItems = pricing.verifiedItems;
    const totalActualWeightKg = pricing.actualWeightGrams / 1000;
    const customerShippingCharge = pricing.shippingCharge;
    const appliedCodCharge = pricing.codCharge;
    const roundedTaxAmount = pricing.totalTaxAmount;
    const grandTotal = pricing.totalPayable;

    const currentYear = new Date().getFullYear();
    const orderNumber =
      `SBZ-${currentYear}-${Math.floor(
        100000 + Math.random() * 900000
      )}`;

    const fullAddress =
      `${formData.address.trim()}, ${formData.city.trim()} - ${cleanPincode}`;

    const shippingAddressJson = {
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state?.trim() || 'Gujarat',
      pincode: cleanPincode,
      country: 'India',
    };

    // Preserve the logged-in customer relationship when a customer session exists.
    const {
      data: { user },
      error: authUserError,
    } = await authSupabase.auth.getUser();

    if (authUserError) {
      console.warn('[CHECKOUT_AUTH_USER_WARNING]', authUserError.message);
    }

    const customerId = user?.id ?? null;

    /*
     * Sole order/inventory write path:
     * public.place_order_atomic_secure
     *
     * This function inserts the order, locks inventory rows with FOR UPDATE,
     * validates stock, decrements inventory, writes movements and inserts
     * order_items in one database transaction.
     */
    const { data: rpcResult, error: rpcError } =
      await dbSupabase.rpc('place_order_atomic_secure', {
        p_order_number: orderNumber,
        p_customer_id: customerId,
        p_customer_name: customerName,
        p_customer_email: customerEmail,
        p_customer_phone: customerPhone,
        p_shipping_address: shippingAddressJson,
        p_subtotal: serverSubtotal,
        p_tax_amount: roundedTaxAmount,
        p_actual_weight_kg: totalActualWeightKg,
        p_chargeable_weight_kg: pricing.chargeableWeightGrams / 1000,
        p_actual_courier_cost: 0,
        p_shipping_charge: customerShippingCharge,
        p_cod_charge: appliedCodCharge,
        p_discount_amount: serverTotalDiscount,
        p_grand_total: grandTotal,
        p_payment_method: paymentMethod,
        p_items: verifiedItems.map((item) => ({
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
      });

    if (rpcError) {
      console.error('[PLACE_ORDER_ATOMIC_ERROR]', rpcError);

      return {
        success: false,
        error:
          rpcError.message ||
          'Order could not be completed safely.',
      };
    }

    if (
      !rpcResult ||
      rpcResult.success !== true ||
      !rpcResult.order_number
    ) {
      console.error(
        '[PLACE_ORDER_ATOMIC_INVALID_RESULT]',
        rpcResult
      );

      return {
        success: false,
        error:
          'Order transaction returned an invalid response.',
      };
    }

    // Notifications are intentionally outside the atomic database transaction.
    // A notification failure must not undo an otherwise successful order.
    try {
      await dispatchOrderNotifications({
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: fullAddress,
        paymentMethod:
          paymentMethod === 'ONLINE'
            ? 'PhonePe Online Payment'
            : paymentMethod,
        grandTotal,
        subtotal: serverSubtotal,
        shippingCharge: customerShippingCharge,
        codCharge: appliedCodCharge,
        discountAmount: serverTotalDiscount,
        taxAmount: roundedTaxAmount,
        items: verifiedItems,
      });
    } catch (notificationError) {
      console.warn(
        '[ORDER_NOTIFICATION_WARNING]',
        notificationError
      );
    }

    return {
      success: true,
      orderId: rpcResult.order_number,
      orderNumber: rpcResult.order_number,
      grandTotal,
      customerBreakdown: {
        original_total: serverOriginalTotal,
        offer_label: primaryOfferLabel,
        discount_amount: serverTotalDiscount,
        subtotal: serverSubtotal,
        shipment_weight:
          `${pricing.actualWeightGrams} g`,
        shipping_charge:
          `₹${customerShippingCharge.toFixed(2)}`,
        cod_charge:
          `₹${appliedCodCharge.toFixed(2)}`,
        total_payable: grandTotal,
      },
    };
  } catch (error: unknown) {
    console.error(
      '[CHECKOUT_PROCESSING_ERROR]',
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred during checkout.',
    };
  }
}
