'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
      obj.message ?? obj.error ?? obj.detail ?? obj.details ?? obj.errors;

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
  const normalized = digits.length > 10 ? digits.slice(-10) : digits;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function toPincodeNumber(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 6);
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function findDeepValue(
  value: unknown,
  keys: string[],
  maxDepth = 8
): unknown {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));

  function walk(node: unknown, depth: number): unknown {
    if (depth > maxDepth || node == null) return undefined;

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item, depth + 1);
        if (found !== undefined && found !== null && found !== '') return found;
      }
      return undefined;
    }

    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;

      for (const [key, val] of Object.entries(obj)) {
        if (
          wanted.has(key.toLowerCase()) &&
          val !== undefined &&
          val !== null &&
          val !== ''
        ) {
          return val;
        }
      }

      for (const val of Object.values(obj)) {
        const found = walk(val, depth + 1);
        if (found !== undefined && found !== null && found !== '') return found;
      }
    }

    return undefined;
  }

  return walk(value, 0);
}

function extractNimbusBookingInfo(payload: unknown) {
  const awb = findDeepValue(payload, [
    'awb',
    'awb_number',
    'awb_no',
    'awbnumber',
    'tracking_number',
    'tracking_no',
  ]);

  const courier = findDeepValue(payload, [
    'courier_name',
    'courier',
    'courier_partner',
    'courier_partner_name',
    'courierName',
  ]);

  const remoteOrderId = findDeepValue(payload, [
    'order_id',
    'orderId',
    'id',
  ]);

  const shipmentId = findDeepValue(payload, [
    'shipment_id',
    'shipmentId',
  ]);

  const labelUrl = findDeepValue(payload, [
    'label_url',
    'shipping_label_url',
    'label',
  ]);

  const shippingCost = findDeepValue(payload, [
    'shipping_charge',
    'shipping_charges',
    'freight_charge',
    'freight_charges',
    'rate',
    'courier_charge',
  ]);

  return {
    awb: awb ? String(awb) : '',
    courier: courier ? String(courier) : '',
    remoteOrderId: remoteOrderId ? String(remoteOrderId) : '',
    shipmentId: shipmentId ? String(shipmentId) : '',
    labelUrl: labelUrl ? String(labelUrl) : '',
    shippingCost:
      shippingCost !== undefined && shippingCost !== null
        ? Number(shippingCost) || 0
        : 0,
  };
}

function extractOrderNumber(payload: unknown) {
  const value = findDeepValue(payload, [
    'order_number',
    'order_no',
    'merchant_order_id',
    'merchant_order_number',
    'reference_order_id',
  ]);
  return value ? String(value).trim() : '';
}

function isAlreadyExistsNimbusError(value: unknown) {
  const text = formatApiError(value).toLowerCase();
  return (
    text.includes('already exists') ||
    text.includes('already exist') ||
    text.includes('duplicate order') ||
    text.includes('order exists')
  );
}

