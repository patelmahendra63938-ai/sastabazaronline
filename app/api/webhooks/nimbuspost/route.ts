import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ozzxrzyahbnavldyrlms.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_jXpCXLTZTtwJ6oVeEq8M9g_ZRx0K1ex';

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    const {
      order_number,
      order_id,
      awb,
      status,
      current_status,
      courier_name,
      signature
    } = body;

    const webhookSecret = process.env.NIMBUSPOST_WEBHOOK_SECRET || process.env.COURIER_SECRET_KEY;
    if (webhookSecret && signature && signature !== webhookSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized webhook request' },
        { status: 401 }
      );
    }

    const targetIdentifier = order_number || order_id;
    const trackingStatus = status || current_status || 'PROCESSING';

    if (!targetIdentifier) {
      return NextResponse.json(
        { success: false, error: 'Missing order_number or order_id in webhook payload' },
        { status: 400 }
      );
    }

    // Map NimbusPost status codes to database order_status
    let mappedStatus = 'CONFIRMED';
    const upperStatus = String(trackingStatus).toUpperCase();

    if (upperStatus.includes('DELIVERED')) {
      mappedStatus = 'DELIVERED';
    } else if (
      upperStatus.includes('PICKED') ||
      upperStatus.includes('TRANSIT') ||
      upperStatus.includes('SHIPPED') ||
      upperStatus.includes('MANIFESTED') ||
      upperStatus.includes('OUT FOR DELIVERY')
    ) {
      mappedStatus = 'SHIPPED';
    } else if (upperStatus.includes('RTO') || upperStatus.includes('RETURN')) {
      mappedStatus = 'RTO';
    } else if (upperStatus.includes('CANCEL')) {
      mappedStatus = 'CANCELLED';
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        order_status: mappedStatus,
        shipping_status: upperStatus,
        awb_number: awb || null,
        courier_partner: courier_name || 'NimbusPost',
        updated_at: new Date().toISOString()
      })
      .or(`order_number.eq.${targetIdentifier},id.eq.${targetIdentifier}`);

    if (updateError) {
      console.error('Supabase Order Status Update Failed:', updateError.message);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
  } catch (err: any) {
    console.error('NimbusPost Webhook Execution Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
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