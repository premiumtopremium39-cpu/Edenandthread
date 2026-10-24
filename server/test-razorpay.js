import express from "express";
import paymentRouter from "./payment.js";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use("/api/payment", paymentRouter);

const server = app.listen(5005, async () => {
  console.log("Test payment server running on port 5005...");

  try {
    // Test 1: GET /api/payment/config
    console.log("\n[TEST 1] Testing /api/payment/config...");
    const configRes = await fetch("http://localhost:5005/api/payment/config");
    const configData = await configRes.json();
    console.log("Config response:", configData);
    if (!configData.keyId || !configData.isTestMode) {
      throw new Error("Config test failed: missing keyId or test mode flag");
    }
    console.log("✅ Config endpoint verified successfully!");

    // Test 2: POST /api/payment/create-order
    console.log("\n[TEST 2] Testing /api/payment/create-order...");
    const orderRes = await fetch("http://localhost:5005/api/payment/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 24500,
        currency: "INR",
        receipt: "test_rcpt_123",
        notes: { customer: "Matteo Rossi" }
      })
    });
    const orderData = await orderRes.json();
    console.log("Create Order response:", orderData);
    if (!orderData.success || !orderData.order?.id || orderData.order.amount !== 2450000) {
      throw new Error("Order creation test failed: invalid amount in paise or missing order ID");
    }
    console.log("✅ Create Order endpoint verified successfully! Amount correctly converted to paise:", orderData.order.amount);

    // Test 3: POST /api/payment/verify-payment (Valid Signature)
    console.log("\n[TEST 3] Testing /api/payment/verify-payment (Valid test signature)...");
    const orderId = orderData.order.id;
    const paymentId = "pay_test_abc123456";
    const secret = process.env.RAZORPAY_KEY_SECRET || "secret_test_eden_threads_luxury";
    const signature = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

    const verifyRes = await fetch("http://localhost:5005/api/payment/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      })
    });
    const verifyData = await verifyRes.json();
    console.log("Verify Payment response:", verifyData);
    if (!verifyData.success || !verifyData.verified) {
      throw new Error("Verification test failed: expected success true");
    }
    console.log("✅ Signature Verification endpoint verified successfully!");

    // Test 4: POST /api/payment/verify-payment (Tampered Signature rejection test)
    console.log("\n[TEST 4] Testing signature rejection on tampered secret / mismatch...");
    const realPaymentId = "pay_real_tamper_attempt";
    const fakeSignature = "invalid_tampered_signature_hex_12345";
    const badVerifyRes = await fetch("http://localhost:5005/api/payment/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: realPaymentId,
        razorpay_signature: fakeSignature
      })
    });
    const badVerifyData = await badVerifyRes.json();
    console.log("Tampered payment rejection response (Status " + badVerifyRes.status + "):", badVerifyData);
    if (badVerifyRes.status !== 400 || badVerifyData.success !== false) {
      throw new Error("Security test failed: tampered signature was not rejected!");
    }
    console.log("✅ Security verification successfully rejected tampered signature!");

    console.log("\n==========================================");
    console.log("🎉 ALL RAZORPAY PAYMENT ENDPOINT TESTS PASSED!");
    console.log("==========================================\n");
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
