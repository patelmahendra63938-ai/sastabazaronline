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
    auth: {
      user,
      pass,
    },
  });
}

function getPublicSiteUrl(): string {
  const configuredUrl = String(
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    ''
  ).trim();

  if (configuredUrl) {
    try {
      const parsed = new URL(configuredUrl);
      const hostname = parsed.hostname.toLowerCase();
      const isLocalHost =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1';

      if (!isLocalHost && (parsed.protocol === 'https:' || parsed.protocol === 'http:')) {
        return parsed.origin.replace(/\/$/, '');
      }
    } catch {
      console.warn('[EMAIL_TRACKING_URL] Ignoring invalid configured site URL.');
    }
  }

  return 'https://www.adhyeybrothers.in';
}

function generateOrderEmailHtml(data: EmailOrderPayload): string {
  const orderDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Send customers to the secure order-management page first. Guest customers
  // verify the checkout email + phone there, then see tracking and the secure
  // Cancel Order action for eligible orders. This avoids dropping a guest onto
  // the detail page without verified management credentials.
  const orderTrackingUrl = `${getPublicSiteUrl()}/orders`;

  const itemsRows = data.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #ead8b8;">
        <td style="padding: 12px 8px; font-size: 13px; color: #1e293b;">
          <strong>${item.product_title}</strong><br/>
          <span style="font-size: 11px; color: #64748b;">
            Size: ${item.size || 'Free Size'} | Qty: ${item.quantity}
          </span>
        </td>

        <td style="padding: 12px 8px; font-size: 13px; color: #741f23; text-align: right; font-weight: 600;">
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
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    >
    <title>Order Confirmation - ADHYEY BROTHERS</title>
  </head>

  <body style="margin: 0; padding: 0; background-color: #fffaf5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #fffaf5; padding: 24px 0;"
    >
      <tr>
        <td align="center">

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #ead8b8; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);"
          >

            <tr>
              <td style="background-color: #741f23; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">
                  ADHYEY BROTHERS
                </h1>

                <p style="color: #f3d9a7; margin: 4px 0 0 0; font-size: 11px;">
                  Online Shopping • Surat, Gujarat
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 24px; text-align: center; border-bottom: 1px solid #ead8b8;">
                <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 50px; padding: 6px 16px; margin-bottom: 12px;">
                  <span style="color: #047857; font-size: 12px; font-weight: 700;">
                    ✓ Order Placed Successfully
                  </span>
                </div>

                <h2 style="color: #741f23; margin: 0; font-size: 18px; font-weight: 800;">
                  Thank you, ${data.customerName}!
                </h2>

                <p style="color: #64748b; font-size: 12px; margin: 6px 0 0 0;">
                  Order Number:
                  <strong style="color: #741f23; font-family: monospace;">
                    ${data.orderNumber}
                  </strong>
                  • ${orderDate}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 20px 24px;">
                <h3 style="color: #741f23; font-size: 13px; font-weight: 800; text-transform: uppercase; margin: 0 0 12px 0;">
                  Package Summary
                </h3>

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="border-collapse: collapse;"
                >
                  ${itemsRows}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 24px 20px 24px;">
                <table
                  width="100%"
                  cellpadding="4"
                  cellspacing="0"
                  style="font-size: 12px; color: #475569;"
                >
                  <tr>
                    <td>Subtotal (incl. GST):</td>
                    <td
                      align="right"
                      style="color: #741f23; font-weight: 600;"
                    >
                      ₹${data.subtotal + (data.discountAmount || 0)}
                    </td>
                  </tr>

                  ${
                    data.discountAmount && data.discountAmount > 0
                      ? `
                    <tr>
                      <td>Discount:</td>
                      <td
                        align="right"
                        style="color: #047857; font-weight: 700;"
                      >
                        -₹${data.discountAmount}
                      </td>
                    </tr>
                  `
                      : ''
                  }

                  <tr>
                    <td>Shipping Charge:</td>
                    <td
                      align="right"
                      style="color: #741f23; font-weight: 700;"
                    >
                      ₹${data.shippingCharge}
                    </td>
                  </tr>

                  ${
                    data.paymentMethod.toUpperCase().includes('COD')
                      ? `
                    <tr>
                      <td>COD Charge:</td>
                      <td
                        align="right"
                        style="color: #741f23; font-weight: 600;"
                      >
                        ₹${data.codCharge}
                      </td>
                    </tr>
                  `
                      : ''
                  }

                  <tr>
                    <td>Payment Mode:</td>
                    <td
                      align="right"
                      style="color: #741f23; font-weight: 600;"
                    >
                      ${data.paymentMethod}
                    </td>
                  </tr>

                  <tr style="border-top: 2px solid #ead8b8; font-size: 14px;">
                    <td style="padding-top: 8px; font-weight: 800; color: #741f23;">
                      Grand Total:
                    </td>

                    <td
                      align="right"
                      style="padding-top: 8px; font-weight: 900; color: #b5843d; font-size: 16px;"
                    >
                      ₹${data.grandTotal}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 16px 24px; background-color: #fffdf9; border-top: 1px solid #ead8b8;">
                <h4 style="color: #741f23; font-size: 11px; text-transform: uppercase; font-weight: 800; margin: 0 0 6px 0;">
                  Delivery Address
                </h4>

                <p style="color: #334155; font-size: 12px; margin: 0; line-height: 1.5;">
                  ${data.shippingAddress}
                  <br/>
                  <strong>Phone:</strong> ${data.customerPhone}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 24px; text-align: center;">
                <a
                  href="${orderTrackingUrl}"
                  style="background-color: #741f23; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 28px; border-radius: 12px; display: inline-block;"
                >
                  Track & Manage Order →
                </a>
                <p style="color: #64748b; font-size: 10px; margin: 10px 0 0 0;">
                  Verify with the same email and phone used at checkout to see live status and eligible cancellation options.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 16px 24px; background-color: #fffaf5; text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid #ead8b8;">
                <p style="margin: 0 0 4px 0;">
                  Need help with your order? Reach out at
                  <strong>sales@sastabazaronline.in</strong>
                </p>

                <p style="margin: 0;">
                  ADHYEY BROTHERS • Surat, Gujarat - 395004 • GSTIN:
                  24AKBPD1704F1Z1
                </p>
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

export async function sendOrderConfirmationEmail(
  payload: EmailOrderPayload
) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      '[SMTP] Email credentials missing. Dispatch skipped.'
    );

    return {
      success: false,
      reason: 'SMTP_NOT_CONFIGURED',
    };
  }

  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS ||
    'sales@sastabazaronline.in';

  const fromName =
    process.env.EMAIL_FROM_NAME ||
    'ADHYEY BROTHERS';

  const storeNotificationAddress =
    process.env.ORDER_NOTIFICATION_EMAIL ||
    'sales@sastabazaronline.in';

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: payload.customerEmail,
      bcc: storeNotificationAddress,
      replyTo: 'sales@sastabazaronline.in',
      subject: `Order Confirmed: ${payload.orderNumber} (₹${payload.grandTotal}) - ADHYEY BROTHERS`,
      html: generateOrderEmailHtml(payload),
    });

    return {
      success: true,
      messageId: info.messageId,
      storeCopy: storeNotificationAddress,
    };
  } catch (error: any) {
    console.error(
      '[SMTP Error] Failed to send email:',
      error
    );

    return {
      success: false,
      error: error.message,
    };
  }
}