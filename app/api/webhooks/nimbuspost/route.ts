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

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
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

    // Payload keys have not been provided by the verified contract. Do not infer
    // order/shipment/AWB fields, alter status history, or send notifications.
    // A worker can process awaiting_payload_mapping records once the official
    // 23-key event schema is available.
    return NextResponse.json(
      { success: true, accepted: true, processingStatus: plan.processingStatus },
      { status: 202 }
    );
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
    timestamp: new Date().toISOString()
  });
}
