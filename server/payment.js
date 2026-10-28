import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import {
  supabaseAdmin,
  calculateAuthoritativeOrder,
  reserveInventoryFCFS,
  commitInventoryReservation,
  releaseInventoryReservation,
  cleanupExpiredReservations,
  recordWebhookEvent,
  recordServerPaymentTransaction,
  RESERVATION_TTL_MINUTES
} from "./supabase.js";
import {
  sendEmail,
  renderCustomerOrderEmail,
  renderStoreOwnerOrderEmail
} from "./email.js";

dotenv.config();

const router = express.Router();

const getRazorpayKeys = () => {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim() || "rzp_test_TrmfyllGcVE3Zv";
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim() || "a1iU8Gd6Ff2UTPBtAZ3H9iyg";
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim() || keySecret;
  const configId = (process.env.RAZORPAY_CONFIG_ID || "").trim() || "config_Tsrko6CbrIPYEM";
  return { keyId, keySecret, webhookSecret, configId };
};

const getRazorpayClient = () => {
  const { keyId, keySecret } = getRazorpayKeys();
  if (keyId && keySecret && !keyId.includes("5173EdenThreads")) {
    try {
      return new Razorpay({ key_id: keyId, key_secret: keySecret });
    } catch (err) {
      console.warn("[Razorpay Init Warning]:", err.message);
    }
  }
  return null;
};

/**
 * Idempotently dispatches Customer Confirmation & Store Owner Notification emails.
 * Deduplicates using orders.notes.email_notifications to guarantee no repeated emails.
 */
