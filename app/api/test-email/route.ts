import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { requireAdminApiSession } from '@/lib/api/admin-authorization';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdminApiSession();
  if (!admin.authorized) return admin.response;

  try {
    const host = process.env.SMTP_HOST || 'smtp.titan.email';
    const port = Number(process.env.SMTP_PORT) || 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      return NextResponse.json({
        success: false,
        error: 'Email service is not configured.',
      }, { status: 400 });
    }

    // 1. Initialize Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    // 2. Verify Connection
    await transporter.verify();

    // 3. Send Test Email
    const testRecipient = process.env.TEST_EMAIL_RECIPIENT || admin.user.email;
    if (!testRecipient) {
      return NextResponse.json(
        { success: false, error: 'A test recipient email is not configured.' },
        { status: 400 }
      );
    }
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'sales@sastabazaronline.in';
    const fromName = process.env.EMAIL_FROM_NAME || 'Sastabazar';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: testRecipient,
      subject: '🎉 Test Email: SastaBazar Titan SMTP Connected Successfully!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px;">
          <h2 style="color: #0f172a; margin-top: 0;">SastaBazar Online</h2>
          <p style="color: #16a34a; font-weight: bold; font-size: 16px;">✓ Titan SMTP Email Connected Successfully!</p>
          <p style="color: #334155; font-size: 13px;">
            આ ઈમેલ <strong>sales@sastabazaronline.in</strong> પરથી GoDaddy/Titan SMTP સર્વર દ્વારા મોકલવામાં આવ્યો છે.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="color: #64748b; font-size: 11px;">
            Timestamp: ${new Date().toLocaleString('en-IN')}<br/>
            Sender: ${fromAddress}
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${testRecipient}`,
      messageId: info.messageId,
    });
  } catch (error: unknown) {
    console.error('SMTP connection or test send failed.', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send the test email.',
    }, { status: 500 });
  }
}
