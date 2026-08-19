'use server';

import { createServerClient } from '@supabase/ssr';
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
  location_metadata?: any;
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
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

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
    const paymentMethod: 'COD' | 'ONLINE' = 
      rawPaymentMethod.startsWith('ONLINE') || rawPaymentMethod.startsWith('Online UPI') || rawPaymentMethod === 'UPI_QR' || rawPaymentMethod === 'QR'
        ? 'ONLINE'
        : 'COD';

    // 1. Authoritative Server-Side Pricing, Weight, Coupon & Logistics Evaluation
    const formattedCart = formData.cart.map(item => ({
      id: item.id,
      product_id: item.product_id || item.id || '',
      size: item.size || 'Free Size',
      quantity: Number(item.quantity) || 1,
      selected_campaign_id: item.selected_campaign_id
    }));

    const calculation = await calculateAuthoritativeOrderPricing({
      pincode: cleanPincode,
      paymentMethod,
      cart: formattedCart,
      couponCode: formData.coupon_code
    });

    if (!calculation.success || !calculation.data) {
      return { 
        success: false, 
        error: calculation.error || 'Unable to compute order pricing and delivery availability.' 
      };
    }

    const p = calculation.data;
    const currentYear = new Date().getFullYear();
    const orderNumber = `SBZ-${currentYear}-${Math.floor(100000 + Math.random() * 900000)}`;
    const fullAddress = `${formData.address.trim()}, ${formData.city.trim()} - ${cleanPincode}`;

    const shippingAddressJson = {
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state?.trim() || 'Gujarat',
      pincode: cleanPincode,
      country: 'India'
    };

    // 2. Immutable Frozen Pricing Snapshot
    const pricingSnapshot = {
      rule_version: p.ruleVersion,
      original_total: p.originalProductPriceTotal,
      discount_total: p.discountDeductionAmount,
      applied_promotion: p.primaryOfferName,
      subtotal: p.discountedSubtotal,
      actual_weight_kg: p.totalActualWeightKg,
      chargeable_weight_kg: p.chargeableWeightKg,
      courier_base_rate: p.courierBaseRate,
      courier_risk_adjustment: p.courierRiskAdjustment,
      courier_multiplier: p.courierMultiplier,
      courier_charge: p.customerCourierCharge,
      is_free_shipping: p.isFreeShipping,
      free_shipping_threshold: p.freeShippingThreshold,
      cod_charge: p.codCharge,
      grand_total: p.grandTotal,
      payment_method: paymentMethod,
      upi_ref_id: formData.upiRefId || null,
      calculated_at: new Date().toISOString()
    };

    // 3. Atomic Database Insertion & Concurrency Locking via RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('place_order_atomic', {
      p_order_number: orderNumber,
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone,
      p_shipping_address: shippingAddressJson,
      p_subtotal: p.discountedSubtotal,
      p_discount_total: p.discountDeductionAmount,
      p_applied_promotion: p.primaryOfferName,
      p_tax_amount: 0,
      p_actual_weight_kg: p.totalActualWeightKg,
      p_chargeable_weight_kg: p.chargeableWeightKg,
      p_courier_base_rate: p.courierBaseRate,
      p_courier_risk_adjustment: p.courierRiskAdjustment,
      p_shipping_charge: p.customerCourierCharge,
      p_cod_charge: p.codCharge,
      p_grand_total: p.grandTotal,
      p_payment_method: paymentMethod,
      p_pricing_snapshot: pricingSnapshot,
      p_location_metadata: formData.location_metadata || null,
      p_items: p.verifiedItems
    });

    if (rpcErr) {
      console.error('[ATOMIC ORDER ERROR]:', rpcErr);
      return { success: false, error: rpcErr.message || 'Failed to place order.' };
    }

    // 4. Non-Blocking Notifications Dispatch
    try {
      await dispatchOrderNotifications({
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: fullAddress,
        paymentMethod: paymentMethod === 'ONLINE' ? `Online UPI (UTR: ${formData.upiRefId || 'N/A'})` : 'Cash on Delivery',
        grandTotal: p.grandTotal,
        subtotal: p.discountedSubtotal,
        shippingCharge: p.customerCourierCharge,
        taxAmount: 0,
        items: p.verifiedItems
      });
    } catch (notifErr) {
      console.warn('Background notification error (non-fatal):', notifErr);
    }

    return {
      success: true,
      orderId: rpcRes?.order_id || orderNumber,
      orderNumber,
      grandTotal: p.grandTotal,
      customerBreakdown: {
        original_total: p.originalProductPriceTotal,
        offer_label: p.primaryOfferName,
        discount_amount: p.discountDeductionAmount,
        subtotal: p.discountedSubtotal,
        shipment_weight: p.displayWeight,
        courier_charge: p.customerCourierCharge === 0 ? 'FREE' : `₹${p.customerCourierCharge.toFixed(2)}`,
        cod_charge: p.codCharge > 0 ? `₹${p.codCharge.toFixed(2)}` : '₹0.00',
        total_payable: p.grandTotal
      }
    };
  } catch (err: any) {
    console.error('[CHECKOUT PROCESSING ERROR]:', err);
    return { success: false, error: err.message || 'An unexpected error occurred during checkout.' };
  }
}