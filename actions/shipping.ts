'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkPincodeShippingRate } from '@/lib/shipping/serviceability';

const NIMBUSPOST_OLD_API_BASE =
  'https://ship.nimbuspost.com/api';

export interface CheckPincodeInput {
  pincode: string;
  totalWeightKg: number;
  subtotal: number;
  paymentType?: 'COD' | 'PREPAID';
}

function cleanEnv(value?: string | null) {
  return String(value || '').trim();
}

function normalizeApiUrl(value?: string | null) {
  const raw = cleanEnv(value);

  if (!raw) {
    return `${NIMBUSPOST_OLD_API_BASE}/orders/autoship_order`;
  }

  return raw.replace(/\/+$/, '');
}

/**
 * Customer-facing PIN/serviceability action.
 */
export async function verifyPincodeAndGetShippingAction(
  input: CheckPincodeInput
) {
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
      message: result.message,
    };
  } catch (err: any) {
    return {
      success: false,
      isServiceable: false,
      customerShippingCharge: 0,
      displayWeight: '0.50 kg',
      error:
        err?.message ||
        'Failed to verify PIN code serviceability.',
    };
  }
}

/**
 * Admin/backend NimbusPost booking action.
 *
 * This version uses NimbusPost's V1 API-key authentication style:
 *   NP-API-KEY: <key>
 *
 * It deliberately DOES NOT send the raw key as a Bearer token.
 */
