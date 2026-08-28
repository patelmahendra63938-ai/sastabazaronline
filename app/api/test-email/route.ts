import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
  }

  try {
    const { user, role } = await getCurrentUser();

    if (!user || !role || !['admin', 'super_admin', 'staff'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required.' },
        { status: 403 }
      );
    }

    const host = process.env.SMTP_HOST || 'smtp.titan.email';
    const port = Number(process.env.SMTP_PORT) || 465;
    const smtpUser = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!smtpUser || !pass) {
      return NextResponse.json({
        success: false,
        error: 'SMTP configuration is missing on the server.',
      }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass },
    });

    await transporter.verify();

    const testRecipient = 'patelmahendra63938@gmail.com';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'sales@sastabazaronline.in';
    const fromName = process.env.EMAIL_FROM_NAME || 'Sastabazar';

    const info = await transporter.sendMail({
      from: `\"${fromName}\" <${fromAddress}>`,
      to: testRecipient,
      subject: 'SMTP test email',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px;">
          <h2 style="color: #0f172a; margin-top: 0;">SMTP Test</h2>
          <p style="color: #16a34a; font-weight: bold; font-size: 16px;">SMTP connection verified and test email sent successfully.</p>
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
    const message = error instanceof Error ? error.message : 'Failed to send email via SMTP';
    console.error('SMTP Connection / Send Error:', error);
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