export async function dispatchOrderConfirmationEmails(order) {
  if (!order || !order.order_id) return { success: false, reason: 'invalid_order' };

  try {
    // Check if order already has email confirmation logged in notes
    const currentNotes = order.notes || {};
    const emailNotifs = currentNotes.email_notifications || {};

    if (emailNotifs.customer_confirmed_at && emailNotifs.owner_notified_at) {
      console.log(`[Email Idempotency]: Confirmation emails already dispatched for order ${order.order_id}. Skipping.`);
      return { success: true, duplicate: true };
    }

    const customerEmail = order.customer_email || order.shipping_address?.email;
    const ownerEmail = process.env.STORE_OWNER_EMAIL || 'edenandthreadlogin@gmail.com';

    const updatedNotifs = { ...emailNotifs };

    // 1. Send Customer Order Confirmation Email
    if (customerEmail && !emailNotifs.customer_confirmed_at) {
      try {
        const customerMailPayload = renderCustomerOrderEmail(order);
        const sendRes = await sendEmail({
          to: customerEmail,
          subject: customerMailPayload.subject,
          html: customerMailPayload.html,
          text: customerMailPayload.text,
          idempotencyKey: `cust_confirm_${order.order_id}`
        });

        if (sendRes.success) {
          updatedNotifs.customer_confirmed_at = new Date().toISOString();
          updatedNotifs.customer_message_id = sendRes.messageId;
        }
      } catch (custErr) {
        console.error(`[Customer Email Error for ${order.order_id}]:`, custErr.message);
      }
    }

    // 2. Send Store Owner Pick List & Fulfilment Alert Email
    if (ownerEmail && !emailNotifs.owner_notified_at) {
      try {
        const ownerMailPayload = renderStoreOwnerOrderEmail(order);
        const sendRes = await sendEmail({
          to: ownerEmail,
          subject: ownerMailPayload.subject,
          html: ownerMailPayload.html,
          text: ownerMailPayload.text,
          idempotencyKey: `owner_alert_${order.order_id}`
        });

        if (sendRes.success) {
          updatedNotifs.owner_notified_at = new Date().toISOString();
          updatedNotifs.owner_message_id = sendRes.messageId;
        }
      } catch (ownerErr) {
        console.error(`[Owner Email Error for ${order.order_id}]:`, ownerErr.message);
      }
    }

    // Update orders.notes with notification records in Supabase
    if (supabaseAdmin) {
      await supabaseAdmin.from('orders').update({
        notes: {
          ...currentNotes,
          email_notifications: updatedNotifs
        }
      }).eq('order_id', order.order_id);
    }

    return {
      success: true,
      customerEmailSent: Boolean(updatedNotifs.customer_confirmed_at),
      ownerEmailSent: Boolean(updatedNotifs.owner_notified_at)
    };
  } catch (err) {
    console.error(`[Order Email Dispatch Error for ${order.order_id}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * GET /api/payment/config
 * Exposes active public Razorpay Key ID and test mode status to frontend
 */
router.get("/config", (req, res) => {
  const { keyId, configId } = getRazorpayKeys();
  res.json({
    keyId: keyId,
    configId: configId,
    currency: "INR",
    isTestMode: keyId.startsWith("rzp_test_"),
    brandName: "EDEN & THREAD",
    supportEmail: "concierge@edenthreads.luxury",
    themeColor: "#143C28",
    reservationTtlMinutes: RESERVATION_TTL_MINUTES
  });
});

/**
 * POST /api/payment/create-order
 * Authoritatively calculates prices, executes FCFS inventory reservation,
 * and creates Razorpay Order or COD Order with idempotency protection.
 */
router.post("/create-order", async (req, res) => {
  try {
    const {
      items,
      couponCode,
      shippingDetails,
      paymentMethod = "razorpay",
      idempotencyKey,
      notes = {}
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your shopping bag is empty."
      });
    }

    if (!shippingDetails || !shippingDetails.name || !shippingDetails.address || !shippingDetails.city) {
      return res.status(400).json({
        success: false,
        message: "Incomplete shipping information."
      });
    }

    const { keyId, configId } = getRazorpayKeys();
    const razorpayClient = getRazorpayClient();

    // 1. Idempotency Check: if idempotencyKey supplied, return existing active order
    if (idempotencyKey && typeof idempotencyKey === 'string') {
      const { data: existingOrders } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('payment_status', 'pending');

      const existingOrder = (existingOrders || []).find(o => o.notes?.idempotency_key === idempotencyKey);

      if (existingOrder) {
        const isStillActive = existingOrder.payment_status === 'pending' &&
          existingOrder.notes?.reservation_expires_at &&
          new Date(existingOrder.notes.reservation_expires_at) > new Date();

        if (isStillActive) {
          return res.json({
            success: true,
            idempotent: true,
            orderId: existingOrder.order_id,
            razorpayOrderId: existingOrder.payment_id || existingOrder.order_id,
            amount: existingOrder.total_amount,
            amountInPaise: Math.round(Number(existingOrder.total_amount) * 100),
            currency: existingOrder.currency,
            keyId: keyId,
            configId: configId,
            reservationExpiresAt: existingOrder.notes.reservation_expires_at,
            ttlMinutes: RESERVATION_TTL_MINUTES
          });
        }
      }
    }

    // 2. Authoritative Price Calculation (prevents client price tampering)
    const calculation = await calculateAuthoritativeOrder({
      items,
      couponCode,
      shippingDetails
    });

    const internalOrderId = `eden_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 3. Atomic FCFS Inventory Reservation
    const reservationResult = await reserveInventoryFCFS({
      orderId: internalOrderId,
      items: calculation.items,
      ttlMinutes: RESERVATION_TTL_MINUTES
    });

    if (!reservationResult.success) {
      return res.status(409).json({
        success: false,
        errorCode: reservationResult.errorCode || 'INSUFFICIENT_STOCK',
        productId: reservationResult.productId,
        productTitle: reservationResult.productTitle,
        available: reservationResult.available,
        requested: reservationResult.requested,
        message: reservationResult.message || 'Requested inventory is no longer available.'
      });
    }

    const reservationExpiresAt = reservationResult.expiresAt;

    // 4. Handle Cash on Delivery (COD) Flow
    if (paymentMethod === "cod") {
      const { error: codErr } = await supabaseAdmin
        .from('orders')
        .insert([{
          order_id: internalOrderId,
          customer_name: shippingDetails.name,
          customer_email: shippingDetails.email,
          customer_phone: shippingDetails.phone || null,
          shipping_address: shippingDetails,
          items: calculation.items,
          subtotal: calculation.subtotal,
          discount: calculation.discount,
          total_amount: calculation.finalTotal,
          currency: 'INR',
          payment_id: 'PAYABLE_ON_DELIVERY',
          payment_status: 'pending',
          order_status: 'Placed',
          notes: {
            ...notes,
            idempotency_key: idempotencyKey || null,
            payment_method: 'cod',
            reservation_expires_at: reservationExpiresAt,
            applied_coupon: calculation.appliedCoupon
          }
        }]);

      if (codErr) {
        await releaseInventoryReservation({ orderId: internalOrderId, reason: 'order_creation_failed' });
        throw new Error(`Failed to record COD order: ${codErr.message}`);
      }

      // Trigger asynchronous email dispatch for COD order
      dispatchOrderConfirmationEmails({
        order_id: internalOrderId,
        customer_name: shippingDetails.name,
        customer_email: shippingDetails.email,
        customer_phone: shippingDetails.phone || null,
        shipping_address: shippingDetails,
        items: calculation.items,
        subtotal: calculation.subtotal,
        discount: calculation.discount,
        total_amount: calculation.finalTotal,
        currency: 'INR',
        payment_id: 'PAYABLE_ON_DELIVERY',
        payment_status: 'pending',
        order_status: 'Placed',
        notes: {
          payment_method: 'cod'
        }
      }).catch(err => console.error('[Async COD Email Dispatch Warning]:', err.message));

      return res.json({
        success: true,
        orderId: internalOrderId,
        paymentMethod: 'cod',
        amount: calculation.finalTotal,
        amountInPaise: calculation.amountInPaise,
        currency: 'INR',
        reservationExpiresAt,
        ttlMinutes: RESERVATION_TTL_MINUTES,
        message: "Cash on delivery order placed and inventory reserved."
      });
    }

    // 5. Razorpay Online Order Creation
    let rzpOrder = null;
    if (razorpayClient) {
      try {
        rzpOrder = await razorpayClient.orders.create({
          amount: calculation.amountInPaise,
          currency: "INR",
          receipt: internalOrderId,
          checkout_config_id: configId || undefined,
          notes: {
            brand: "EDEN & THREAD",
            internal_order_id: internalOrderId,
            customer_email: shippingDetails.email,
            item_count: calculation.items.length,
            ...notes
          }
        });
      } catch (rzpErr) {
        console.error("[Razorpay API Order Creation Failed]:", rzpErr.message);
        // Compensating transaction: release reserved inventory on payment gateway creation failure
        await releaseInventoryReservation({ orderId: internalOrderId, reason: 'razorpay_gateway_failure' });
        return res.status(502).json({
          success: false,
          message: `Payment gateway temporarily unavailable: ${rzpErr.message}`
        });
      }
    }

    const razorpayOrderId = rzpOrder?.id || internalOrderId;

    // 6. Persist order in Supabase (upsert matches the pre-created atomic reservation row)
    const { error: dbErr } = await supabaseAdmin
      .from('orders')
      .upsert([{
        order_id: internalOrderId,
        customer_name: shippingDetails.name,
        customer_email: shippingDetails.email,
        customer_phone: shippingDetails.phone || null,
        shipping_address: shippingDetails,
        items: calculation.items,
        subtotal: calculation.subtotal,
        discount: calculation.discount,
        total_amount: calculation.finalTotal,
        currency: 'INR',
        payment_id: razorpayOrderId,
        payment_status: 'pending',
        order_status: 'Placed',
        notes: {
          ...notes,
          idempotency_key: idempotencyKey || null,
          razorpay_order_id: razorpayOrderId,
          reservation_expires_at: reservationExpiresAt,
          applied_coupon: calculation.appliedCoupon
        }
      }], { onConflict: 'order_id' });

    if (dbErr) {
      await releaseInventoryReservation({ orderId: internalOrderId, reason: 'db_insert_failed' });
      throw new Error(`Failed to initialize order: ${dbErr.message}`);
    }

    return res.json({
      success: true,
      orderId: internalOrderId,
      razorpayOrderId: razorpayOrderId,
      keyId: keyId,
      configId: configId,
      amount: calculation.finalTotal,
      amountInPaise: calculation.amountInPaise,
      currency: "INR",
      reservationExpiresAt: reservationExpiresAt,
      ttlMinutes: RESERVATION_TTL_MINUTES,
      items: calculation.items,
      appliedCoupon: calculation.appliedCoupon
    });
  } catch (error) {
    console.error("[Create Order Error]:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process checkout and reserve inventory."
    });
  }
});