export async function pushOrderToNimbusPost(orderId: string) {
  try {
    const apiKey = cleanEnv(
      process.env.NIMBUSPOST_API_KEY ||
        process.env.COURIER_API_KEY
    );

    const apiSecret = cleanEnv(
      process.env.NIMBUSPOST_API_SECRET ||
        process.env.COURIER_SECRET_KEY
    );

    const apiUrl = normalizeApiUrl(
      process.env.COURIER_API_URL
    );

    if (!apiKey) {
      return {
        success: false,
        error:
          'NimbusPost API key is missing. Configure NIMBUSPOST_API_KEY or COURIER_API_KEY.',
      };
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
        },
      }
    );

    const { data: order, error: orderErr } =
      await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

    if (orderErr || !order) {
      return {
        success: false,
        error:
          'Order not found for shipping dispatch.',
      };
    }

    const orderItems = Array.isArray(order.order_items)
      ? order.order_items
      : [];

    if (orderItems.length === 0) {
      return {
        success: false,
        error:
          'This order has no product line items. NimbusPost booking is blocked.',
      };
    }

    const shippingAddress =
      typeof order.shipping_address === 'object' &&
      order.shipping_address !== null
        ? order.shipping_address
        : {
            address:
              order.shipping_address ||
              'Address provided at checkout',
            city: 'Surat',
            state: 'Gujarat',
            pincode:
              cleanEnv(
                process.env.NIMBUSPOST_PICKUP_PINCODE
              ) || '395004',
          };

    const actualWeightKg = Number(
      order.chargeable_weight_kg ||
        order.actual_weight_kg ||
        0.5
    );

    const weightInGrams = Math.max(
      100,
      Math.round(actualWeightKg * 1000)
    );

    const courierItems = orderItems.map((item: any) => {
      const quantity = Math.max(
        1,
        Number(item.quantity) || 1
      );

      const unitPrice = Math.max(
        0,
        Number(item.unit_price) || 0
      );

      const gstRate = Math.max(
        0,
        Number(item.gst_rate) || 0
      );

      const hsnCode = String(
        item.hsn_code || ''
      ).trim();

      return {
        name:
          String(item.product_title || '').trim() ||
          'ADHYEY BROTHERS Product',
        qty: quantity,
        quantity,
        price: unitPrice,
        unit_price: unitPrice,
        discount: 0,
        tax_rate: gstRate,
        gst_rate: gstRate,
        sku:
          String(item.sku || '').trim() ||
          `SKU-${String(item.product_id || '').slice(
            0,
            8
          )}`,
        hsn: hsnCode,
        hsn_code: hsnCode,
      };
    });

    const payload = {
      order_number:
        order.order_number ||
        `ORD-${String(order.id).slice(0, 8)}`,

      shipping_customer_name:
        order.customer_name || 'Customer',

      shipping_phone:
        order.customer_phone ||
        order.phone ||
        '9999999999',

      shipping_email:
        order.customer_email ||
        'sales@sastabazaronline.in',

      shipping_address:
        shippingAddress.address,

      shipping_city:
        shippingAddress.city,

      shipping_state:
        shippingAddress.state || 'Gujarat',

      shipping_pincode:
        shippingAddress.pincode,

      shipping_country: 'India',

      order_items: courierItems,

      payment_type: String(order.payment_method || '')
        .toUpperCase()
        .includes('COD')
        ? 'COD'
        : 'Prepaid',

      total_amount: Number(
        order.grand_total ||
          order.total_amount ||
          0
      ),

      weight: weightInGrams,
      length: 15,
      breadth: 12,
      height: 5,

      pickup_pincode:
        cleanEnv(
          process.env.NIMBUSPOST_PICKUP_PINCODE
        ) || undefined,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'NP-API-KEY': apiKey,
    };

    // Preserve existing secret support only as an auxiliary header.
    // NimbusPost's published V1 SDK authenticates with NP-API-KEY.
    if (apiSecret) {
      headers['NP-API-SECRET'] = apiSecret;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const rawText = await response.text();

    let result: any = null;

    try {
      result = rawText
        ? JSON.parse(rawText)
        : null;
    } catch {
      result = null;
    }

    if (
      !response.ok ||
      result?.status === false ||
      result?.success === false
    ) {
      throw new Error(
        result?.message ||
          result?.error ||
          rawText ||
          `NimbusPost booking failed with HTTP ${response.status}.`
      );
    }

    const data =
      result?.data ||
      result?.result ||
      result ||
      {};

    const awbNumber =
      data?.awb_number ||
      data?.awb ||
      data?.awbno ||
      data?.awb_no ||
      data?.shipment?.awb_number ||
      data?.shipment?.awb;

    if (!awbNumber) {
      throw new Error(
        'NimbusPost accepted the booking request but did not return an AWB number. Nothing was saved locally.'
      );
    }

    const labelUrl =
      data?.label_url ||
      data?.label ||
      data?.shipment?.label_url ||
      '';

    const courierPartnerName =
      data?.courier_name ||
      data?.courier ||
      data?.courier_partner ||
      data?.shipment?.courier_name ||
      'NimbusPost Assigned Courier';

    const actualCourierCost = Number(
      data?.freight_charges ||
        data?.shipping_charges ||
        data?.courier_charge ||
        data?.rate ||
        order.actual_courier_cost ||
        0
    );

    const { data: shipment, error: shipErr } =
      await supabase
        .from('shipments')
        .insert({
          order_id: order.id,
          awb_number: String(awbNumber),
          shipment_status: 'COURIER_ASSIGNED',
          pickup_status: 'REQUESTED',
          package_weight: actualWeightKg,
          tracking_url: `https://nimbuspost.com/track?awb=${encodeURIComponent(
            String(awbNumber)
          )}`,
          shipping_label_url: labelUrl,
          shipping_cost: actualCourierCost,
        })
        .select()
        .single();

    if (shipErr) {
      throw new Error(
        `NimbusPost AWB ${awbNumber} was created, but local shipment save failed: ${shipErr.message}`
      );
    }

    if (shipment?.id) {
      const { error: trackingError } =
        await supabase
          .from('shipment_tracking_events')
          .insert({
            shipment_id: shipment.id,
            status: 'COURIER_ASSIGNED',
            location: 'Surat Fulfillment Hub',
            description: `AWB ${awbNumber} generated via ${courierPartnerName}. Ready for pickup dispatch.`,
            event_time: new Date().toISOString(),
            source: 'COURIER_API',
          });

      if (trackingError) {
        console.warn(
          'Shipment tracking event warning:',
          trackingError.message
        );
      }
    }

    const { error: orderUpdateError } =
      await supabase
        .from('orders')
        .update({ order_status: 'PACKED' })
        .eq('id', order.id);

    if (orderUpdateError) {
      console.warn(
        'Order status update warning:',
        orderUpdateError.message
      );
    }

    return {
      success: true,
      awb: String(awbNumber),
      labelUrl,
      courier: courierPartnerName,
      itemCount: courierItems.length,
      shippingCost: actualCourierCost,
    };
  } catch (err: any) {
    console.error(
      'NimbusPost Execution Error:',
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        'NimbusPost API communication failed.',
    };
  }
}
