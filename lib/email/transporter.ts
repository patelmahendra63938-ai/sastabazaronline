import nodemailer from 'nodemailer';

let transporterInstance: nodemailer.Transporter | null = null;

/**
 * Returns a pooled singleton Nodemailer transporter configured for GoDaddy / Titan SMTP.
 */
export function getEmailTransporter(): nodemailer.Transporter {
  if (!transporterInstance) {
    const host = process.env.SMTP_HOST || 'smtp.titan.email';
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn('⚠️ [SMTP WARNING]: SMTP_USER or SMTP_PASS is missing in environment variables.');
    }

    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure, // true for port 465 (SSL), false for port 587 (STARTTLS)
      auth: {
        user,
        pass,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
      tls: {
        rejectUnauthorized: true,
      },
    });
  }

  return transporterInstance;
}