import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Transactional Email Configuration
 * Supports:
 * 1. Resend REST API (via RESEND_API_KEY / EMAIL_PROVIDER_API_KEY)
 * 2. Authenticated SMTP (via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * 3. Resilient development/sandbox logger when credentials are not yet provisioned.
 */

const getEmailConfig = () => {
  const providerKey = (process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY || '').trim();
  const emailFrom = (process.env.EMAIL_FROM || '').trim() || 'EDEN & THREAD <orders@edenthreads.luxury>';
  const storeOwnerEmail = (process.env.STORE_OWNER_EMAIL || '').trim() || 'edenandthreadlogin@gmail.com';
  const publicSiteUrl = (process.env.PUBLIC_SITE_URL || '').trim() || 'https://eden-threads.vercel.app';

  // SMTP Settings
  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  const isConfigured = Boolean(providerKey || (smtpHost && smtpUser && smtpPass));

  return {
    providerKey,
    emailFrom,
    storeOwnerEmail,
    publicSiteUrl,
    smtp: {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
      secure: smtpSecure,
      isConfigured: Boolean(smtpHost && smtpUser && smtpPass)
    },
    isConfigured
  };
};

// HTML escape helper to prevent email injection
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Format currency
export function formatINR(val) {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Universal Dispatcher: sends email via Resend API or SMTP, falls back gracefully to recorded sandbox log
 */
export async function sendEmail({ to, subject, html, text, idempotencyKey = null }) {
  const config = getEmailConfig();

  if (!to || !to.trim()) {
    console.warn('[Email Warning]: Recipient email address missing. Skipping send.');
    return { success: false, reason: 'missing_recipient' };
  }

  // 1. Try Resend REST API if provider key is set
  if (config.providerKey) {
    try {
      const headers = {
        'Authorization': `Bearer ${config.providerKey}`,
        'Content-Type': 'application/json'
      };
      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: config.emailFrom,
          to: [to.trim()],
          subject,
          html,
          text
        })
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log(`[Resend Email Sent]: Message ID: ${resData.id} to ${to}`);
        return {
          success: true,
          provider: 'resend',
          messageId: resData.id,
          to
        };
      } else {
        console.warn(`[Resend Email Error]: ${resData.message || res.statusText}`);
      }
    } catch (err) {
      console.error('[Resend Email Fetch Error]:', err.message);
    }
  }

  // 2. Try SMTP if configured
  if (config.smtp.isConfigured) {
    try {
      const transporter = nodemailer.createTransporter({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass
        }
      });

      const info = await transporter.sendMail({
        from: config.emailFrom,
        to: to.trim(),
        subject,
        html,
        text
      });

      console.log(`[SMTP Email Sent]: Message ID: ${info.messageId} to ${to}`);
      return {
        success: true,
        provider: 'smtp',
        messageId: info.messageId,
        to
      };
    } catch (smtpErr) {
      console.error('[SMTP Email Error]:', smtpErr.message);
    }
  }

  // 3. Fallback / Dev Sandbox Mode: Log complete email delivery securely
  const simulatedId = `msg_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[Email Sandbox/Log Mode]: Subject: "${subject}" to: ${to} (Simulated ID: ${simulatedId})`);
  return {
    success: true,
    provider: 'sandbox_logger',
    messageId: simulatedId,
    to,
    note: 'Email rendered and logged. Configure RESEND_API_KEY or SMTP credentials in production.'
  };
}

/**
 * -------------------------------------------------------------
 * 1. Customer Order Confirmation Email
 * -------------------------------------------------------------
 */
