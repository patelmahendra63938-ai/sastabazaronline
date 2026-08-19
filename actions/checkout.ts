'use server';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getActiveCampaigns, calculateDiscountedPrice, Campaign } from '@/lib/promotions';
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

export async function createVerifiedOrderAction(formData: CheckoutInput) {
  return await processOrderCheckout(formData);
}

export async function placeOrderAction(formData: CheckoutInput) {
  return await processOrderCheckout(formData);
}

export async function processSecureCheckout(payload: {
  cart: CheckoutCartItem[];
  coupon_code?: string;
  shipping_address?: any;
}) {
  return await processOrderCheckout({
    cart: payload.cart,
    coupon_code: payload.coupon_code,
    address: payload.shipping_address?.address || '',
    city: payload.shipping_address?.city || '',
    pincode: payload.shipping_address?.pincode || '',
    paymentMethod: 'COD',
  });
}

export async function processOrderCheckout(formData: CheckoutInput) {
  try {
    const cookieStore = await cookies();

    // 1. Client A: SSR cookie-based client for authenticated user session
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    // 2. Client B: Separate plain Supabase client using service-role key for backend admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbSupabase = serviceRoleKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        })
      : authSupabase; // Fallback safely if service key is missing in development

    const cleanPincode = (formData.pincode || '').trim();
    if (!cleanPincode || cleanPincode.length !== 6 || !/^\d{6}$/.test(cleanPincode)) {
      return { success: false, error: 'Please enter a valid 6-digit postal PIN code.' };
    }

    if (!formData.cart || formData.cart.length === 0) {
      return { success: false, error: 'Your cart is empty.' };
    }

    const customerName = formData.customer_name || formData.customerName || formData.fullName || 'Customer';
    const customerEmail = formData.customer_email || formData.customerEmail || formData.email || 'customer@sastabazaronline.in';
    const customerPhone = formData.customer_phone || formData.customerPhone || formData.phone || '';
    const rawPaymentMethod = formData.payment_method || formData.paymentMethod || 'COD';
    const paymentMethod = rawPaymentMethod.startsWith('ONLINE') || rawPaymentMethod.startsWith('Online UPI')
      ? 'ONLINE'
      : (rawPaymentMethod === 'UPI_QR' || rawPaymentMethod === 'QR' ? 'UPI_QR' : 'COD');

    // 3. Authoritative Product Catalog Lookup using Admin Database Client
    const productIds = formData.cart.map(c => c.product_id || c.id).filter(Boolean);
    const { data: dbProducts, error: prodErr } = await dbSupabase
      .from('products')
      .select('id, title, price, mrp, category, hsn_code, gst_rate, net_weight')
      .in('id', productIds);

    if (prodErr || !dbProducts) {
      console.error('[SUPABASE_PROD_QUERY_ERROR] Details:', {
        message: prodErr?.message,
        code: prodErr?.code,
        details: prodErr?.details,
        hint: prodErr?.hint,
        queriedIds: productIds
      });
      return { success: false, error: 'Failed to retrieve catalog products from database.' };
    }

    // 4. Authoritative Inventory Variant Lookup
    const { data: dbInventory, error: invErr } = await dbSupabase
      .from('inventory')
      .select('product_id, size, sku, weight_kg, available_quantity, sold_quantity')
      .in('product_id', productIds);

    if (invErr || !dbInventory) {
      console.error('[SUPABASE_INV_QUERY_ERROR] Details:', {
        message: invErr?.message,
        code: invErr?.code,
        details: invErr?.details,
        hint: invErr?.hint,
        queriedIds: productIds
      });
      return { success: false, error: 'Failed to retrieve inventory records.' };
    }

    // 5. Active Promotions Lookup
    const { data: rawPromotions } = await dbSupabase
      .from('promotions')
      .select('*')
      .eq('is_enabled', true);

    const activeCampaigns = getActiveCampaigns((rawPromotions as Campaign[]) || []);

    // 6. Calculate Verified Subtotals, Discounts, and Weight
    let serverOriginalTotal = 0;
    let serverSubtotal = 0;
    let serverTotalDiscount = 0;
    let totalTax = 0;
    let totalActualWeightKg = 0;
    let primaryOfferLabel: string | null = null;
    const verifiedItems = [];

    for (const cartItem of formData.cart) {
      const pId = cartItem.product_id || cartItem.id;
      const itemSize = cartItem.size || 'Free Size';
      const prod = dbProducts.find(p => p.id === pId);
      const inv = dbInventory.find(i => i.product_id === pId && i.size === itemSize);

      if (!prod) return { success: false, error: `Product reference (${pId}) is no longer available.` };
      if (!inv) return { success: false, error: `Size "${itemSize}" for "${prod.title}" is unavailable.` };

      const qty = Math.max(1, Number(cartItem.quantity) || 1);
      if (inv.available_quantity < qty) {
        return {
          success: false,
          error: `Insufficient stock for "${prod.title}" (Size: ${itemSize}). Available: ${inv.available_quantity}, Requested: ${qty}`
        };
      }

      const originalUnitPrice = Number(prod.price || 0);
      const { finalPrice, appliedOffer } = calculateDiscountedPrice(
        originalUnitPrice,
        activeCampaigns,
        prod.category,
        prod.id,
        formData.coupon_code,
        cartItem.selected_campaign_id
      );

      const itemOriginalTotal = originalUnitPrice * qty;
      const itemFinalTotal = finalPrice * qty;
      const itemDiscountAmount = Math.max(0, itemOriginalTotal - itemFinalTotal);

      const gstRate = Number(prod.gst_rate || 5);
      const taxableVal = itemFinalTotal / (1 + gstRate / 100);
      const gstAmount = itemFinalTotal - taxableVal;
      const weightKg = Number(inv.weight_kg || prod.net_weight || 0.5);

      serverOriginalTotal += itemOriginalTotal;
      serverSubtotal += itemFinalTotal;
      serverTotalDiscount += itemDiscountAmount;
      totalTax += gstAmount;
      totalActualWeightKg += weightKg * qty;

      if (appliedOffer && !primaryOfferLabel) {
        primaryOfferLabel = appliedOffer.offerLabel;
      }

      verifiedItems.push({
        product_id: prod.id,
        product_title: prod.title,
        size: itemSize,
        sku: inv.sku || `SKU-${prod.id.slice(0, 4)}-${itemSize}`,
        hsn_code: prod.hsn_code || '6204',
        gst_rate: gstRate,
        unit_price: finalPrice,
        original_price: originalUnitPrice,
        applied_offer_label: appliedOffer ? appliedOffer.offerLabel : null,
        discount_reduction: itemDiscountAmount,
        weight_kg: weightKg,
        quantity: qty,
        line_total: itemFinalTotal
      });
    }

    // 7. Shipping Slab Calculation (NO FREE SHIPPING, exact weight boundaries)
    const chargeableGrams = totalActualWeightKg * 1000;
    let customerShippingCharge = 80;
    if (chargeableGrams <= 500) {
      customerShippingCharge = 80;
    } else if (chargeableGrams <= 1000) {
      customerShippingCharge = 110;
    } else if (chargeableGrams <= 2000) {
      customerShippingCharge = 140;
    } else {
      return { success: false, error: 'Weight exceeds maximum supported 2 kg shipping slab. Please contact support.' };
    }

    // 8. COD Charge Calculation (Separate from delivery)
    // < ₹1,000 -> ₹40, >= ₹1,000 -> ₹50 (including exactly ₹1,000)
    const appliedCodCharge = paymentMethod === 'COD'
      ? (serverSubtotal >= 1000 ? 50 : 40)
      : 0;

    // 9. Final PIN-Code Validation with NimbusPost
    const shippingAssessment = await checkPincodeShippingRate(
      cleanPincode,
      totalActualWeightKg,
      serverSubtotal,
      paymentMethod === 'COD' ? 'COD' : 'PREPAID'
    );

    if (!shippingAssessment.isServiceable) {
      return {
        success: false,
        error: 'Delivery is currently unavailable for this PIN code. Please select an alternative address.'
      };
    }

    const grandTotal = serverSubtotal + customerShippingCharge + appliedCodCharge;
    const currentYear = new Date().getFullYear();
    const orderNumber = `SBZ-${currentYear}-${Math.floor(100000 + Math.random() * 900000)}`;
    const fullAddress = `${formData.address.trim()}, ${formData.city.trim()} - ${cleanPincode}`;

    const shippingAddressJson = {
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state?.trim() || 'Gujarat',
      pincode: cleanPincode
    };

    // 10. Get Authenticated User from Auth Client
    const { data: { user } } = await authSupabase.auth.getUser();

    // 11. Atomic Order Record Creation via Admin Database Client
    const { data: newOrder, error: orderInsertError } = await dbSupabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: user ? user.id : null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        address: fullAddress,
        shipping_address: shippingAddressJson,
        billing_address: shippingAddressJson,
        original_total: serverOriginalTotal,
        discount_total: serverTotalDiscount,
        applied_promotion_name: primaryOfferLabel,
        subtotal: serverSubtotal,
        tax_amount: Math.round(totalTax * 100) / 100,
        actual_weight_kg: totalActualWeightKg,
        chargeable_weight_kg: totalActualWeightKg,
        actual_courier_cost: shippingAssessment.baseCourierCost,
        shipping_charge: customerShippingCharge,
        cod_charge: appliedCodCharge,
        courier_partner: shippingAssessment.courierPartnerName,
        grand_total: grandTotal,
        payment_method: paymentMethod,
        payment_status: paymentMethod.includes('ONLINE') || paymentMethod.includes('QR') ? 'PAID' : 'COD_PENDING',
        order_status: 'CONFIRMED'
      })
      .select('id, order_number')
      .single();

    if (orderInsertError || !newOrder) {
      console.error('Order Insert Error:', orderInsertError);
      return { success: false, error: orderInsertError?.message || 'Order registration failed in database.' };
    }

    // 12. Insert Order Line Items & Decrement Inventory
    for (const item of verifiedItems) {
      await dbSupabase.from('order_items').insert({
        order_id: newOrder.id,
        product_id: item.product_id,
        product_title: item.product_title,
        size: item.size,
        sku: item.sku,
        hsn_code: item.hsn_code,
        gst_rate: item.gst_rate,
        unit_price: item.unit_price,
        mrp: item.original_price,
        applied_offer_label: item.applied_offer_label,
        weight_kg: item.weight_kg,
        quantity: item.quantity,
        line_total: item.line_total
      });

      const invRow = dbInventory.find(i => i.product_id === item.product_id && i.size === item.size);
      if (invRow) {
        await dbSupabase
          .from('inventory')
          .update({
            available_quantity: Math.max(0, invRow.available_quantity - item.quantity),
            sold_quantity: (invRow.sold_quantity || 0) + item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('product_id', item.product_id)
          .eq('size', item.size);

        await dbSupabase.from('inventory_movements').insert({
          product_id: item.product_id,
          size: item.size,
          quantity: -item.quantity,
          movement_type: 'SALE',
          previous_quantity: invRow.available_quantity,
          new_quantity: Math.max(0, invRow.available_quantity - item.quantity),
          notes: `Order: ${orderNumber}`,
          created_by: 'CHECKOUT_ENGINE'
        });
      }
    }

    // 13. Non-Blocking Notifications
    try {
      await dispatchOrderNotifications({
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: fullAddress,
        paymentMethod: paymentMethod === 'ONLINE' ? `Online UPI (UTR: ${formData.upiRefId || 'N/A'})` : paymentMethod,
        grandTotal,
        subtotal: serverSubtotal,
        shippingCharge: customerShippingCharge,
        taxAmount: Math.round(totalTax * 100) / 100,
        items: verifiedItems
      });
    } catch (notifErr) {
      console.warn('Notification non-blocking alert:', notifErr);
    }

    return {
      success: true,
      orderId: newOrder.order_number || orderNumber,
      orderNumber,
      grandTotal,
      customerBreakdown: {
        original_total: serverOriginalTotal,
        offer_label: primaryOfferLabel,
        discount_amount: serverTotalDiscount,
        subtotal: serverSubtotal,
        shipment_weight: `${totalActualWeightKg.toFixed(2)} kg`,
        shipping_charge: `₹${customerShippingCharge.toFixed(2)}`,
        cod_charge: `₹${appliedCodCharge}`,
        total_payable: grandTotal
      }
    };
  } catch (err: any) {
    console.error('[CHECKOUT PROCESSING ERROR]:', err);
    return { success: false, error: err.message || 'An unexpected error occurred during checkout.' };
  }
}