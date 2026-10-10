import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { incomingText, validWebhookSignature } from '@/lib/whatsapp-rules';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  if (p.get('hub.mode') === 'subscribe' && process.env.WHATSAPP_VERIFY_TOKEN && p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN && p.get('hub.challenge')) {
    return new NextResponse(p.get('hub.challenge'), { headers: { 'Content-Type': 'text/plain' } });
  }
  return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 });
}
export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook signature secret is not configured' }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 1000000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  if (!validWebhookSignature(raw, request.headers.get('x-hub-signature-256'), secret)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  let body;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (body.object !== 'whatsapp_business_account') return NextResponse.json({ success: true });
  try {
    for (const entry of body.entry || []) {
      if (String(entry.id) !== '1603391888190496') continue;
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const phone = String(value.metadata?.phone_number_id || '');
        if (phone !== '1345111615361404') continue;
        for (const message of value.messages || []) {
          if (!message.id || !/^\d{7,15}$/.test(message.from || '')) continue;
          const date = new Date(Number(message.timestamp) * 1000);
          if (!Number.isFinite(date.getTime())) continue;
          const name = value.contacts?.find((c: any) => c.wa_id === message.from)?.profile?.name || null;
          const { error } = await supabaseAdmin.from('whatsapp_messages').upsert({
            meta_id: message.id, phone_number_id: phone, wa_id: message.from, contact_name: name,
            direction: 'inbound', message_type: message.type || 'unknown', body: incomingText(message),
            message_at: date.toISOString(), status: 'received',
          }, { onConflict: 'meta_id', ignoreDuplicates: true });
          if (error) throw error;
        }
        for (const status of value.statuses || []) {
          if (!status.id || !['sent','delivered','read','failed'].includes(status.status)) continue;
          const previous: Record<string, string[]> = { sent: ['pending','accepted','unknown'], delivered: ['pending','accepted','unknown','sent'], read: ['pending','accepted','unknown','sent','delivered'], failed: ['pending','accepted','unknown','sent'] };
          const failure = status.errors?.[0];
          const { error } = await supabaseAdmin.from('whatsapp_messages').update({ status: status.status, error_code: failure?.code ? String(failure.code) : null, error_message: failure?.message || failure?.title || null })
            .eq('meta_id', status.id).eq('phone_number_id', phone).in('status', previous[status.status]);
          if (error) throw error;
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch {
    console.error('[WhatsApp] Inbox persistence failed; webhook will be retried.');
    return NextResponse.json({ error: 'Unable to persist webhook' }, { status: 500 });
  }
}
