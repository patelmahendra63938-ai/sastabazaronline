'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { checkPincodeShippingRate } from '@/lib/shipping/serviceability';

const NIMBUSPOST_V2_BASE_URL = 'https://api-v2.nimbuspost.com';

export interface CheckPincodeInput {
  pincode: string;
  totalWeightKg: number;
  subtotal: number;
  paymentType?: 'COD' | 'PREPAID';
}

function cleanEnv(value?: string | null) {
  return String(value || '').trim();
}


function formatApiError(value: unknown): string {
  if (value == null) return '';

  if (typeof value === 'string') return value;

  if (value instanceof Error) return value.message;

  if (Array.isArray(value)) {
    return value.map(formatApiError).filter(Boolean).join('; ');
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    const preferred =
      obj.message ??
      obj.error ??
      obj.detail ??
      obj.details ??
      obj.errors;

    if (preferred != null && preferred !== value) {
      const formatted = formatApiError(preferred);
      if (formatted) return formatted;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function toPositiveNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toPhoneNumber(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  const normalized =
    digits.length > 10 ? digits.slice(-10) : digits;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function toPincodeNumber(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 6);
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

async function requireAdminUser() {
  const cookieStore = await cookies();

  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookie writes may be unavailable in some server contexts.
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    throw new Error('Authentication required.');
  }

  const { data: profile, error: profileError } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error('Unable to verify admin access.');
  }

  const role = String(profile?.role || '').toLowerCase();

  if (!['admin', 'super_admin', 'staff'].includes(role)) {
    throw new Error('Admin access required.');
  }

  return user;
}

function getServiceSupabase() {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required for courier booking.'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getNimbusCredentials() {
  const apiKey = cleanEnv(
    process.env.NIMBUSPOST_API_KEY || process.env.COURIER_API_KEY
  );

  const apiSecret = cleanEnv(
    process.env.NIMBUSPOST_API_SECRET || process.env.COURIER_SECRET_KEY
  );

  if (!apiKey || !apiSecret) {
    throw new Error(
      'NimbusPost API credentials are missing. Both API key and API secret are required.'
    );
  }

  if (!apiKey.startsWith('npk_')) {
    throw new Error(
      'NimbusPost API key is invalid for Partner API v2. The API key must start with npk_.'
    );
  }

  return { apiKey, apiSecret };
}

/**
 * Customer-facing PIN/serviceability action.
 * This retains the site's current shipping-rate logic.
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
        err?.message || 'Failed to verify PIN code serviceability.',
    };
  }
}

/**
 * Books an order directly with NimbusPost Partner API v2.
 *
 * Correct Partner API v2:
 *   Base URL: https://api-v2.nimbuspost.com
 *   Endpoint: POST /v2/shipments
 *   Headers:
 *     x-api-key
 *     x-api-secret
 *
 * POST /v2/orders only creates an order and does NOT book a courier.
 * POST /v2/shipments creates + books in one call.
 */
export async function pushOrderToNimbusPost(orderId: string) {
  try {
    await requireAdminUser();

    const { apiKey, apiSecret } = getNimbusCredentials();
    const supabase = getServiceSupabase();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        error: 'Order not found for NimbusPost booking.',
      };
    }

    const status = String(order.order_status || '').toUpperCase();

    if (['CANCELLED', 'CANCELED'].includes(status)) {
      return {
        success: false,
        error: 'Cancelled orders cannot be booked with NimbusPost.',
      };
    }

    // Local duplicate guard before making any remote booking request.
    const { data: existingShipment, error: existingShipmentError } =
      await supabase
        .from('shipments')
        .select('id, awb_number, shipment_status')
        .eq('order_id', order.id)
        .limit(1)
        .maybeSingle();

    if (existingShipmentError) {
      return {
        success: false,
        error: `Unable to verify existing shipment: ${existingShipmentError.message}`,
      };
    }

    if (existingShipment) {
      return {
        success: false,
        error: existingShipment.awb_number
          ? `This order already has shipment AWB ${existingShipment.awb_number}. Duplicate booking blocked.`
          : 'This order already has a shipment record. Duplicate booking blocked.',
      };
    }

    const items = Array.isArray(order.order_items)
      ? order.order_items
      : [];

    if (items.length === 0) {
      return {
        success: false,
        error:
          'This order has no product items. NimbusPost booking has been blocked.',
      };
    }

    const rawAddress =
      typeof order.shipping_address === 'object' &&
      order.shipping_address !== null
        ? order.shipping_address
        : {};

    const shippingAddress = {
      name:
        cleanEnv(rawAddress.name) ||
        cleanEnv(order.customer_name) ||
        'Customer',

      email:
        cleanEnv(rawAddress.email) ||
        cleanEnv(order.customer_email) ||
        'sales@sastabazaronline.in',

      address:
        cleanEnv(rawAddress.address) ||
        cleanEnv(rawAddress.address_line1) ||
        cleanEnv(order.shipping_address) ||
        '',

      address_opt:
        cleanEnv(rawAddress.address_opt) ||
        cleanEnv(rawAddress.address_line2) ||
        cleanEnv(rawAddress.landmark) ||
        '',

      pincode: toPincodeNumber(
        rawAddress.pincode ||
          rawAddress.postal_code ||
          order.shipping_pincode
      ),

      city:
        cleanEnv(rawAddress.city) ||
        cleanEnv(order.shipping_city),

      state:
        cleanEnv(rawAddress.state) ||
        cleanEnv(order.shipping_state),

      country:
        cleanEnv(rawAddress.country) || 'India',

      phone: toPhoneNumber(
        rawAddress.phone ||
          order.customer_phone ||
          order.phone
      ),
    };

    if (
      !shippingAddress.address ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.pincode ||
      !shippingAddress.phone
    ) {
      return {
        success: false,
        error:
          'Order shipping address is incomplete. Address, city, state, pincode and phone are required for NimbusPost.',
      };
    }

    const warehouseId =
      cleanEnv(order.warehouse_id) ||
      cleanEnv(process.env.NIMBUSPOST_WAREHOUSE_ID) ||
      cleanEnv(process.env.COURIER_WAREHOUSE_ID);

    if (!warehouseId) {
      return {
        success: false,
        error:
          'NimbusPost warehouse_id is required. Add NIMBUSPOST_WAREHOUSE_ID to Local and Vercel Environment Variables using your NimbusPost pickup warehouse ID.',
      };
    }

    const paymentMethod = String(
      order.payment_method || ''
    ).toLowerCase();

    const isCod = paymentMethod.includes('cod');

    const orderTotal = Math.max(
      0,
      Number(
        order.grand_total ||
          order.total_amount ||
          0
      ) || 0
    );

    const packageWeightKg = toPositiveNumber(
      order.chargeable_weight_kg ||
        order.actual_weight_kg ||
        order.package_weight,
      0.5
    );

    const packageLengthCm = toPositiveNumber(
      order.package_length_cm ||
        order.length_cm,
      15
    );

    const packageWidthCm = toPositiveNumber(
      order.package_width_cm ||
        order.width_cm ||
        order.breadth_cm,
      12
    );

    const packageHeightCm = toPositiveNumber(
      order.package_height_cm ||
        order.height_cm,
      5
    );

    const nimbusItems = items.map((item: any) => ({
      name:
        cleanEnv(item.product_title) ||
        'ADHYEY BROTHERS Product',
      qty: Math.max(1, Number(item.quantity) || 1),
      price: Math.max(0, Number(item.unit_price) || 0),
      sku:
        cleanEnv(item.sku) ||
        `SKU-${String(item.product_id || '').slice(0, 8)}`,
      hsn_code: cleanEnv(item.hsn_code) || undefined,
      tax_rate:
        Number.isFinite(Number(item.gst_rate))
          ? Number(item.gst_rate)
          : undefined,
    }));

    const payload: Record<string, any> = {
      order_number:
        cleanEnv(order.order_number) ||
        `ORD-${String(order.id).slice(0, 8)}`,

      order_type: 'b2c',

      payment_mode: isCod ? 'cod' : 'prepaid',

      warehouse_id: warehouseId,

      shipping_address: shippingAddress,

      items: nimbusItems,

      package: {
        weight: packageWeightKg,
        length: packageLengthCm,
        width: packageWidthCm,
        height: packageHeightCm,
      },
    };

    if (isCod) {
      payload.order_collectable_amount = orderTotal;
    }

    const response = await fetch(
      `${NIMBUSPOST_V2_BASE_URL}/v2/shipments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-api-key': apiKey,
          'x-api-secret': apiSecret,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      }
    );

    const rawText = await response.text();

    let result: any = null;

    try {
      result = rawText ? JSON.parse(rawText) : null;
    } catch {
      result = null;
    }

    if (!response.ok || result?.success === false) {
      const validationDetails =
        result?.errors ||
        result?.details ||
        result?.data?.errors;

      const validationText = validationDetails
        ? ` ${JSON.stringify(validationDetails)}`
        : '';

      const primaryError =
        formatApiError(result?.message) ||
        formatApiError(result?.error) ||
        (rawText && rawText !== '[object Object]'
          ? rawText
          : '') ||
        `NimbusPost returned HTTP ${response.status}.`;

      const validationError =
        formatApiError(validationDetails);

      throw new Error(
        validationError
          ? `${primaryError} | Details: ${validationError}`
          : primaryError
      );
    }

    const data =
      result?.data ||
      result?.result ||
      result ||
      {};

    const awbNumber =
      data?.awb ||
      data?.awb_number ||
      data?.awb_no ||
      data?.shipment?.awb ||
      data?.shipment?.awb_number;

    if (!awbNumber) {
      throw new Error(
        `NimbusPost responded successfully but no AWB was returned. Remote response: ${formatApiError(
          data
        ).slice(0, 1200)}`
      );
    }

    const courierName =
      data?.courier_name ||
      data?.courier?.name ||
      data?.courier ||
      data?.shipment?.courier_name ||
      'NimbusPost Assigned Courier';

    const labelUrl =
      data?.label_url ||
      data?.label ||
      data?.shipment?.label_url ||
      '';

    const shippingCost = Number(
      data?.shipping_charge ||
        data?.shipping_charges ||
        data?.freight_charge ||
        data?.freight_charges ||
        data?.rate ||
        0
    ) || 0;

    const { data: savedShipment, error: saveError } =
      await supabase
        .from('shipments')
        .insert({
          order_id: order.id,
          awb_number: String(awbNumber),
          shipment_status: 'COURIER_ASSIGNED',
          pickup_status: 'REQUESTED',
          package_weight: packageWeightKg,
          tracking_url: `https://nimbuspost.com/track?awb=${encodeURIComponent(
            String(awbNumber)
          )}`,
          shipping_label_url: labelUrl,
          shipping_cost: shippingCost,
        })
        .select()
        .single();

    if (saveError) {
      throw new Error(
        `NimbusPost created AWB ${awbNumber}, but the website could not save the local shipment record: ${saveError.message}`
      );
    }

    if (savedShipment?.id) {
      const { error: trackingError } =
        await supabase
          .from('shipment_tracking_events')
          .insert({
            shipment_id: savedShipment.id,
            status: 'COURIER_ASSIGNED',
            location: 'Surat Fulfillment Hub',
            description: `AWB ${awbNumber} generated via ${courierName}. Ready for pickup.`,
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
        .update({
          order_status: 'PACKED',
        })
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
      courier: String(courierName),
      labelUrl: String(labelUrl || ''),
      shippingCost,
      itemCount: nimbusItems.length,
      nimbusResponse: data,
    };
  } catch (err: any) {
    console.error(
      'NimbusPost v2 booking error:',
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        'NimbusPost API v2 communication failed.',
    };
  }
}