async function fetchNimbusOrderById(
  remoteOrderId: string,
  apiKey: string,
  apiSecret: string
) {
  const response = await fetch(
    `${NIMBUSPOST_V2_BASE_URL}/v2/orders/${encodeURIComponent(remoteOrderId)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': apiKey,
        'x-api-secret': apiSecret,
      },
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
    throw new Error(
      formatApiError(result?.message) ||
        formatApiError(result?.error) ||
        rawText ||
        `NimbusPost order sync returned HTTP ${response.status}.`
    );
  }

  return result;
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

  if (userError || !user) throw new Error('Authentication required.');

  const { data: profile, error: profileError } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw new Error('Unable to verify admin access.');

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
    auth: { persistSession: false, autoRefreshToken: false },
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

async function findBookingInfoInWebhookHistory(
  supabase: SupabaseClient,
  orderNumber: string
) {
  const { data, error } = await supabase
    .from('nimbuspost_webhook_deliveries')
    .select('payload, received_at')
    .order('received_at', { ascending: false })
    .limit(250);

  if (error) {
    console.warn('NimbusPost webhook recovery lookup warning:', error.message);
    return null;
  }

  const normalizedOrderNumber = orderNumber.trim().toLowerCase();
  for (const row of data || []) {
    const payloadOrderNumber = extractOrderNumber(row.payload).toLowerCase();
    if (!payloadOrderNumber || payloadOrderNumber !== normalizedOrderNumber) continue;

    const info = extractNimbusBookingInfo(row.payload);
    if (info.awb) return info;
  }

  return null;
}

async function saveRecoveredNimbusShipment(input: {
  supabase: SupabaseClient;
  orderId: string;
  packageWeightKg: number;
  bookingInfo: ReturnType<typeof extractNimbusBookingInfo>;
  sourceDescription: string;
}) {
  const { supabase, orderId, packageWeightKg, bookingInfo, sourceDescription } = input;
  const awbNumber = bookingInfo.awb;

  if (!awbNumber) {
    return { success: false as const, error: 'NimbusPost AWB is still unavailable.' };
  }

  const { data: existingShipment, error: existingError } = await supabase
    .from('shipments')
    .select('id, awb_number, shipment_status')
    .eq('order_id', orderId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return {
      success: false as const,
      error: `Unable to verify local shipment before sync: ${existingError.message}`,
    };
  }

  if (existingShipment) {
    return {
      success: true as const,
      awb: String(existingShipment.awb_number || awbNumber),
      courier: bookingInfo.courier || 'NimbusPost Assigned Courier',
      alreadySynced: true,
      shipmentId: existingShipment.id,
    };
  }

  const labelUrl = bookingInfo.labelUrl || '';
  const shippingCost = bookingInfo.shippingCost || 0;

  const { data: savedShipment, error: saveError } = await supabase
    .from('shipments')
    .insert({
      order_id: orderId,
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

  if (saveError || !savedShipment) {
    return {
      success: false as const,
      error: `NimbusPost AWB ${awbNumber} was found, but the website could not save the local shipment record: ${saveError?.message || 'Unknown database error.'}`,
    };
  }

  const courierName = bookingInfo.courier || 'NimbusPost Assigned Courier';
  const { error: trackingError } = await supabase
    .from('shipment_tracking_events')
    .insert({
      shipment_id: savedShipment.id,
      status: 'COURIER_ASSIGNED',
      location: 'Surat Fulfillment Hub',
      description: `${sourceDescription} AWB ${awbNumber} via ${courierName}. Ready for pickup.`,
      event_time: new Date().toISOString(),
      source: 'COURIER_API',
    });

  if (trackingError) {
    console.warn('Recovered shipment tracking event warning:', trackingError.message);
  }

  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({ order_status: 'PACKED' })
    .eq('id', orderId);

  if (orderUpdateError) {
    console.warn('Recovered shipment order status warning:', orderUpdateError.message);
  }

  return {
    success: true as const,
    awb: String(awbNumber),
    courier: String(courierName),
    alreadySynced: false,
    shipmentId: savedShipment.id,
  };
}

async function recoverExistingNimbusShipment(input: {
  supabase: SupabaseClient;
  orderId: string;
  orderNumber: string;
  packageWeightKg: number;
  apiKey: string;
  apiSecret: string;
  duplicatePayload?: unknown;
}) {
  const {
    supabase,
    orderId,
    orderNumber,
    packageWeightKg,
    apiKey,
    apiSecret,
    duplicatePayload,
  } = input;

  const duplicateInfo = extractNimbusBookingInfo(duplicatePayload);
  if (duplicateInfo.awb) {
    return saveRecoveredNimbusShipment({
      supabase,
      orderId,
      packageWeightKg,
      bookingInfo: duplicateInfo,
      sourceDescription: 'Recovered from NimbusPost duplicate response.',
    });
  }

  // Safe read-only lookup. NimbusPost's duplicate message identifies the merchant
  // order number as an existing Order ID, so try that identifier without making
  // any second create/booking request.
  try {
    const remote = await fetchNimbusOrderById(orderNumber, apiKey, apiSecret);
    const remoteInfo = extractNimbusBookingInfo(
      remote?.data || remote?.result || remote
    );

    if (remoteInfo.awb) {
      return saveRecoveredNimbusShipment({
        supabase,
        orderId,
        packageWeightKg,
        bookingInfo: remoteInfo,
        sourceDescription: 'Synced from existing NimbusPost order.',
      });
    }
  } catch (error) {
    console.warn('NimbusPost existing-order read-back warning:', formatApiError(error));
  }

  const webhookInfo = await findBookingInfoInWebhookHistory(supabase, orderNumber);
  if (webhookInfo?.awb) {
    return saveRecoveredNimbusShipment({
      supabase,
      orderId,
      packageWeightKg,
      bookingInfo: webhookInfo,
      sourceDescription: 'Recovered from verified NimbusPost webhook history.',
    });
  }

  return {
    success: false as const,
    error:
      'This order already exists in NimbusPost, but its AWB could not be recovered yet. Do not book it again. Use the existing NimbusPost order/AWB and then sync or enter the AWB manually.',
  };
}

export async function syncExistingNimbusPostShipment(orderId: string) {
  try {
    await requireAdminUser();
    const { apiKey, apiSecret } = getNimbusCredentials();
    const supabase = getServiceSupabase();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, order_status, chargeable_weight_kg, actual_weight_kg, package_weight')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found for NimbusPost sync.' };
    }

    const status = String(order.order_status || '').toUpperCase();
    if (['CANCELLED', 'CANCELED'].includes(status)) {
      return { success: false, error: 'Cancelled orders cannot be synced for shipping.' };
    }

    const { data: existingShipment } = await supabase
      .from('shipments')
      .select('id, awb_number')
      .eq('order_id', order.id)
      .limit(1)
      .maybeSingle();

    if (existingShipment?.awb_number) {
      return {
        success: true,
        awb: String(existingShipment.awb_number),
        courier: 'Courier Assigned',
        alreadySynced: true,
      };
    }

    const orderNumber = cleanEnv(order.order_number);
    if (!orderNumber) {
      return { success: false, error: 'Order number is missing; NimbusPost sync cannot continue.' };
    }

    const packageWeightKg = toPositiveNumber(
      order.chargeable_weight_kg || order.actual_weight_kg || order.package_weight,
      0.5
    );

    return await recoverExistingNimbusShipment({
      supabase,
      orderId: order.id,
      orderNumber,
      packageWeightKg,
      apiKey,
      apiSecret,
    });
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'NimbusPost existing shipment sync failed.',
    };
  }
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
      error: err?.message || 'Failed to verify PIN code serviceability.',
    };
  }
}

/**
 * Books an order directly with NimbusPost Partner API v2.
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
      return { success: false, error: 'Order not found for NimbusPost booking.' };
    }

    const status = String(order.order_status || '').toUpperCase();
    if (['CANCELLED', 'CANCELED'].includes(status)) {
      return { success: false, error: 'Cancelled orders cannot be booked with NimbusPost.' };
    }

    const { data: existingShipment, error: existingShipmentError } = await supabase
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

    const items = Array.isArray(order.order_items) ? order.order_items : [];
    if (items.length === 0) {
      return {
        success: false,
        error: 'This order has no product items. NimbusPost booking has been blocked.',
      };
    }

    const rawAddress =
      typeof order.shipping_address === 'object' && order.shipping_address !== null
        ? order.shipping_address
        : {};

    const shippingAddress = {
      name: cleanEnv(rawAddress.name) || cleanEnv(order.customer_name) || 'Customer',
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
        rawAddress.pincode || rawAddress.postal_code || order.shipping_pincode
      ),
      city: cleanEnv(rawAddress.city) || cleanEnv(order.shipping_city),
      state: cleanEnv(rawAddress.state) || cleanEnv(order.shipping_state),
      country: cleanEnv(rawAddress.country) || 'India',
      phone: toPhoneNumber(
        rawAddress.phone || order.customer_phone || order.phone
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

    const paymentMethod = String(order.payment_method || '').toLowerCase();
    const isCod = paymentMethod.includes('cod');
    const orderTotal = Math.max(
      0,
      Number(order.grand_total || order.total_amount || 0) || 0
    );

    const packageWeightKg = toPositiveNumber(
      order.chargeable_weight_kg || order.actual_weight_kg || order.package_weight,
      0.5
    );
    const packageLengthCm = toPositiveNumber(
      order.package_length_cm || order.length_cm,
      15
    );
    const packageWidthCm = toPositiveNumber(
      order.package_width_cm || order.width_cm || order.breadth_cm,
      12
    );
    const packageHeightCm = toPositiveNumber(
      order.package_height_cm || order.height_cm,
      5
    );

    const nimbusItems = items.map((item: any) => ({
      name: cleanEnv(item.product_title) || 'ADHYEY BROTHERS Product',
      qty: Math.max(1, Number(item.quantity) || 1),
      price: Math.max(0, Number(item.unit_price) || 0),
      sku: cleanEnv(item.sku) || `SKU-${String(item.product_id || '').slice(0, 8)}`,
      hsn_code: cleanEnv(item.hsn_code) || undefined,
      tax_rate: Number.isFinite(Number(item.gst_rate))
        ? Number(item.gst_rate)
        : undefined,
    }));

    const orderNumber =
      cleanEnv(order.order_number) || `ORD-${String(order.id).slice(0, 8)}`;

    const payload: Record<string, any> = {
      order_number: orderNumber,
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

    if (isCod) payload.order_collectable_amount = orderTotal;

    const response = await fetch(`${NIMBUSPOST_V2_BASE_URL}/v2/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': apiKey,
        'x-api-secret': apiSecret,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const rawText = await response.text();
    let result: any = null;

    try {
      result = rawText ? JSON.parse(rawText) : null;
    } catch {
      result = null;
    }

    if (!response.ok || result?.success === false) {
      const validationDetails =
        result?.errors || result?.details || result?.data?.errors;
      const primaryError =
        formatApiError(result?.message) ||
        formatApiError(result?.error) ||
        (rawText && rawText !== '[object Object]' ? rawText : '') ||
        `NimbusPost returned HTTP ${response.status}.`;
      const validationError = formatApiError(validationDetails);
      const combinedError = validationError
        ? `${primaryError} | Details: ${validationError}`
        : primaryError;

      if (isAlreadyExistsNimbusError(result || combinedError)) {
        const recovered = await recoverExistingNimbusShipment({
          supabase,
          orderId: order.id,
          orderNumber,
          packageWeightKg,
          apiKey,
          apiSecret,
          duplicatePayload: result,
        });

        if (recovered.success) {
          return {
            success: true,
            awb: recovered.awb,
            courier: recovered.courier,
            recoveredExistingShipment: true,
            alreadySynced: recovered.alreadySynced,
            itemCount: nimbusItems.length,
          };
        }

        return {
          success: false,
          recoverable: true,
          error: recovered.error,
        };
      }

      throw new Error(combinedError);
    }

    const data = result?.data || result?.result || result || {};
    let bookingInfo = extractNimbusBookingInfo(data);
    let syncResponse: any = null;

    if (!bookingInfo.awb && bookingInfo.remoteOrderId) {
      try {
        syncResponse = await fetchNimbusOrderById(
          bookingInfo.remoteOrderId,
          apiKey,
          apiSecret
        );

        const syncedInfo = extractNimbusBookingInfo(
          syncResponse?.data || syncResponse?.result || syncResponse
        );

        bookingInfo = {
          awb: syncedInfo.awb || bookingInfo.awb,
          courier: syncedInfo.courier || bookingInfo.courier,
          remoteOrderId: syncedInfo.remoteOrderId || bookingInfo.remoteOrderId,
          shipmentId: syncedInfo.shipmentId || bookingInfo.shipmentId,
          labelUrl: syncedInfo.labelUrl || bookingInfo.labelUrl,
          shippingCost: syncedInfo.shippingCost || bookingInfo.shippingCost,
        };
      } catch (syncError) {
        console.warn('NimbusPost post-booking sync warning:', syncError);
      }
    }

    const awbNumber = bookingInfo.awb;
    if (!awbNumber) {
      throw new Error(
        `NimbusPost created/accepted the remote order${
          bookingInfo.remoteOrderId ? ` ${bookingInfo.remoteOrderId}` : ''
        }, but the AWB was not present in the API response yet. Do NOT book again. The remote order should be synced instead. Remote response: ${formatApiError(
          syncResponse || data
        ).slice(0, 1600)}`
      );
    }

    const saved = await saveRecoveredNimbusShipment({
      supabase,
      orderId: order.id,
      packageWeightKg,
      bookingInfo,
      sourceDescription: 'Created via NimbusPost API.',
    });

    if (!saved.success) throw new Error(saved.error);

    return {
      success: true,
      awb: saved.awb,
      courier: saved.courier,
      labelUrl: String(bookingInfo.labelUrl || ''),
      shippingCost: bookingInfo.shippingCost || 0,
      itemCount: nimbusItems.length,
      remoteOrderId: bookingInfo.remoteOrderId,
      remoteShipmentId: bookingInfo.shipmentId,
      nimbusResponse: syncResponse || data,
    };
  } catch (err: any) {
    console.error('NimbusPost v2 booking error:', err);

    return {
      success: false,
      error: err?.message || 'NimbusPost API v2 communication failed.',
    };
  }
}