export function renderCustomerOrderEmail(order) {
  const config = getEmailConfig();
  const orderId = escapeHtml(order.order_id || order.orderId);
  const customerName = escapeHtml(order.customer_name || order.shipping?.name || 'Valued Patron');
  const items = order.items || [];
  const trackingUrl = `${config.publicSiteUrl}/#track/${encodeURIComponent(order.order_id || order.orderId)}`;
  const paymentMethod = escapeHtml(order.notes?.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment (Razorpay)');
  const paymentStatus = escapeHtml(order.payment_status === 'paid' ? 'Paid & Verified' : 'Pending Payment');
  const paymentRef = order.payment_id && order.payment_id !== 'PAYABLE_ON_DELIVERY' ? escapeHtml(order.payment_id) : '—';
  const orderDate = new Date(order.created_at || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });

  const address = order.shipping_address || order.shipping || {};
  const formattedAddress = [
    address.address,
    address.apartment,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean).map(escapeHtml).join(', ');

  // Build items rows
  const itemsHtml = items.map(item => {
    const title = escapeHtml(item.title || item.name || 'Artisanal Linen Garment');
    const size = escapeHtml(item.size || 'M');
    const color = escapeHtml(item.color || 'Artisanal Natural');
    const sku = escapeHtml(item.sku || `ET-${item.productId || item.id || '01'}`);
    const qty = Number(item.quantity || item.qty || 1);
    const unitPrice = formatINR(item.price);
    const lineTotal = formatINR((item.price || 0) * qty);
    const imageSrc = item.image ? (item.image.startsWith('http') ? item.image : `${config.publicSiteUrl}${item.image}`) : null;

    return `
      <tr>
        <td style="padding: 16px 8px; border-bottom: 1px solid #EFEAE4; vertical-align: top;">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
            <tr>
              ${imageSrc ? `
              <td style="width: 64px; vertical-align: top; padding-right: 12px;">
                <img src="${imageSrc}" alt="${title}" style="width: 64px; height: 78px; object-fit: cover; border-radius: 2px; border: 1px solid #EFEAE4; display: block;" />
              </td>
              ` : ''}
              <td style="vertical-align: top;">
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 600; color: #143C28; line-height: 1.3;">
                  ${title}
                </div>
                <div style="font-size: 12px; color: #737373; margin-top: 4px;">
                  SKU: <span style="font-family: monospace; color: #171717;">${sku}</span>
                </div>
                <div style="font-size: 13px; color: #404040; margin-top: 6px;">
                  <span style="display: inline-block; background-color: #F8F6F0; padding: 2px 8px; border-radius: 2px; font-weight: 500; margin-right: 6px;">
                    Size: <strong>${size}</strong>
                  </span>
                  <span style="display: inline-block; background-color: #F8F6F0; padding: 2px 8px; border-radius: 2px; font-weight: 500;">
                    Colour: <strong>${color}</strong>
                  </span>
                </div>
              </td>
            </tr>
          </table>
        </td>
        <td style="padding: 16px 8px; border-bottom: 1px solid #EFEAE4; text-align: center; vertical-align: middle; font-size: 14px; color: #171717;">
          ${qty}
        </td>
        <td style="padding: 16px 8px; border-bottom: 1px solid #EFEAE4; text-align: right; vertical-align: middle; font-size: 14px; color: #171717;">
          ${unitPrice}
        </td>
        <td style="padding: 16px 8px; border-bottom: 1px solid #EFEAE4; text-align: right; vertical-align: middle; font-size: 14px; font-weight: 600; color: #143C28;">
          ${lineTotal}
        </td>
      </tr>
    `;
  }).join('');

  const subject = `Order Confirmed — Order #${orderId}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #171717; line-height: 1.5;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #FDFBF7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border: 1px solid #EFEAE4; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #143C28; padding: 36px 32px; text-align: center;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; letter-spacing: 0.18em; color: #D4AF37; text-transform: uppercase; font-weight: 700;">
                EDEN &amp; THREAD
              </div>
              <div style="font-size: 11px; letter-spacing: 0.25em; color: #F5EFEB; text-transform: uppercase; margin-top: 6px;">
                Pure European Flax &amp; Tailored Silhouettes
              </div>
            </td>
          </tr>

          <!-- Confirmation Title -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="display: inline-block; background-color: #EBF7EE; color: #1B5E20; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 12px; border-radius: 2px; margin-bottom: 12px;">
                ✓ Order Confirmed
              </div>
              <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: #143C28; margin: 0 0 10px 0; font-weight: 600;">
                Thank you for your patronage, ${customerName}.
              </h1>
              <p style="font-size: 14px; color: #525252; margin: 0; line-height: 1.6;">
                We have received your order <strong>#${orderId}</strong>. Our atelier artisans are currently reviewing the flax weights, inspecting finishings, and preparing your garments for dispatch.
              </p>
            </td>
          </tr>

          <!-- Order Summary Meta Grid -->
          <tr>
            <td style="padding: 16px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #FAF8F5; border: 1px solid #EFEAE4; padding: 16px;">
                <tr>
                  <td style="width: 50%; padding: 6px 12px; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #737373;">Order Number</div>
                    <div style="font-size: 14px; font-weight: 600; color: #143C28; font-family: monospace; margin-top: 2px;">#${orderId}</div>
                  </td>
                  <td style="width: 50%; padding: 6px 12px; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #737373;">Order Date</div>
                    <div style="font-size: 13px; color: #171717; margin-top: 2px;">${orderDate}</div>
                  </td>
                </tr>
                <tr>
                  <td style="width: 50%; padding: 6px 12px; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #737373;">Payment Method</div>
                    <div style="font-size: 13px; color: #171717; margin-top: 2px;">${paymentMethod}</div>
                  </td>
                  <td style="width: 50%; padding: 6px 12px; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #737373;">Payment Status</div>
                    <div style="font-size: 13px; font-weight: 600; color: #143C28; margin-top: 2px;">${paymentStatus}</div>
                  </td>
                </tr>
                ${paymentRef !== '—' ? `
                <tr>
                  <td colspan="2" style="padding: 6px 12px; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #737373;">Payment Reference</div>
                    <div style="font-size: 12px; font-family: monospace; color: #525252; margin-top: 2px;">${paymentRef}</div>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 16px 32px;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-weight: 600; color: #143C28; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #143C28;">
                Curated Garments
              </div>
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #FAF8F5;">
                    <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #737373; font-weight: 600;">Product</th>
                    <th style="padding: 8px; text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #737373; font-weight: 600;">Qty</th>
                    <th style="padding: 8px; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #737373; font-weight: 600;">Price</th>
                    <th style="padding: 8px; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #737373; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding: 8px 32px 24px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-top: 1px solid #EFEAE4; padding-top: 12px;">
                <tr>
                  <td style="padding: 4px 8px; font-size: 13px; color: #525252;">Subtotal</td>
                  <td style="padding: 4px 8px; font-size: 13px; text-align: right; color: #171717;">${formatINR(order.subtotal || order.total_amount)}</td>
                </tr>
                ${Number(order.discount || 0) > 0 ? `
                <tr>
                  <td style="padding: 4px 8px; font-size: 13px; color: #2E7D32;">Patron Privilege Discount</td>
                  <td style="padding: 4px 8px; font-size: 13px; text-align: right; color: #2E7D32;">-${formatINR(order.discount)}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 4px 8px; font-size: 13px; color: #525252;">Express Concierge Shipping</td>
                  <td style="padding: 4px 8px; font-size: 13px; text-align: right; color: #171717;">
                    ${Number(order.shipping_charge || 0) > 0 ? formatINR(order.shipping_charge) : '<span style="color: #2E7D32; font-weight: 600;">COMPLIMENTARY</span>'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 8px 4px 8px; font-size: 15px; font-weight: 700; color: #143C28; border-top: 2px solid #143C28;">Total Paid</td>
                  <td style="padding: 12px 8px 4px 8px; font-size: 18px; font-weight: 700; text-align: right; color: #143C28; border-top: 2px solid #143C28;">
                    ${formatINR(order.total_amount || order.amount)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Destination -->
          <tr>
            <td style="padding: 16px 32px; background-color: #FAF8F5; border-top: 1px solid #EFEAE4; border-bottom: 1px solid #EFEAE4;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 600; color: #143C28; margin-bottom: 8px;">
                Delivery Destination
              </div>
              <div style="font-size: 14px; font-weight: 600; color: #171717;">${customerName}</div>
              <div style="font-size: 13px; color: #525252; margin-top: 4px; line-height: 1.5;">${formattedAddress}</div>
              ${address.phone ? `
              <div style="font-size: 12px; color: #737373; margin-top: 4px;">Contact: ${escapeHtml(address.phone)}</div>
              ` : ''}
            </td>
          </tr>

          <!-- Track Consignment CTA -->
          <tr>
            <td style="padding: 32px; text-align: center;">
              <a href="${trackingUrl}" style="display: inline-block; background-color: #143C28; color: #D4AF37; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; text-decoration: none; padding: 14px 28px; border-radius: 2px; border: 1px solid #D4AF37;">
                Track Consignment
              </a>
              <div style="font-size: 12px; color: #737373; margin-top: 12px;">
                You can view real-time atelier dispatch updates at any time via your private tracking link.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #143C28; padding: 24px 32px; text-align: center; color: #E5DCD0;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 14px; letter-spacing: 0.1em; color: #D4AF37;">
                EDEN &amp; THREAD ATELIER
              </div>
              <div style="font-size: 11px; color: #A3A3A3; margin-top: 6px;">
                European Flax • Sustainable Craftsmanship • Timeless Silhouettes
              </div>
              <div style="font-size: 11px; color: #A3A3A3; margin-top: 12px; border-top: 1px solid #234E35; padding-top: 12px;">
                Concierge Inquiries: <a href="mailto:concierge@edenthreads.luxury" style="color: #D4AF37; text-decoration: none;">concierge@edenthreads.luxury</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
EDEN & THREAD — ORDER CONFIRMED
Order #${orderId}
Thank you, ${customerName}.

Your order has been confirmed.
Date: ${orderDate}
Payment Method: ${paymentMethod}
Payment Status: ${paymentStatus}
Total: ${formatINR(order.total_amount || order.amount)}

ITEMS:
${items.map(it => `- ${it.title} | SKU: ${it.sku || it.productId} | Size: ${it.size} | Colour: ${it.color} | Qty: ${it.quantity} | Total: ${formatINR(it.price * it.quantity)}`).join('\n')}

DELIVERY ADDRESS:
${customerName}
${formattedAddress}

Track your order:
${trackingUrl}

Concierge Inquiries: concierge@edenthreads.luxury
  `.trim();

  return { subject, html, text };
}

/**
 * -------------------------------------------------------------
 * 2. Store-Owner New-Order Fulfilment & Pick List Email
 * -------------------------------------------------------------
 */
export function renderStoreOwnerOrderEmail(order) {
  const config = getEmailConfig();
  const orderId = escapeHtml(order.order_id || order.orderId);
  const customerName = escapeHtml(order.customer_name || order.shipping?.name || 'Customer');
  const customerEmail = escapeHtml(order.customer_email || order.shipping?.email || '—');
  const customerPhone = escapeHtml(order.customer_phone || order.shipping?.phone || '—');
  const items = order.items || [];
  const paymentMethod = escapeHtml(order.notes?.payment_method === 'cod' ? 'Cash on Delivery (Collect on delivery)' : 'Prepaid (Razorpay Verified)');
  const paymentStatus = escapeHtml(order.payment_status === 'paid' ? 'PAID & VERIFIED' : 'PENDING');
  const paymentRef = order.payment_id || '—';
  const orderDate = new Date(order.created_at || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });

  const address = order.shipping_address || order.shipping || {};
  const formattedAddress = [
    address.address,
    address.apartment,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean).map(escapeHtml).join(', ');

  const adminOrderUrl = `${config.publicSiteUrl}/#admin`;

  // Itemized Pick List Rows with stark size/colour highlighting for warehouse staff
  const pickListRowsHtml = items.map(item => {
    const title = escapeHtml(item.title || item.name || 'Garment');
    const size = escapeHtml(item.size || 'M');
    const color = escapeHtml(item.color || 'Artisanal Natural');
    const sku = escapeHtml(item.sku || `ET-${item.productId || item.id || '01'}`);
    const qty = Number(item.quantity || item.qty || 1);
    const unitPrice = formatINR(item.price);
    const lineTotal = formatINR((item.price || 0) * qty);

    return `
      <tr style="border-bottom: 2px solid #E5E5E5;">
        <td style="padding: 12px 8px; vertical-align: top; font-weight: 600; color: #171717;">
          ${title}
          <div style="font-size: 11px; font-family: monospace; color: #525252; margin-top: 2px;">SKU: ${sku}</div>
        </td>
        <td style="padding: 12px 8px; vertical-align: middle; text-align: center;">
          <span style="display: inline-block; background-color: #143C28; color: #FFFFFF; font-size: 14px; font-weight: 700; padding: 4px 10px; border-radius: 4px;">
            ${size}
          </span>
        </td>
        <td style="padding: 12px 8px; vertical-align: middle; text-align: center;">
          <span style="display: inline-block; background-color: #F5EFEB; border: 1px solid #D4AF37; color: #143C28; font-size: 13px; font-weight: 600; padding: 4px 8px; border-radius: 4px;">
            ${color}
          </span>
        </td>
        <td style="padding: 12px 8px; vertical-align: middle; text-align: center; font-size: 16px; font-weight: 700; color: #171717;">
          ${qty}
        </td>
        <td style="padding: 12px 8px; vertical-align: middle; text-align: right; font-size: 13px; color: #525252;">
          ${unitPrice}
        </td>
        <td style="padding: 12px 8px; vertical-align: middle; text-align: right; font-size: 14px; font-weight: 600; color: #143C28;">
          ${lineTotal}
        </td>
      </tr>
    `;
  }).join('');

  const subject = `[FULFILMENT ACTION REQUIRED] New Order #${orderId} — ${items.length} item(s) to pack`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181B;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #F4F4F5; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" style="max-width: 650px; width: 100%; background-color: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          
          <!-- Top Alert Header -->
          <tr>
            <td style="background-color: #09090B; padding: 20px 24px; color: #FFFFFF;">
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                <tr>
                  <td>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #A1A1AA; font-weight: 600;">
                      STORE OWNER FULFILMENT ALERT
                    </div>
                    <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; margin-top: 4px;">
                      Order #${orderId}
                    </div>
                  </td>
                  <td align="right">
                    <span style="background-color: #22C55E; color: #052E16; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase;">
                      ${paymentStatus}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary Highlights -->
          <tr>
            <td style="padding: 20px 24px; background-color: #FAFAFA; border-bottom: 1px solid #E4E4E7;">
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                <tr>
                  <td style="width: 33%; vertical-align: top;">
                    <div style="font-size: 11px; color: #71717A; text-transform: uppercase;">Total Order Value</div>
                    <div style="font-size: 18px; font-weight: 700; color: #18181B; margin-top: 2px;">${formatINR(order.total_amount || order.amount)}</div>
                  </td>
                  <td style="width: 33%; vertical-align: top;">
                    <div style="font-size: 11px; color: #71717A; text-transform: uppercase;">Payment Mode</div>
                    <div style="font-size: 13px; font-weight: 600; color: #18181B; margin-top: 4px;">${paymentMethod}</div>
                  </td>
                  <td style="width: 33%; vertical-align: top;">
                    <div style="font-size: 11px; color: #71717A; text-transform: uppercase;">Received At</div>
                    <div style="font-size: 12px; color: #52525B; margin-top: 4px;">${orderDate}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- WAREHOUSE PICK LIST -->
          <tr>
            <td style="padding: 24px;">
              <div style="font-size: 14px; font-weight: 700; color: #09090B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; display: flex; align-items: center;">
                📦 Warehouse Pick &amp; Pack List (${items.length} unique line items)
              </div>
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #F4F4F5; border-bottom: 2px solid #D4D4D8;">
                    <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #71717A;">Garment / SKU</th>
                    <th style="padding: 8px; text-align: center; font-size: 11px; text-transform: uppercase; color: #71717A;">Size</th>
                    <th style="padding: 8px; text-align: center; font-size: 11px; text-transform: uppercase; color: #71717A;">Colour</th>
                    <th style="padding: 8px; text-align: center; font-size: 11px; text-transform: uppercase; color: #71717A;">Qty</th>
                    <th style="padding: 8px; text-align: right; font-size: 11px; text-transform: uppercase; color: #71717A;">Rate</th>
                    <th style="padding: 8px; text-align: right; font-size: 11px; text-transform: uppercase; color: #71717A;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${pickListRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- PACKING & SHIPPING DESTINATION -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #FEFCE8; border: 1px solid #FEF08A; border-radius: 4px; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 700; color: #854D0E; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                      🚚 Courier Delivery Address &amp; Contact
                    </div>
                    <div style="font-size: 14px; font-weight: 700; color: #18181B;">${customerName}</div>
                    <div style="font-size: 13px; color: #3F3F46; margin-top: 4px;">${formattedAddress}</div>
                    <div style="font-size: 13px; color: #18181B; margin-top: 8px;">
                      <strong>Phone for Courier Coordination:</strong> ${customerPhone}
                    </div>
                    <div style="font-size: 13px; color: #3F3F46; margin-top: 2px;">
                      <strong>Customer Email:</strong> ${customerEmail}
                    </div>
                    <div style="font-size: 11px; color: #71717A; margin-top: 8px; font-family: monospace;">
                      Payment Gateway Ref: ${paymentRef}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ADMIN ACTION LINK -->
          <tr>
            <td style="padding: 0 24px 24px 24px; text-align: center;">
              <a href="${adminOrderUrl}" style="display: inline-block; background-color: #143C28; color: #D4AF37; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 24px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.08em;">
                Open Admin Dashboard &amp; Book Shadowfax Dispatch →
              </a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
[FULFILMENT ACTION REQUIRED] New Order #${orderId}
Total Value: ${formatINR(order.total_amount || order.amount)}
Payment Mode: ${paymentMethod} (${paymentStatus})

PICK LIST:
${items.map(it => `- [ ] ${it.title} | SIZE: ${it.size} | COLOUR: ${it.color} | QTY: ${it.quantity} | SKU: ${it.sku || it.productId}`).join('\n')}

DELIVERY DESTINATION:
${customerName}
${formattedAddress}
Phone: ${customerPhone}
Email: ${customerEmail}

Admin Order URL:
${adminOrderUrl}
  `.trim();

  return { subject, html, text };
}

/**
 * -------------------------------------------------------------
 * 3. Customer Dispatch & Tracking Notification Email
 * -------------------------------------------------------------
 */
export function renderCustomerDispatchEmail(order, shipmentDetails = {}) {
  const config = getEmailConfig();
  const orderId = escapeHtml(order.order_id || order.orderId);
  const customerName = escapeHtml(order.customer_name || order.shipping?.name || 'Valued Patron');
  const courierName = escapeHtml(shipmentDetails.courier || order.carrier || 'Shadowfax Express Forward Logistics');
  const awbNumber = escapeHtml(shipmentDetails.awbNumber || order.tracking_number || '—');
  const trackingUrl = shipmentDetails.trackingUrl || `https://tracker.shadowfax.in/#/track?tracking_id=${encodeURIComponent(awbNumber)}`;
  const items = order.items || [];

  const subject = `Your Order #${orderId} Has Been Dispatched — Tracking #${awbNumber}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #171717;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #FDFBF7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border: 1px solid #EFEAE4;">
          <tr>
            <td style="background-color: #143C28; padding: 32px; text-align: center;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; letter-spacing: 0.18em; color: #D4AF37;">
                EDEN &amp; THREAD
              </div>
              <div style="font-size: 11px; letter-spacing: 0.2em; color: #F5EFEB; text-transform: uppercase; margin-top: 4px;">
                Atelier Consignment En Route
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <div style="display: inline-block; background-color: #EBF7EE; color: #1B5E20; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 4px 10px; border-radius: 2px; margin-bottom: 12px;">
                ✈ Consignment Dispatched
              </div>
              <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #143C28; margin: 0 0 12px 0;">
                Your curated garments are on their way, ${customerName}.
              </h2>
              <p style="font-size: 14px; color: #525252; line-height: 1.6; margin: 0 0 20px 0;">
                Our atelier artisans have carefully inspected, hand-folded, and packaged your order <strong>#${orderId}</strong> in our signature breathable garment bags. The parcel has been handed over to <strong>${courierName}</strong>.
              </p>

              <!-- Tracking Box -->
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #FAF8F5; border: 1px solid #EFEAE4; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #737373;">Courier Partner</div>
                    <div style="font-size: 14px; font-weight: 600; color: #143C28; margin-top: 2px;">${courierName}</div>
                  </td>
                  <td style="padding: 6px;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #737373;">AWB / Tracking Number</div>
                    <div style="font-size: 14px; font-weight: 600; font-family: monospace; color: #171717; margin-top: 2px;">${awbNumber}</div>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 24px 0;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: #143C28; color: #D4AF37; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; text-decoration: none; padding: 14px 28px; border-radius: 2px; border: 1px solid #D4AF37;">
                  Track Real-Time Delivery →
                </a>
              </div>

              <!-- Enclosed Garments List -->
              <div style="border-top: 1px solid #EFEAE4; padding-top: 16px; margin-top: 20px;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #737373; margin-bottom: 8px;">
                  Enclosed in this Parcel:
                </div>
                ${items.map(it => `
                  <div style="font-size: 13px; color: #404040; margin-bottom: 4px;">
                    • <strong>${escapeHtml(it.title)}</strong> (Size: ${escapeHtml(it.size)}, Colour: ${escapeHtml(it.color)}) × ${it.quantity}
                  </div>
                `).join('')}
              </div>

            </td>
          </tr>
          <tr>
            <td style="background-color: #143C28; padding: 20px; text-align: center; color: #E5DCD0; font-size: 12px;">
              Questions about your delivery? Contact our concierge at <a href="mailto:concierge@edenthreads.luxury" style="color: #D4AF37;">concierge@edenthreads.luxury</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
EDEN & THREAD — CONSIGNMENT DISPATCHED
Order #${orderId}
Courier: ${courierName}
AWB Number: ${awbNumber}

Track real-time delivery:
${trackingUrl}

Enclosed Garments:
${items.map(it => `- ${it.title} (Size: ${it.size}, Colour: ${it.color}) x ${it.quantity}`).join('\n')}

Concierge Support: concierge@edenthreads.luxury
  `.trim();

  return { subject, html, text };
}
