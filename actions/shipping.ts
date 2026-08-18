'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkPincodeShippingRate } from '@/lib/shipping/serviceability';

export interface CheckPincodeInput {
  pincode: string;
  totalWeightKg: number;
  subtotal: number;
  paymentType?: 'COD' | 'PREPAID';
}

/**
 * 1. Customer-Facing Action:
 * Verifies PIN code serviceability and dynamically calculates automated shipping charges.
 */
export async function verifyPincodeAndGetShippingAction(input: CheckPincodeInput) {
  try {
    const result = await checkPincodeShippingRate(
      input.pincode,
      input.totalWeightKg,
      input.subtotal,
      input.paymentType || 'COD'
    );

    return {
      success: true,
      isServiceable: result.isServiceable,
      courierPartnerName: result.courierPartnerName,
      estimatedDeliveryDays: result.estimatedDeliveryDays,
      customerShippingCharge: result.customerShippingCharge,
      displayWeight: result.displayWeight,
      message: result.message
    };
  } catch (err: any) {
    return {
      success: false,
      isServiceable: false,
      customerShippingCharge: 0,
      displayWeight: '0.50 kg',
      error: err.message || 'Failed to verify PIN code serviceability.'
    };
  }
}

/**
 * 2. Admin / Backend Action:
 * Books confirmed order consignments on NimbusPost, generates AWB tracking, and stores shipment records.
 */
export async function pushOrderToNimbusPost(orderId: string) {
  const apiKey = process.env.COURIER_API_KEY || process.env.NIMBUSPOST_API_KEY;
  const apiUrl = process.env.COURIER_API_URL || 'https://api.nimbuspost.com/v1/shipment/order';

  if (!apiKey) {
    return { success: false, error: 'NimbusPost API Key is missing in .env.local.' };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  // 1. Fetch Order and Itemized Line Items
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return { success: false, error: 'Order not found for shipping dispatch.' };
  }

  // 2. Format Destination Address & Dimensions
  const shippingAddress = typeof order.shipping_address === 'object' && order.shipping_address !== null
    ? order.shipping_address
    : {
        address: order.shipping_address || 'Address provided at checkout',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395007'
      };

  // Convert weight in KG to Grams for courier payload
  const actualWeightKg = Number(order.chargeable_weight_kg || order.actual_weight_kg || 0.5);
  const weightInGrams = Math.max(100, Math.round(actualWeightKg * 1000));

  const payload = {
    order_number: order.order_number || `ORD-${order.id.slice(0, 8)}`,
    shipping_customer_name: order.customer_name || 'Customer',
    shipping_phone: order.customer_phone || order.phone || '9999999999',
    shipping_email: order.customer_email || 'sales@sastabazaronline.in',
    shipping_address: shippingAddress.address,
    shipping_city: shippingAddress.city,
    shipping_state: shippingAddress.state || 'Gujarat',
    shipping_pincode: shippingAddress.pincode,
    shipping_country: 'India',
    order_items: (order.order_items || []).map((item: any) => ({
      name: item.product_title || 'Apparel / Home Item',
      qty: item.quantity || 1,
      price: item.unit_price || 0,
      sku: item.sku || `SKU-${item.product_id?.slice(0, 4)}`
    })),
    payment_type: String(order.payment_method || '').toUpperCase().includes('COD') ? 'COD' : 'Prepaid',
    total_amount: Number(order.grand_total || order.total_amount || 0),
    weight: weightInGrams,
    length: 15,
    breadth: 12,
    height: 5
  };

  try {
    // 3. Dispatch Consignment to NimbusPost API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'api-key': apiKey,
        'api-secret': process.env.COURIER_SECRET_KEY || process.env.NIMBUSPOST_API_SECRET || ''
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || result.status === false) {
      throw new Error(result.message || 'NimbusPost shipment booking failed.');
    }

    const awbNumber = result.data?.awb_number || result.data?.awb || `NP-${Date.now().toString().slice(-8)}`;
    const labelUrl = result.data?.label_url || '';
    const courierPartnerName = result.data?.courier_name || 'NimbusPost Assigned Courier';

    // 4. Record into Supabase `shipments` Table
    const { data: shipment, error: shipErr } = await supabase
      .from('shipments')
      .insert({
        order_id: order.id,
        awb_number: awbNumber,
        shipment_status: 'COURIER_ASSIGNED',
        pickup_status: 'REQUESTED',
        package_weight: actualWeightKg,
        tracking_url: `https://nimbuspost.com/track?awb=${awbNumber}`,
        shipping_label_url: labelUrl,
        shipping_cost: Number(order.actual_courier_cost || 45)
      })
      .select()
      .single();

    if (shipErr) {
      console.warn('Shipment record warning:', shipErr.message);
    }

    // 5. Record Initial Event in `shipment_tracking_events`
    if (shipment?.id) {
      await supabase.from('shipment_tracking_events').insert({
        shipment_id: shipment.id,
        status: 'COURIER_ASSIGNED',
        location: 'Surat Fulfillment Hub',
        description: `AWB ${awbNumber} generated via ${courierPartnerName}. Ready for pickup dispatch.`,
        event_time: new Date().toISOString(),
        source: 'COURIER_API'
      });
    }

    // 6. Transition Order Status to PACKED
    await supabase
      .from('orders')
      .update({ order_status: 'PACKED' })
      .eq('id', order.id);

    return {
      success: true,
      awb: awbNumber,
      labelUrl: labelUrl,
      courier: courierPartnerName
    };

  } catch (err: any) {
    console.error('NimbusPost Execution Error:', err);
    return { success: false, error: err.message || 'Courier API communication failed.' };
  }
}