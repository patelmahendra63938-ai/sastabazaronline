import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getEmailTransporter } from './transporter';
import { buildOrderEmailHtml, EmailTemplateType, EmailOrderPayload } from './templates/orderTemplates';

export interface EmailDispatchResult {
  success: boolean;
  notificationId?: string;
  messageId?: string;
  error?: string;
}

/**
 * Sends a transactional email via GoDaddy/Titan SMTP and records audit log in database.
 * Does NOT throw errors that could disrupt the user checkout experience.
 */
export async function sendTransactionalOrderEmail(
  templateType: EmailTemplateType,
  payload: EmailOrderPayload
): Promise<EmailDispatchResult> {
  const supabase = await createServerSupabaseClient();
  const senderEmail = process.env.EMAIL_FROM_ADDRESS || 'sales@sastabazaronline.in';
  const senderName = process.env.EMAIL_FROM_NAME || 'Sastabazar';

  // 1. Validation check
  if (!payload.customerEmail || !payload.customerEmail.includes('@')) {
    console.error(`[EMAIL ERROR]: Invalid or missing customer email for order ${payload.orderNumber}`);
    
    // Log failure in notifications table
    await supabase.from('order_notifications').insert({
      order_id: payload.orderId,
      order_number: payload.orderNumber,
      channel: 'EMAIL',
      recipient: payload.customerEmail || 'NO_EMAIL_PROVIDED',
      sender: senderEmail,
      template_type: templateType,
      subject: `Order Notification - ${payload.orderNumber}`,
      status: 'FAILED',
      error_message: 'Customer email address is missing or invalid.',
    });

    return { success: false, error: 'Customer email address is missing.' };
  }

  // 2. Prevent duplicate sends within 60 seconds (Idempotency)
  const { data: existingNotification } = await supabase
    .from('order_notifications')
    .select('id, status, created_at')
    .eq('order_id', payload.orderId)
    .eq('template_type', templateType)
    .eq('status', 'SENT')
    .gte('created_at', new Date(Date.now() - 60000).toISOString())
    .maybeSingle();

  if (existingNotification) {
    console.log(`[EMAIL NOTICE]: Skipping duplicate ${templateType} email for order ${payload.orderNumber}`);
    return { success: true, notificationId: existingNotification.id };
  }

  // 3. Generate Template HTML
  const { subject, html } = buildOrderEmailHtml(templateType, payload);

  // 4. Create Initial Audit Record in 'PENDING' state
  const { data: auditRecord } = await supabase
    .from('order_notifications')
    .insert({
      order_id: payload.orderId,
      order_number: payload.orderNumber,
      channel: 'EMAIL',
      recipient: payload.customerEmail.toLowerCase().trim(),
      sender: `${senderName} <${senderEmail}>`,
      template_type: templateType,
      subject,
      status: 'PENDING',
      provider: 'TITAN_SMTP',
    })
    .select('id')
    .single();

  const notificationId = auditRecord?.id;

  try {
    const transporter = getEmailTransporter();

    // 5. Send Email via Titan SMTP
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: payload.customerEmail.toLowerCase().trim(),
      subject,
      html,
    });

    // 6. Update Audit Log to 'SENT'
    if (notificationId) {
      await supabase
        .from('order_notifications')
        .update({
          status: 'SENT',
          provider_message_id: info.messageId,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId);
    }

    console.log(`✅ [EMAIL SENT SUCCESSFULLY]: ${subject} -> ${payload.customerEmail} (ID: ${info.messageId})`);
    return { success: true, notificationId, messageId: info.messageId };

  } catch (err: any) {
    console.error(`❌ [EMAIL SMTP DISPATCH FAILED]: Order ${payload.orderNumber}`, err);

    // 7. Update Audit Log to 'FAILED' with complete error message
    if (notificationId) {
      await supabase
        .from('order_notifications')
        .update({
          status: 'FAILED',
          error_message: err.message || 'SMTP delivery connection timeout or authentication failure',
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId);
    }

    return { 
      success: false, 
      notificationId, 
      error: err.message || 'SMTP sending failed' 
    };
  }
}