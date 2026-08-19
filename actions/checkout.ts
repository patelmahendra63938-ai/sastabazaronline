'use server';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {
  getActiveCampaigns,
  calculateDiscountedPrice,
  Campaign,
} from '@/lib/promotions';
import { checkPincodeShippingRate } from '@/lib/shipping/serviceability';
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

interface VerifiedCheckoutItem {
  product_id: string;
  product_title: string;
  size: string;
  sku: string;
  hsn_code: string;
  gst_rate: number;
  unit_price: number;
  original_price: number;
  applied_offer_label: string | null;
  discount_reduction: number;
  weight_kg: number;
  quantity: number;
  line_total: number;
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

    // Collect unique product IDs from the customer cart.
    const productIds = Array.from(
      new Set(
        formData.cart
          .map((item) => item.product_id || item.id)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (productIds.length === 0) {
      return {
        success: false,
        error: 'No valid product references were found in the cart.',
      };
    }

    // Product prices, tax and exact physical weight always come from the server.
    const { data: dbProducts, error: productError } = await dbSupabase
      .from('products')
      .select(
        'id, title, price, mrp, category, hsn_code, gst_rate, net_weight_grams'
      )
      .in('id', productIds);

    if (productError || !dbProducts) {
      console.error('[CHECKOUT_PRODUCT_QUERY_ERROR]', productError);
      return {
        success: false,
        error: 'Failed to retrieve catalog products from database.',
      };
    }

    // Inventory is used only for size/SKU/stock verification here.
    // Shipping weight does NOT come from inventory.weight_kg.
    const { data: dbInventory, error: inventoryError } = await dbSupabase
      .from('inventory')
      .select(
        'product_id, size, sku, available_quantity, sold_quantity'
      )
      .in('product_id', productIds);

    if (inventoryError || !dbInventory) {
      console.error('[CHECKOUT_INVENTORY_QUERY_ERROR]', inventoryError);
      return {
        success: false,
        error: 'Failed to retrieve inventory records.',
      };
    }

    const { data: rawPromotions, error: promotionsError } = await dbSupabase
      .from('promotions')
      .select('*')
      .eq('is_enabled', true);

    if (promotionsError) {
      console.warn('[CHECKOUT_PROMOTIONS_QUERY_WARNING]', promotionsError);
    }

    const activeCampaigns = getActiveCampaigns(
      (rawPromotions as Campaign[]) || []
    );

    let serverOriginalTotal = 0;
    let serverSubtotal = 0;
    let serverTotalDiscount = 0;
    let totalTax = 0;
    let totalActualWeightGrams = 0;
    let primaryOfferLabel: string | null = null;

    const verifiedItems: VerifiedCheckoutItem[] = [];

    for (const cartItem of formData.cart) {
      const productId = cartItem.product_id || cartItem.id;
      const itemSize = cartItem.size || 'Free Size';

      if (!productId) {
        return {
          success: false,
          error: 'A cart item is missing its product reference.',
        };
      }

      const product = dbProducts.find((row) => row.id === productId);
      const inventory = dbInventory.find(
        (row) =>
          row.product_id === productId &&
          row.size === itemSize
      );

      if (!product) {
        return {
          success: false,
          error: `Product reference (${productId}) is no longer available.`,
        };
      }

      if (!inventory) {
        return {
          success: false,
          error: `Size "${itemSize}" for "${product.title}" is unavailable.`,
        };
      }

      const quantity = Number(cartItem.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return {
          success: false,
          error: `Invalid quantity for "${product.title}".`,
        };
      }

      if (Number(inventory.available_quantity) < quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${product.title}" (Size: ${itemSize}). Available: ${inventory.available_quantity}, Requested: ${quantity}`,
        };
      }

      const exactWeightGrams = Number(product.net_weight_grams);

      if (
        !Number.isInteger(exactWeightGrams) ||
        exactWeightGrams <= 0
      ) {
        return {
          success: false,
          error: `Exact physical weight is missing for "${product.title}". Please update this product in Admin before checkout.`,
        };
      }

      const originalUnitPrice = Number(product.price);

      if (!Number.isFinite(originalUnitPrice) || originalUnitPrice < 0) {
        return {
          success: false,
          error: `Invalid server price for "${product.title}".`,
        };
      }

      const { finalPrice, appliedOffer } =
        calculateDiscountedPrice(
          originalUnitPrice,
          activeCampaigns,
          product.category,
          product.id,
          formData.coupon_code,
          cartItem.selected_campaign_id
        );

      const itemOriginalTotal = originalUnitPrice * quantity;
      const itemFinalTotal = Number(finalPrice) * quantity;
      const itemDiscountAmount = Math.max(
        0,
        itemOriginalTotal - itemFinalTotal
      );

      const gstRate = Number(product.gst_rate || 5);
      const taxableValue =
        itemFinalTotal / (1 + gstRate / 100);
      const gstAmount =
        itemFinalTotal - taxableValue;

      const itemWeightKg = exactWeightGrams / 1000;

      serverOriginalTotal += itemOriginalTotal;
      serverSubtotal += itemFinalTotal;
      serverTotalDiscount += itemDiscountAmount;
      totalTax += gstAmount;
      totalActualWeightGrams += exactWeightGrams * quantity;

      if (appliedOffer && !primaryOfferLabel) {
        primaryOfferLabel = appliedOffer.offerLabel;
      }

      verifiedItems.push({
        product_id: product.id,
        product_title: product.title,
        size: itemSize,
        sku:
          inventory.sku ||
          `SKU-${product.id.slice(0, 4)}-${itemSize}`,
        hsn_code: product.hsn_code || '6204',
        gst_rate: gstRate,
        unit_price: Number(finalPrice),
        original_price: originalUnitPrice,
        applied_offer_label: appliedOffer
          ? appliedOffer.offerLabel
          : null,
        discount_reduction: itemDiscountAmount,
        weight_kg: itemWeightKg,
        quantity,
        line_total: itemFinalTotal,
      });
    }

    const totalActualWeightKg =
      totalActualWeightGrams / 1000;

    /*
     * TEMPORARY SHIPPING POLICY
     * -------------------------
     * NimbusPost Partner API v2 serviceability/rate response contract is
     * still awaiting official confirmation.
     *
     * We keep the existing no-free-shipping slab behavior temporarily so
     * today's atomicity/exact-weight fix does not invent undocumented v2
     * fields. This block must be replaced by the verified NimbusPost v2 quote
     * adapter before production shipping is considered final.
     */
    let customerShippingCharge: number;

    if (totalActualWeightGrams <= 500) {
      customerShippingCharge = 80;
    } else if (totalActualWeightGrams <= 1000) {
      customerShippingCharge = 110;
    } else if (totalActualWeightGrams <= 2000) {
      customerShippingCharge = 140;
    } else {
      return {
        success: false,
        error:
          'Weight exceeds the temporary supported shipping range. NimbusPost v2 live pricing will replace this rule after the official API contract is confirmed.',
      };
    }

    // Temporary existing store COD policy.
    // NimbusPost COD pricing will replace this when the verified v2 rate
    // response is integrated.
    const appliedCodCharge =
      paymentMethod === 'COD'
        ? serverSubtotal >= 1000
          ? 50
          : 40
        : 0;

    // Existing adapter is used only for PIN/serviceability gating today.
    // Its implementation will be replaced after NimbusPost confirms v2.
    const shippingAssessment =
      await checkPincodeShippingRate(
        cleanPincode,
        totalActualWeightKg,
        serverSubtotal,
        paymentMethod === 'COD'
          ? 'COD'
          : 'PREPAID'
      );

    if (!shippingAssessment.isServiceable) {
      return {
        success: false,
        error:
          shippingAssessment.message ||
          'Delivery is currently unavailable for this PIN code.',
      };
    }

    const roundedTaxAmount =
      Math.round(totalTax * 100) / 100;

    const grandTotal =
      serverSubtotal +
      customerShippingCharge +
      appliedCodCharge;

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
        p_chargeable_weight_kg:
          Number(shippingAssessment.chargeableWeightKg) ||
          totalActualWeightKg,
        p_actual_courier_cost:
          Number(shippingAssessment.baseCourierCost) || 0,
        p_shipping_charge: customerShippingCharge,
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
            ? `Online UPI (UTR: ${formData.upiRefId || 'N/A'})`
            : paymentMethod,
        grandTotal,
        subtotal: serverSubtotal,
        shippingCharge: customerShippingCharge,
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
          `${totalActualWeightGrams} g`,
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
