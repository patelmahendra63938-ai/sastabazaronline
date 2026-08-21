export type EmailTemplateType =
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'RETURN_APPROVED'
  | 'RETURN_RECEIVED'
  | 'REFUND_INITIATED'
  | 'REFUND_COMPLETED';

export interface EmailProductItem {
  title: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image?: string;
}

export interface EmailOrderPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  items: EmailProductItem[];
  subtotal: number;
  shippingCharge: number;
  codCharge?: number;
  discount?: number;
  gstAmount?: number;
  grandTotal: number;
  paymentMethod: string;
  orderDate: string;
  courierPartner?: string;
  trackingNumber?: string;
  expectedDelivery?: string;
  cancellationReason?: string;
  refundAmount?: number;
  refundUtr?: string;
}

/**
 * Builds professional, responsive, inline-styled HTML email bodies.
 */
export function buildOrderEmailHtml(type: EmailTemplateType, data: EmailOrderPayload): { subject: string; html: string } {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const trackingUrl = `${siteUrl}/orders/${data.orderId}`;
  
  // Dynamic header configurations based on lifecycle event
  const eventConfig: Record<EmailTemplateType, { subject: string; bannerTitle: string; bannerSubtitle: string; badgeColor: string }> = {
    ORDER_CONFIRMED: {
      subject: `Order Confirmed: ${data.orderNumber} - SASTABAZARONLINE`,
      bannerTitle: 'Order Confirmed!',
      bannerSubtitle: 'Thank you for shopping with SASTABAZARONLINE. We have received your order.',
      badgeColor: '#16a34a'
    },
    ORDER_SHIPPED: {
      subject: `Your Order ${data.orderNumber} Has Been Shipped! - SASTABAZARONLINE`,
      bannerTitle: 'Package Dispatched!',
      bannerSubtitle: `Your package is on its way via ${data.courierPartner || 'our courier partner'}.`,
      badgeColor: '#2563eb'
    },
    OUT_FOR_DELIVERY: {
      subject: `Out for Delivery: ${data.orderNumber} - SASTABAZARONLINE`,
      bannerTitle: 'Out for Delivery Today!',
      bannerSubtitle: 'Our delivery partner is arriving at your doorstep soon.',
      badgeColor: '#ea580c'
    },
    ORDER_DELIVERED: {
      subject: `Delivered: ${data.orderNumber} - SASTABAZARONLINE`,
      bannerTitle: 'Delivered Successfully!',
      bannerSubtitle: 'Your package has been safely delivered. We hope you love your purchase!',
      badgeColor: '#16a34a'
    },
    ORDER_CANCELLED: {
      subject: `Order Cancelled: ${data.orderNumber} - SASTABAZARONLINE`,
      bannerTitle: 'Order Cancelled',
      bannerSubtitle: data.cancellationReason || 'Your order has been cancelled as requested.',
      badgeColor: '#dc2626'
    },
    RETURN_APPROVED: {
      subject: `Return Request Approved: ${data.orderNumber} - SASTABAZARONLINE`,
      bannerTitle: 'Return Approved',
      bannerSubtitle: 'Our courier agent will pick up the item within 24-48 hours.',
      badgeColor: '#9333ea'
    },
    RETURN_RECEIVED: {
      subject: `Return Package Received: ${data.orderNumber} - SASTABAZARONLINE`,
      bannerTitle: 'Return Item Inspected',
      bannerSubtitle: 'We have received your returned item and verified the QC inspection.',
      badgeColor: '#9333ea'
    },
    REFUND_INITIATED: {
      subject: `Refund Initiated for Order ${data.orderNumber} - SASTABAZARONLINE`,
      bannerTitle: 'Refund Processing',
      bannerSubtitle: `A refund of ₹${Number(data.refundAmount || data.grandTotal).toLocaleString('en-IN')} has been initiated to your account.`,
      badgeColor: '#0891b2'
    },
    REFUND_COMPLETED: {
      subject: `Refund Completed: ${data.orderNumber} - SASTABAZARONLINE`,
      bannerTitle: 'Refund Transferred Successfully!',
      bannerSubtitle: `Amount ₹${Number(data.refundAmount || data.grandTotal).toLocaleString('en-IN')} is credited (UTR: ${data.refundUtr || 'Processed'}).`,
      badgeColor: '#16a34a'
    }
  };

  const current = eventConfig[type] || eventConfig.ORDER_CONFIRMED;

  // Build product item rows
  const productRows = data.items.map(item => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: middle;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            ${item.image ? `
              <td style="width: 48px; padding-right: 12px; vertical-align: middle;">
                <img src="${item.image}" alt="${item.title}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; display: block;" />
              </td>
            ` : ''}
            <td style="vertical-align: middle;">
              <p style="margin: 0; font-size: 13px; font-weight: bold; color: #111827; line-height: 1.4;">${item.title}</p>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #6b7280;">Qty: ${item.quantity} × ₹${item.unitPrice.toLocaleString('en-IN')}</p>
            </td>
          </tr>
        </table>
      </td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; vertical-align: middle; font-size: 13px; font-weight: bold; color: #111827;">
        ₹${item.lineTotal.toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${current.subject}</title>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    
    <div style="background-color: #0f172a; padding: 24px; text-align: center;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: 1px;">
              SASTABAZAR
            </h1>
            <span style="display: inline-block; margin-top: 6px; background-color: #ea580c; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
              Direct from Surat Textile Hub
            </span>
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: #faf5ff; border-bottom: 1px solid #f3e8ff; padding: 24px; text-align: center;">
      <h2 style="margin: 0; color: #1e1b4b; font-size: 20px; font-weight: 800;">${current.bannerTitle}</h2>
      <p style="margin: 6px 0 0 0; color: #4b5563; font-size: 13px; line-height: 1.5;">${current.bannerSubtitle}</p>
    </div>

    <div style="padding: 24px;">

      <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b; width: 40%;">Order Number:</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-family: monospace; font-weight: bold; color: #0f172a; text-align: right;">${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">Order Placed On:</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; text-align: right;">${data.orderDate}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 12px; color: #64748b;">Payment Mode:</td>
          <td style="padding: 12px 16px; font-size: 12px; font-weight: bold; color: #0f172a; text-align: right;">${data.paymentMethod}</td>
        </tr>
        ${data.trackingNumber ? `
          <tr>
            <td style="padding: 12px 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">Tracking (AWB):</td>
            <td style="padding: 12px 16px; border-top: 1px solid #e2e8f0; font-size: 12px; font-family: monospace; font-weight: bold; color: #2563eb; text-align: right;">${data.trackingNumber} (${data.courierPartner || 'Courier'})</td>
          </tr>
        ` : ''}
      </table>

      <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
        Order Items (${data.items.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tbody>
          ${productRows}
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Items Subtotal:</td>
          <td style="padding: 4px 0; text-align: right; color: #0f172a;">₹${(data.subtotal + (data.discount || 0)).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Shipping Fee:</td>
          <td style="padding: 4px 0; text-align: right; font-weight: bold; color: ${data.shippingCharge === 0 ? '#16a34a' : '#0f172a'};">
            ${data.shippingCharge === 0 ? 'FREE' : `₹${data.shippingCharge}`}
          </td>
        </tr>
        ${data.discount && data.discount > 0 ? `
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Discount Applied:</td>
            <td style="padding: 4px 0; text-align: right; color: #16a34a; font-weight: bold;">-₹${data.discount.toLocaleString('en-IN')}</td>
          </tr>
        ` : ''}
        ${data.paymentMethod.toUpperCase().includes('COD') ? `<tr><td style="padding: 4px 0; color: #64748b;">COD Charge:</td><td style="padding: 4px 0; text-align: right; color: #0f172a; font-weight: bold;">₹${Number(data.codCharge || 0).toLocaleString('en-IN')}</td></tr>` : ''}
        <tr>
          <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 900; color: #0f172a; border-top: 2px solid #e2e8f0;">Grand Total:</td>
          <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 900; color: #0f172a; text-align: right; border-top: 2px solid #e2e8f0;">₹${data.grandTotal.toLocaleString('en-IN')}</td>
        </tr>
      </table>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.5px;">
          Delivery Destination
        </h4>
        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #0f172a;">${data.customerName}</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569; line-height: 1.5;">${data.shippingAddress}</p>
        ${data.customerPhone ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-family: monospace;">📱 Mobile: ${data.customerPhone}</p>` : ''}
      </div>

      <div style="text-align: center; margin: 28px 0 12px 0;">
        <a href="${trackingUrl}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 13px; font-weight: 800; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          View Live Order & Tracking
        </a>
      </div>

    </div>

    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5;">
      <p style="margin: 0 0 6px 0;">
        Need help with this order? Reply directly to this email at 
        <a href="mailto:sales@sastabazaronline.in" style="color: #0f172a; font-weight: bold; text-decoration: underline;">sales@sastabazaronline.in</a>.
      </p>
      <p style="margin: 0;">
        © ${new Date().getFullYear()} SASTABAZARONLINE. Owned and operated by ADHYEY BROTHERS. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
  `;

  return { subject: current.subject, html };
}
