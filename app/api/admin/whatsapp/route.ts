import { NextResponse } from 'next/server';
import { whatsappAdmin } from '@/lib/whatsapp/access';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { replyWindowOpen } from '@/lib/whatsapp-rules';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const phoneId = '1345111615361404';
const columns = 'id,meta_id,wa_id,contact_name,direction,body,message_type,message_at,status,error_code,error_message';
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } }); }
export async function GET(request: Request) {
  if (!(await whatsappAdmin())) return json({ error: 'Admin login with MFA required' }, 403);
  const waId = new URL(request.url).searchParams.get('phone');
  const config = { phoneNumber: '+91 9723268666', tokenConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN), webhookVerified: Boolean(process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET) };
  if (waId) {
    if (!/^\d{7,15}$/.test(waId)) return json({ error: 'Invalid contact' }, 400);
    const { data, error } = await supabaseAdmin.from('whatsapp_messages').select(columns).eq('phone_number_id',phoneId).eq('wa_id',waId).order('message_at',{ascending:false}).limit(100);
    const last = await supabaseAdmin.from('whatsapp_messages').select('message_at').eq('phone_number_id',phoneId).eq('wa_id',waId).eq('direction','inbound').order('message_at',{ascending:false}).limit(1).maybeSingle();
    if (error || last.error) return json({ error: 'Could not load chats' },500);
    return json({ messages: (data || []).reverse(), lastInbound: last.data?.message_at || null, replyAllowed: replyWindowOpen(last.data?.message_at || null), config });
  }
  const { data, error } = await supabaseAdmin.rpc('whatsapp_inbox_contacts');
  if (error) return json({ error: 'Inbox database is not ready' },500);
  return json({ contacts: data || [], config });
}
export async function POST(request: Request) {
  const user = await whatsappAdmin();
  if (!user) return json({ error: 'Admin login with MFA required' },403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid request origin' },403);
  let input;
  try { input = await request.json(); } catch { return json({ error: 'Invalid request' },400); }
  const to = String(input.to || ''); const text = String(input.text || '').trim(); const id = String(input.requestId || '');
  if (!/^\d{7,15}$/.test(to) || !text || text.length > 4096 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return json({ error: 'Invalid recipient, message or request ID' },400);
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
  if (!token) return json({ error: 'WhatsApp access token is not configured' },503);
  const previous = await supabaseAdmin.from('whatsapp_messages').select(columns).eq('id',id).maybeSingle();
  if (previous.error) return json({ error: 'Unable to check send request' },500);
  if (previous.data) {
    if (previous.data.wa_id !== to || previous.data.body !== text) return json({ error: 'Request ID already used' },409);
    return json({ message: previous.data, duplicate: true });
  }
  const last = await supabaseAdmin.from('whatsapp_messages').select('message_at,contact_name').eq('phone_number_id',phoneId).eq('wa_id',to).eq('direction','inbound').order('message_at',{ascending:false}).limit(1).maybeSingle();
  if (last.error) return json({ error: 'Unable to verify reply window' },500);
  if (!replyWindowOpen(last.data?.message_at || null)) return json({ error: 'Customer must message this number first. Text replies are available for 24 hours after their latest message.' },409);
  const { error: reserveError } = await supabaseAdmin.from('whatsapp_messages').insert({ id, phone_number_id:phoneId,wa_id:to,contact_name:last.data?.contact_name,direction:'outbound',body:text,message_type:'text',status:'pending',sent_by:user.id });
  if (reserveError) return json({ error: 'Send request already running or could not be saved; refresh before trying again.' },409);
  let status='unknown'; let metaId: string|null=null; let code: string|null=null; let message: string|null=null;
  try {
    const response = await fetch(`https://graph.facebook.com/v26.0/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to,type:'text',text:{body:text}}),signal:AbortSignal.timeout(15000)});
    const data=await response.json(); metaId=data.messages?.[0]?.id || null;
    status=response.ok && metaId ? 'accepted' : 'failed';
    if (status==='failed') {
      code=data.error?.code ? String(data.error.code):String(response.status);
      const metaError = data.error || {};
      const diagnostics = {
        httpStatus: response.status,
        code: metaError.code || null,
        subcode: metaError.error_subcode || null,
        type: metaError.type || null,
        trace: metaError.fbtrace_id || null,
        phoneNumberId: phoneId,
      };
      console.error('[WHATSAPP_SEND_FAILED]', diagnostics);
      message = String(metaError.message || 'Meta did not accept this message');
      if (diagnostics.subcode) message += ` (subcode: ${diagnostics.subcode})`;
      if (diagnostics.trace) message += ` [trace: ${diagnostics.trace}]`;
    }
  } catch { message='Send result is uncertain. Check delivery status before sending again.'; }
  const {data:saved,error:saveError}=await supabaseAdmin.from('whatsapp_messages').update({status,meta_id:metaId,error_code:code,error_message:message}).eq('id',id).select(columns).single();
  if(saveError) return json({error:'Send result could not be recorded. Do not resend until delivery is checked.'},500);
  return json({message:saved});
}
