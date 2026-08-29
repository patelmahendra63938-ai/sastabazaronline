import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  hasValidNimbusSignature,
  isDuplicateDeliveryError,
  parseNimbusWebhookPayload,
  planNimbusEventProcessing,
} from '@/lib/nimbuspost/webhook';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return null;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function findDeepString(
  value: unknown,
  keys: string[],
  maxDepth = 8
): string {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));

  function walk(node: unknown, depth: number): string {
    if (depth > maxDepth || node == null) return '';

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return '';
    }

    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;

      for (const [key, val] of Object.entries(obj)) {
        if (!wanted.has(key.toLowerCase())) continue;
        if (val === undefined || val === null || val === '') continue;
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).trim();
        }
      }

      for (const val of Object.values(obj)) {
        const found = walk(val, depth + 1);
        if (found) return found;
      }
    }

    return '';
  }

  return walk(value, 0);
}

function extractVerifiedShipmentFields(payload: Record<string, unknown>) {
  return {
    orderNumber: findDeepString(payload, [
      'order_number',
      'order_no',
      'merchant_order_id',
      'merchant_order_number',
      'reference_order_id',
    ]),
    awb: findDeepString(payload, [
      'awb',
      'awb_number',
      'awb_no',
      'awbnumber',
      'tracking_number',
      'tracking_no',
      'waybill',
      'waybill_number',
    ]),
    courier: findDeepString(payload, [
      'courier_name',
      'courier',
      'courier_partner',
      'courier_partner_name',
    ]),
    remoteStatus: findDeepString(payload, [
      'shipment_status',
      'tracking_status',
      'current_status',
      'status',
    ]),
    labelUrl: findDeepString(payload, [
      'label_url',
      'shipping_label_url',
      'label',
    ]),
  };
}