/**
 * POST /api/payment/verify-payment
 * Cryptographically verifies Razorpay signature and commits FCFS inventory reservation.
 */
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id
    } = req.body;

    const { keySecret } = getRazorpayKeys();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Missing Razorpay order ID, payment ID, or signature for verification."
      });
    }

    // 1. Strict HMAC SHA256 Signature Verification
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(razorpay_signature, 'utf8')
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Cryptographic payment signature mismatch. Verification rejected."
      });
    }

    // 2. Fetch internal order and check current state
    const targetOrderId = order_id || razorpay_order_id;
    let { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .or(`order_id.eq.${targetOrderId},payment_id.eq.${razorpay_order_id}`)
      .maybeSingle();

    if (!order) {
      return res.status(404).json({
        success: false,
        verified: true,
        message: "Payment signature valid but internal order record not found."
      });
    }

    // Idempotency: If already paid, return confirmed immediately
    if (order.payment_status === 'paid' && order.order_status === 'Paid') {
      return res.json({
        success: true,
        verified: true,
        orderId: order.order_id,
        paymentId: razorpay_payment_id,
        message: "Payment already verified and committed."
      });
    }

    // 3. Reconcile Reservation Expiry vs Late Payment
    const now = new Date();
    const expiresAtStr = order.notes?.reservation_expires_at;
    const isExpired = expiresAtStr && new Date(expiresAtStr) < now;

    if (isExpired && order.order_status === 'Cancelled') {
      // Late Payment Scenario: customer paid after 10-minute window expired
      console.warn(`[Late Payment Detected]: Order ${order.order_id} was paid after reservation expiry.`);
      await recordServerPaymentTransaction({
        orderId: order.order_id,
        razorpayOrderId,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        amount: order.total_amount,
        currency: order.currency,
        status: "late_payment_reconciliation_needed",
        method: "razorpay",
        verified: true,
        rawResponse: { note: "Paid after reservation expired, flagged for manual dispatch or automated refund" }
      });

      return res.json({
        success: true,
        verified: true,
        latePayment: true,
        orderId: order.order_id,
        message: "Payment captured successfully. Because the checkout reservation window elapsed, our concierge is securing your allocation."
      });
    }

    // 4. Commit Inventory Reservation and Transition State to Paid
    await commitInventoryReservation({
      orderId: order.order_id,
      items: order.items || []
    });

    await recordServerPaymentTransaction({
      orderId: order.order_id,
      razorpayOrderId,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: order.total_amount,
      currency: order.currency,
      status: "verified",
      method: "razorpay",
      verified: true,
      rawResponse: req.body
    });

    // 5. Asynchronously dispatch Customer & Store Owner confirmation emails (idempotent)
    const paidOrderSnapshot = {
      ...order,
      payment_id: razorpay_payment_id,
      payment_status: 'paid',
      order_status: 'Paid'
    };
    dispatchOrderConfirmationEmails(paidOrderSnapshot)
      .catch(err => console.error('[Async Order Email Dispatch Error in verify-payment]:', err.message));

    return res.json({
      success: true,
      verified: true,
      orderId: order.order_id,
      paymentId: razorpay_payment_id,
      status: "Paid & Verified",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Verify Payment Error]:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal error during payment verification"
    });
  }
});

