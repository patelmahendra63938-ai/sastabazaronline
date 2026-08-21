import nodemailer from 'nodemailer';

export interface EmailOrderPayload {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  grandTotal: number;
  subtotal: number;
  shippingCharge: number;
  codCharge: number;
  discountAmount?: number;
  taxAmount: number;
  items: Array<{
    product_title: string;
    size?: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

// 1. Initialize Nodemailer Transporter
function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.titan.email';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

// 2. Generate Responsive HTML Invoice Template
function generateOrderEmailHtml(data: EmailOrderPayload): string {
  const orderDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const itemsRows = data.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 8px; font-size: 13px; color: #1e293b;">
          <strong>${item.product_title}</strong><br/>
          <span style="font-size: 11px; color: #64748b;">Size: ${item.size || 'Free Size'} | Qty: ${item.quantity}</span>
        </td>
        <td style="padding: 12px 8px; font-size: 13px; color: #0f172a; text-align: right; font-weight: 600;">
          ₹${item.line_total || item.unit_price * item.quantity}
        </td>
      </tr>
    `
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - SASTABAZARONLINE</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 24px 0;">
      <tr>
        <td align="center">
          <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            
            <!-- Header Banner -->
            <tr>
              <td style="background-color: #0f172a; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">
                  SASTABAZAR<span style="color: #f97316;">.ONLINE</span>
                </h1>
                <p style="color: #cbd5e1; margin: 4px 0 0 0; font-size: 11px;">Owned and operated by ADHYEY BROTHERS</p>
              </td>
            </tr>

            <!-- Order Status Callout -->
            <tr>
              <td style="padding: 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 50px; padding: 6px 16px; margin-bottom: 12px;">
                  <span style="color: #047857; font-size: 12px; font-weight: 700;">✓ Order Placed Successfully</span>
                </div>
                <h2 style="color: #0f172a; margin: 0; font-size: 18px; font-weight: 800;">Thank you, ${data.customerName}!</h2>
                <p style="color: #64748b; font-size: 12px; margin: 6px 0 0 0;">
                  Order Number: <strong style="color: #0f172a; font-family: monospace;">${data.orderNumber}</strong> • ${orderDate}
                </p>
              </td>
            </tr>

            <!-- Items Ordered Table -->
            <tr>
              <td style="padding: 20px 24px;">
                <h3 style="color: #0f172a; font-size: 13px; font-weight: 800; text-transform: uppercase; margin: 0 0 12px 0;">
                  Package Summary
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${itemsRows}
                </table>
              </td>
            </tr>

            <!-- Financial Summary -->
            <tr>
              <td style="padding: 0 24px 20px 24px;">
                <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 12px; color: #475569;">
                  <tr>
                    <td>Subtotal (incl. GST):</td>
                    <td align="right" style="color: #0f172a; font-weight: 600;">₹${data.subtotal + (data.discountAmount || 0)}</td>
                  </tr>
                  ${data.discountAmount && data.discountAmount > 0 ? `<tr><td>Discount:</td><td align="right" style="color: #047857; font-weight: 700;">-₹${data.discountAmount}</td></tr>` : ''}
                  <tr>
                    <td>Delivery Charge:</td>
                    <td align="right" style="color: #047857; font-weight: 700;">
                      ${data.shippingCharge === 0 ? 'FREE' : `₹${data.shippingCharge}`}
                    </td>
                  </tr>
                  ${data.paymentMethod.toUpperCase().includes('COD') ? `<tr><td>COD Charge:</td><td align="right" style="color: #0f172a; font-weight: 600;">₹${data.codCharge}</td></tr>` : ''}
                  <tr>
                    <td>Payment Mode:</td>
                    <td align="right" style="color: #0f172a; font-weight: 600;">${data.paymentMethod}</td>
                  </tr>
                  <tr style="border-top: 2px solid #e2e8f0; font-size: 14px;">
                    <td style="padding-top: 8px; font-weight: 800; color: #0f172a;">Grand Total:</td>
                    <td align="right" style="padding-top: 8px; font-weight: 900; color: #f97316; font-size: 16px;">
                      ₹${data.grandTotal}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Shipping Details -->
            <tr>
              <td style="padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                <h4 style="color: #0f172a; font-size: 11px; text-transform: uppercase; font-weight: 800; margin: 0 0 6px 0;">
                  Delivery Address
                </h4>
                <p style="color: #334155; font-size: 12px; margin: 0; line-height: 1.5;">
                  ${data.shippingAddress}<br/>
                  <strong>Phone:</strong> ${data.customerPhone}
                </p>
              </td>
            </tr>

            <!-- Track Order Button -->
            <tr>
              <td style="padding: 24px; text-align: center;">
                <a href="https://sastabazaronline.in/orders/${data.orderNumber}" 
                   style="background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 28px; border-radius: 12px; display: inline-block;">
                  Track Live Order Status →
                </a>
              </td>
            </tr>

            <!-- Footer Legal & Support -->
            <tr>
              <td style="padding: 16px 24px; background-color: #f1f5f9; text-align: center; font-size: 10px; color: #64748b;">
                <p style="margin: 0 0 4px 0;">Need help with your order? Reach out at <strong>sales@sastabazaronline.in</strong></p>
                <p style="margin: 0;">SASTABAZARONLINE is owned and operated by ADHYEY BROTHERS.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

// 3. Send Order Confirmation Email
export async function sendOrderConfirmationEmail(payload: EmailOrderPayload) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[SMTP] Email credentials missing in .env.local. Dispatch skipped.');
    return { success: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'sales@sastabazaronline.in';
  const fromName = process.env.EMAIL_FROM_NAME || 'SASTABAZARONLINE';

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: payload.customerEmail,
      subject: `Order Confirmed: ${payload.orderNumber} (₹${payload.grandTotal}) - SASTABAZARONLINE`,
      html: generateOrderEmailHtml(payload),
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[SMTP Error] Failed to send email:', error);
    return { success: false, error: error.message };
  }
}