async function processAwbAssignment(
  supabase: any,
  payload: Record<string, unknown>,
  deliveryId: string
) {
  const fields = extractVerifiedShipmentFields(payload);

  // Only mutate local shipping records when both identifiers are explicitly
  // present in a signature-verified NimbusPost payload. This avoids guessing
  // shipment mappings from partial or undocumented events.
  if (!fields.orderNumber || !fields.awb) {
    return { processed: false, reason: 'AWB/order mapping not present yet.' };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, order_status, chargeable_weight_kg, actual_weight_kg, package_weight')
    .eq('order_number', fields.orderNumber)
    .maybeSingle();

  if (orderError || !order) {
    return { processed: false, reason: `Local order ${fields.orderNumber} was not found.` };
  }

  const { data: existingShipment, error: shipmentLookupError } = await supabase
    .from('shipments')
    .select('id, awb_number')
    .eq('order_id', order.id)
    .limit(1)
    .maybeSingle();

  if (shipmentLookupError) throw shipmentLookupError;

  let shipmentId = existingShipment?.id || '';

  if (existingShipment) {
    const updatePayload: Record<string, unknown> = {
      awb_number: fields.awb,
      shipment_status: 'COURIER_ASSIGNED',
      pickup_status: 'REQUESTED',
      tracking_url: `https://nimbuspost.com/track?awb=${encodeURIComponent(fields.awb)}`,
    };
    if (fields.labelUrl) updatePayload.shipping_label_url = fields.labelUrl;

    const { error: updateError } = await supabase
      .from('shipments')
      .update(updatePayload)
      .eq('id', existingShipment.id);

    if (updateError) throw updateError;
  } else {
    const packageWeight =
      Number(order.chargeable_weight_kg || order.actual_weight_kg || order.package_weight || 0.5) || 0.5;

    const insertPayload: Record<string, unknown> = {
      order_id: order.id,
      awb_number: fields.awb,
      shipment_status: 'COURIER_ASSIGNED',
      pickup_status: 'REQUESTED',
      package_weight: packageWeight,
      tracking_url: `https://nimbuspost.com/track?awb=${encodeURIComponent(fields.awb)}`,
      shipping_label_url: fields.labelUrl || '',
      shipping_cost: 0,
    };

    const { data: insertedShipment, error: insertShipmentError } = await supabase
      .from('shipments')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertShipmentError || !insertedShipment) {
      throw insertShipmentError || new Error('Unable to create local shipment from NimbusPost webhook.');
    }
    shipmentId = insertedShipment.id;
  }

  if (shipmentId) {
    const description = [
      `NimbusPost assigned AWB ${fields.awb}`,
      fields.courier ? `via ${fields.courier}` : '',
      fields.remoteStatus ? `(NimbusPost: ${fields.remoteStatus})` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const { error: trackingError } = await supabase
      .from('shipment_tracking_events')
      .insert({
        shipment_id: shipmentId,
        status: 'COURIER_ASSIGNED',
        location: 'NimbusPost',
        description,
        event_time: new Date().toISOString(),
        source: 'COURIER_API',
      });

    if (trackingError) {
      console.warn('NimbusPost webhook tracking event warning:', trackingError.message);
    }
  }

  const currentOrderStatus = String(order.order_status || '').toUpperCase();
  if (!['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RTO', 'CANCELLED', 'CANCELED'].includes(currentOrderStatus)) {
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({ order_status: 'PACKED' })
      .eq('id', order.id);

    if (orderUpdateError) {
      console.warn('NimbusPost webhook order status warning:', orderUpdateError.message);
    }
  }

  const { error: deliveryUpdateError } = await supabase
    .from('nimbuspost_webhook_deliveries')
    .update({
      processing_status: 'processed_awb_assignment',
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('delivery_id', deliveryId);

  if (deliveryUpdateError) {
    console.warn('NimbusPost webhook delivery status warning:', deliveryUpdateError.message);
  }

  return {
    processed: true,
    orderNumber: fields.orderNumber,
    awb: fields.awb,
    courier: fields.courier,
    remoteStatus: fields.remoteStatus,
  };
}

export async function POST(request: Request) {
  try {
    const rawBody = new Uint8Array(await request.arrayBuffer());
    const signature = request.headers.get('x-nimbus-signature');
    const deliveryId = request.headers.get('x-nimbus-delivery');
    const eventType = request.headers.get('x-nimbus-event') || '';
    const webhookSecret = process.env.NIMBUSPOST_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('NimbusPost webhook secret is not configured.');
      return NextResponse.json({ success: false, error: 'Webhook is unavailable.' }, { status: 503 });
    }

    if (!signature || !hasValidNimbusSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ success: false, error: 'Invalid webhook signature.' }, { status: 401 });
    }

    if (!deliveryId) {
      return NextResponse.json({ success: false, error: 'Missing webhook delivery ID.' }, { status: 400 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = parseNimbusWebhookPayload(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: 'Malformed webhook JSON.' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('Supabase service configuration is unavailable for NimbusPost webhook intake.');
      return NextResponse.json({ success: false, error: 'Webhook intake is unavailable.' }, { status: 503 });
    }

    const plan = planNimbusEventProcessing(eventType);
    const { error: insertError } = await supabase
      .from('nimbuspost_webhook_deliveries')
      .insert({
        delivery_id: deliveryId,
        event_type: eventType || 'unknown',
        received_at: new Date().toISOString(),
        payload,
        processing_status: plan.processingStatus,
      });

    if (isDuplicateDeliveryError(insertError)) {
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
    }

    if (insertError) {
      console.error('NimbusPost webhook durable intake failed:', insertError.message);
      return NextResponse.json({ success: false, error: 'Webhook intake failed.' }, { status: 503 });
    }

    try {
      const processed = await processAwbAssignment(supabase, payload, deliveryId);
      return NextResponse.json(
        {
          success: true,
          accepted: true,
          processingStatus: processed.processed
            ? 'processed_awb_assignment'
            : plan.processingStatus,
          ...processed,
        },
        { status: processed.processed ? 200 : 202 }
      );
    } catch (processingError) {
      const message =
        processingError instanceof Error ? processingError.message : 'Webhook processing failed.';

      console.error('NimbusPost webhook processing error:', message);
      await supabase
        .from('nimbuspost_webhook_deliveries')
        .update({ processing_status: 'processing_error', error_message: message })
        .eq('delivery_id', deliveryId);

      // Intake succeeded, so acknowledge the webhook and preserve it for retry.
      return NextResponse.json(
        { success: true, accepted: true, processingStatus: 'processing_error' },
        { status: 202 }
      );
    }
  } catch (err: unknown) {
    console.error('NimbusPost Webhook Execution Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ACTIVE',
    endpoint: 'Sastabazar NimbusPost Webhook Listener',
    timestamp: new Date().toISOString(),
  });
}