/**
 * POST /api/payment/webhook
 * Official Razorpay Webhook Endpoint
 * Verifies X-Razorpay-Signature with raw request body, handles out-of-order events idempotently.
 */
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const { webhookSecret } = getRazorpayKeys();

    if (!signature) {
      return res.status(400).json({ error: "Missing webhook signature header" });
    }

    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.warn("[Razorpay Webhook Warning]: Invalid signature verification failed.");
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body;
    const eventId = event?.event_id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const eventType = event?.event;

    // Idempotency: Deduplicate webhook event
    const recordResult = await recordWebhookEvent({
      eventId,
      eventType,
      entityId: event?.payload?.payment?.entity?.id || event?.payload?.order?.entity?.id,
      payload: event
    });

    if (recordResult?.duplicate) {
      return res.status(200).json({ status: "ignored_duplicate" });
    }

    console.log(`[Razorpay Webhook Event]: ${eventType} (ID: ${eventId})`);

    // Handle supported payment lifecycle events
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('*')
          .or(`order_id.eq.${razorpayOrderId},payment_id.eq.${razorpayOrderId}`)
          .maybeSingle();

        if (order && order.payment_status !== 'paid') {
          await commitInventoryReservation({
            orderId: order.order_id,
            items: order.items || []
          });

          await recordServerPaymentTransaction({
            orderId: order.order_id,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature: signature,
            amount: paymentEntity?.amount ? paymentEntity.amount / 100 : order.total_amount,
            currency: paymentEntity?.currency || 'INR',
            status: "captured",
            method: "razorpay_webhook",
            verified: true,
            rawResponse: event
          });

          // Dispatch confirmation emails idempotently if browser did not complete callback
          const webhookPaidSnapshot = {
            ...order,
            payment_id: razorpayPaymentId,
            payment_status: 'paid',
            order_status: 'Paid'
          };
          dispatchOrderConfirmationEmails(webhookPaidSnapshot)
            .catch(err => console.error('[Async Webhook Order Email Warning]:', err.message));
        }
      }
    } else if (eventType === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (razorpayOrderId) {
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('*')
          .or(`order_id.eq.${razorpayOrderId},payment_id.eq.${razorpayOrderId}`)
          .maybeSingle();

        if (order && order.payment_status === 'pending') {
          await releaseInventoryReservation({
            orderId: order.order_id,
            reason: `payment_failed: ${paymentEntity?.error_description || 'Gateway decline'}`
          });
        }
      }
    }

    return res.status(200).json({ status: "success", eventId });
  } catch (error) {
    console.error("[Razorpay Webhook Error]:", error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/cleanup-reservations
 * Protected periodic cron cleanup endpoint for releasing expired inventory
 */
router.post("/cleanup-reservations", async (req, res) => {
  const cronSecret = req.headers["x-cron-secret"] || req.query.secret;
  const expectedSecret = process.env.CRON_SECRET || "eden_threads_cron_secret_luxury";

  if (cronSecret !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized cron execution" });
  }

  const result = await cleanupExpiredReservations();
  return res.json(result);
});

export default router;
