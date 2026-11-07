# Comprehensive Application Security Audit & Penetration Testing Report

**Target Application:** Eden & Thread (`https://edenandthread.com` / `https://eden-threads.vercel.app`)  
**Assessment Type:** Full Application Security Audit, Penetration Test & Threat Modeling  
**Date of Audit:** November 7, 2026  
**Lead Security Auditor:** Senior Application Security Engineer & Penetration Tester  
**Phase:** PHASE 1 — INSPECT AND DOCUMENT ONLY (No source code modifications applied)

---

## 1. Executive Summary

A comprehensive, non-destructive security audit and code review of the Eden & Thread luxury e-commerce platform was conducted across all application tiers. The scope of assessment encompassed the Vite React SPA frontend, the Vercel serverless Express API layer, Supabase PostgreSQL database schemas & Row Level Security (RLS) policies, Razorpay payment processing and webhook verifications, third-party logistics integrations (Shadowfax), and executive administrative dashboards.

The audit identified **16 distinct security findings** across the codebase:
- **4 Critical Severity Vulnerabilities**
- **5 High Severity Vulnerabilities**
- **4 Medium Severity Vulnerabilities**
- **3 Low / Informational Vulnerabilities**

Primary critical risks include **Admin Privilege Escalation via Hardcoded Email Triggers/Bypasses**, **Overly Permissive Direct Client-Side Supabase RLS policies (enabling arbitrary order & status modification)**, **Critical CORS Origin Reflection with Credentials**, and **Source Code Gateway/Cron Fallback Secrets**. Immediate remediation is recommended prior to scaling live transactional volume.

---

## 2. System Architecture & Threat Model

### 2.1 Architecture Mapping

- **Frontend:** React 19 Single Page Application built with Vite 8. Hosted on Vercel (`https://eden-threads.vercel.app` / `https://edenandthread.com`). Dynamic routing driven by URL hash routes (`#shop`, `#checkout`, `#admin`, `#track-order`).
- **Serverless API Layer:** Express.js application deployed via Vercel Serverless Functions (`api/index.js` rewriting to `server/index.js`).
- **Database & Identity:** Supabase PostgreSQL instance (`fkkfzmydaascwthtonsi.supabase.co`) handling authentication, orders, products, reviews, and storage.
- **Payment Gateway:** Razorpay Standard Checkout & Webhooks.
- **Logistics Integration:** Shadowfax Forward/Reverse Logistics APIs (`https://api-star.shadowfax.in`).

```
  +-------------------------------------------------------------------------+
  |                             BROWSER (Untrusted)                         |
  |  - React SPA (Vite)                                                     |
  |  - Supabase Public Client (sb_publishable_****)                         |
  |  - LocalStorage (Sessions, Cart, Admin flag, Redirect hash)             |
  +--------------------+-------------------------------+--------------------+
                       |                               |
       REST API Calls  |               Direct Supabase | Query/Realtime
       (Credentials)   |                               |
                       v                               v
  +-------------------------------------+   +-------------------------------+
  | VERCEL SERVERLESS EXPRESS BACKEND   |   |     SUPABASE CLUSTER          |
  | - server/index.js                   |   | - Auth Service (GoTrue)       |
  | - server/payment.js                 |   | - Postgres DB (RLS Enabled)   |
  | - server/admin.js                   |   | - Storage (product-media)     |
  | - Supabase Service Role Client      |   +---------------+---------------+
  +------------------+------------------+                   ^
                     |                                      |
                     | Direct DB Queries (service_role)     |
                     +--------------------------------------+
                     |
                     +--------------------+
                     |                    |
                     v                    v
         +-----------------------+  +-----------------------+
         |   RAZORPAY GATEWAY    |  |  SHADOWFAX LOGISTICS  |
         | - Orders API          |  | - Serviceability      |
         | - Webhook Callbacks   |  | - AWB Generation      |
         +-----------------------+  +-----------------------+
```

### 2.2 End-to-End User Flow & Trust Boundaries

```
[Customer Browser] 
    │ 1. Browse Catalog / Add to Cart
    │ 2. Initiates Checkout (#checkout)
    ▼
[Vercel Express API: POST /api/payment/create-order]
    │ 3. Server calculates authoritative prices against Supabase DB
    │ 4. Atomic FCFS inventory reservation inserted into order_reservations
    │ 5. Creates Razorpay Order via Razorpay SDK (server-side)
    ▼
[Customer Browser: Razorpay Modal]
    │ 6. Customer enters UPI/Card credentials into Razorpay iframe
    ▼
[Razorpay Processing Engine]
    ├─► Callback to Browser (razorpay_signature)
    │        ▼
    │   [Browser -> Express API: POST /api/payment/verify-payment]
    │        │ Server validates HMAC SHA256 signature
    │        │ Updates Supabase order to 'paid' & commits inventory
    │
    └─► Async Server-to-Server Webhook (POST /api/payment/webhook)
             │ Server validates webhook signature using raw body buffer
             │ Idempotently marks order paid and sends customer email
```

---

## 3. Detailed Vulnerability Audit Findings

### SECTION A: Secrets and Configuration

---

#### Finding SEC-01: Hardcoded Razorpay Key Secret & Webhook Secret Fallbacks
- **Severity:** CRITICAL
- **File & Line:** [server/payment.js#L26-L31](file:///c:/Users/admin/Projects/Brand_Demo/server/payment.js#L26-L31)
- **Description:** The server initializes the Razorpay SDK using hardcoded fallback test credentials if environment variables are omitted:
  ```javascript
  const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_TrmfyllGcVE3Zv";
  const key_secret = process.env.RAZORPAY_KEY_SECRET || "a1iU8Gd6Ff2UTPBtAZ3H9iyg";
  const webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET || "config_Tsrko6CbrIPYEM";
  ```
- **Attack Scenario:** If deployed without environment variables set in Vercel or if an attacker clones the repository, the attacker extracts `a1iU8Gd6Ff2UTPBtAZ3H9iyg` and `config_Tsrko6CbrIPYEM`. The attacker crafts authentic HMAC-SHA256 signatures for arbitrary amounts or forges webhook events to mark orders as paid without transferring funds.
- **Impact:** Financial loss, unpaid order fulfillment, arbitrary payment spoofing.

---

#### Finding SEC-02: Hardcoded Cron Secret Fallback in Reservation Cleanup Endpoint
- **Severity:** HIGH
- **File & Line:** [server/payment.js#L660-L666](file:///c:/Users/admin/Projects/Brand_Demo/server/payment.js#L660-L666)
- **Description:** The cleanup endpoint `/api/payment/cleanup-reservations` protects execution via a bearer secret with a hardcoded fallback:
  ```javascript
  const expectedSecret = process.env.CRON_SECRET || "eden_threads_cron_secret_luxury";
  ```
- **Attack Scenario:** An external attacker sends `POST /api/payment/cleanup-reservations` with header `Authorization: Bearer eden_threads_cron_secret_luxury` continuously in a loop.
- **Impact:** Legitimate customer checkout sessions are prematurely evicted and canceled midway through the Razorpay modal flow, causing Denial of Inventory and lost sales.

---

#### Finding SEC-03: Hardcoded Supabase Project URL and Public Key in Client Code
- **Severity:** LOW / INFORMATIONAL
- **File & Line:** [src/lib/supabase.js#L9-L14](file:///c:/Users/admin/Projects/Brand_Demo/src/lib/supabase.js#L9-L14)
- **Description:** `supabaseUrl` and `supabaseAnonKey` contain fallback production project tokens (`https://fkkfzmydaascwthtonsi.supabase.co`, `sb_publishable_C1elhIPYMMmlzkrSImfLog_3zFrwYAT`).
- **Attack Scenario:** While Supabase anon keys are designed for client-side use, having hardcoded production URLs and keys without environment separation risks dev and test environments querying the production database.
- **Impact:** Accidental data pollution between dev and prod; exposes the database directly to API scanners.

---

### SECTION B: Supabase & Database Security

---

#### Finding SEC-04: Privilege Escalation via Hardcoded Admin Email Signups
- **Severity:** CRITICAL
- **File & Line:** [supabase/schema.sql#L207-L215](file:///c:/Users/admin/Projects/Brand_Demo/supabase/schema.sql#L207-L215), [server/admin.js#L37-L40](file:///c:/Users/admin/Projects/Brand_Demo/server/admin.js#L37-L40), [src/lib/supabase.js#L52-L56](file:///c:/Users/admin/Projects/Brand_Demo/src/lib/supabase.js#L52-L56)
- **Description:** Both the database trigger `handle_new_user()` and the backend `checkAdmin` middleware grant `admin` privileges based purely on hardcoded email strings:
  ```sql
  IF new.email IN ('edenandthreadlogin@gmail.com', 'admin@mail.com', 'admin@edenthreads.luxury') THEN
    v_role := 'admin';
  ```
  If email confirmation is disabled or if third-party OAuth providers allow users to register with custom email identities (or if an attacker registers `admin@mail.com`), the user automatically becomes a super-admin.
- **Attack Scenario:** An attacker registers on the site using the email `admin@mail.com` (or an unconfirmed email). The Supabase trigger assigns `role = 'admin'`. The attacker logs in, acquires a valid JWT token, and accesses `/api/admin/orders`, modifies inventory, or accesses customer shipping addresses.
- **Impact:** Total compromise of customer PII, order data, and product inventory.

---

#### Finding SEC-05: Client-Side Direct Order Modification Vulnerability (RLS Policy Gap)
- **Severity:** CRITICAL
- **File & Line:** [src/App.jsx#L554-L574](file:///c:/Users/admin/Projects/Brand_Demo/src/App.jsx#L554-L574), [src/lib/supabase.js#L140-L150](file:///c:/Users/admin/Projects/Brand_Demo/src/lib/supabase.js#L140-L150), [supabase/schema.sql#L90-L98](file:///c:/Users/admin/Projects/Brand_Demo/supabase/schema.sql#L90-L98)
- **Description:** In `App.jsx`, `handleUpdateOrderStatus` directly invokes `orderService.updateOrderStatus(orderId, newStatus)` via the client Supabase SDK. In `supabase/schema.sql`, the policy `"Users can update their own orders"` specifies:
  ```sql
  CREATE POLICY "Users can update their own orders"
    ON orders FOR UPDATE
    USING (auth.uid() = user_id);
  ```
  This policy lacks `WITH CHECK` restrictions on columns! A regular authenticated customer who placed an order can use their browser console to execute:
  ```javascript
  supabase.from('orders').update({ payment_status: 'paid', status: 'Delivered', total_amount: 0 }).eq('id', myOrderId);
  ```
- **Attack Scenario:** A customer places an order with unpaid or COD status. From the browser devtools, using their standard logged-in session, they execute an `UPDATE` query directly against Supabase setting `payment_status = 'paid'`.
- **Impact:** Financial loss; unauthorized modification of order fulfillment status by buyers.

---

#### Finding SEC-06: Unauthenticated Arbitrary Product Creation via Review Endpoint
- **Severity:** HIGH
- **File & Line:** [server/index.js#L58-L73](file:///c:/Users/admin/Projects/Brand_Demo/server/index.js#L58-L73)
- **Description:** The public endpoint `POST /api/reviews` checks whether the supplied `product_id` exists in the database. If it does not exist, it uses `supabaseAdmin` (Service Role with bypass RLS) to **automatically insert a new product** into the store catalog:
  ```javascript
  if (!existingProduct) {
    const { error: insertProdErr } = await supabaseAdmin.from('products').insert({
      id: Number(product_id),
      title: `Linen Garment #${product_id}`,
      price: 18500.00,
      ...
  ```
- **Attack Scenario:** An unauthenticated attacker sends a flood of POST requests to `/api/reviews` with random product IDs (e.g., 999999, 888888). The server inserts thousands of fake products into the live store catalog.
- **Impact:** Database pollution, catalog defacement, disruption of store operations.

---

#### Finding SEC-07: Unrestricted File Path & Storage Fallback in Image Upload Endpoint
- **Severity:** MEDIUM
- **File & Line:** [server/admin.js#L605-L628](file:///c:/Users/admin/Projects/Brand_Demo/server/admin.js#L605-L628)
- **Description:** In `POST /api/admin/upload-image`, when Supabase storage is unavailable, the server writes files directly to the local filesystem:
  ```javascript
  const finalFilename = `${Date.now()}_${sanitizedBase}.png`;
  const uploadsDir = path.join(process.cwd(), 'public', 'assets', 'uploads');
  fs.writeFileSync(filePath, buffer);
  ```
  On serverless platforms (such as Vercel), the local filesystem is ephemeral and read-only outside `/tmp`. Additionally, while the filename is stripped of path separators, no disk quota or rate limit is enforced.
- **Impact:** Image uploads silently fail in serverless deployments or can cause inode exhaustion on persistent VPS hosts.

---

### SECTION C: Authentication, Sessions & Access Control

---

#### Finding SEC-08: Client-Side Admin State Bypass via LocalStorage
- **Severity:** HIGH
- **File & Line:** [src/pages/AdminPage.jsx#L38](file:///c:/Users/admin/Projects/Brand_Demo/src/pages/AdminPage.jsx#L38)
- **Description:** The admin UI access check includes a client-side localStorage check:
  ```javascript
  const isAdmin = user?.role === 'admin' || ... || 
    (typeof window !== 'undefined' && localStorage.getItem('eden_threads_admin_session') === 'true');
  ```
- **Attack Scenario:** Any visitor opens the browser console, types `localStorage.setItem('eden_threads_admin_session', 'true')`, and navigates to `#admin`. While backend APIs require tokens, the entire administrative UI, packing slip view, order layouts, and client-cached order lists become visible to the unauthorized user.
- **Impact:** Information disclosure of orders and customer addresses cached in client state.

---

#### Finding SEC-09: Unauthenticated Order Tracking Information Disclosure
- **Severity:** MEDIUM
- **File & Line:** [supabase/schema.sql#L190-L203](file:///c:/Users/admin/Projects/Brand_Demo/supabase/schema.sql#L190-L203), [src/pages/OrderTrackingPage.jsx#L26-L32](file:///c:/Users/admin/Projects/Brand_Demo/src/pages/OrderTrackingPage.jsx#L26-L32)
- **Description:** The database function `track_order(lookup_id)` is defined as `SECURITY DEFINER` and granted to `public` and `anon`. It searches orders by `order_id` or `payment_id` and returns full customer shipping details without requiring authentication or telephone/email verification.
- **Attack Scenario:** If order IDs follow a sequential or predictable format, or if an attacker observes an order ID, they call `supabase.rpc('track_order', { lookup_id: '...' })` to retrieve the customer's full name, phone number, and physical home address.
- **Impact:** PII leakage and violation of privacy standards.

---

### SECTION D: Cart, Wishlist & Pricing Integrity

---

#### Finding SEC-10: Cart & Wishlist Stored Exclusively in LocalStorage without Server Session Sync
- **Severity:** LOW
- **File & Line:** [src/App.jsx#L490-L507](file:///c:/Users/admin/Projects/Brand_Demo/src/App.jsx#L490-L507)
- **Description:** Cart and wishlist state are stored exclusively in client-side `localStorage`.
- **Impact:** While cart prices cannot be tampered with due to the server's authoritative price verification in `calculateAuthoritativeOrder`, user cart data is lost across devices and vulnerable to local browser tampering or XSS theft.

---

### SECTION E: Payment Flow & Razorpay Integration

---

#### Finding SEC-11: Public Exposure of Razorpay Configuration & Internal Key ID
- **Severity:** LOW
- **File & Line:** [server/payment.js#L55-L64](file:///c:/Users/admin/Projects/Brand_Demo/server/payment.js#L55-L64)
- **Description:** The endpoint `GET /api/payment/config` returns `keyId` and `configId` to any unauthenticated caller. While Razorpay Key IDs are public, this endpoint aids reconnaissance by exposing gateway environment details.
- **Impact:** Information gathering for targeting specific gateway endpoints.

---

#### Finding SEC-12: Cash on Delivery Lacks Phone Verification (OTP / CAPTCHA)
- **Severity:** MEDIUM
- **File & Line:** [server/payment.js#L305-L350](file:///c:/Users/admin/Projects/Brand_Demo/server/payment.js#L305-L350)
- **Description:** Orders placed via `paymentMethod: 'cod'` do not require SMS OTP verification or anti-bot validation.
- **Attack Scenario:** A competitor or malicious script automates thousands of COD orders with fake delivery addresses, locking up physical inventory through the reservation system.
- **Impact:** Fake orders, inventory lockup, operational shipping costs for undeliverable parcels.

---

### SECTION F: Admin Panel & API Security

---

#### Finding SEC-13: Unrestricted CORS with Wildcard Reflection and Credentials
- **Severity:** HIGH
- **File & Line:** [server/index.js#L14-L17](file:///c:/Users/admin/Projects/Brand_Demo/server/index.js#L14-L17)
- **Description:** The Express server is configured with:
  ```javascript
  app.use(cors({
    origin: true,
    credentials: true
  }));
  ```
  Setting `origin: true` reflects whatever `Origin` header the client sends while setting `Access-Control-Allow-Credentials: true`.
- **Attack Scenario:** A logged-in administrator visits a malicious website `attacker.com`. The malicious site issues a background `fetch('https://eden-threads.vercel.app/api/admin/orders', { credentials: 'include' })`. The browser transmits cookies/credentials, and the attacker's script reads the sensitive order data due to origin reflection.
- **Impact:** Cross-Site Information Disclosure and unauthorized administrative API triggering.

---

#### Finding SEC-14: Massive 50MB Request Body Limit on Serverless Endpoints
- **Severity:** LOW
- **File & Line:** [server/index.js#L20-L26](file:///c:/Users/admin/Projects/Brand_Demo/server/index.js#L20-L26)
- **Description:** `express.json({ limit: "50mb" })` and `express.urlencoded({ limit: "50mb" })` allow arbitrarily large payloads to be parsed by Node.js.
- **Impact:** Serverless memory exhaustion and Denial of Service (DoS) through oversized JSON parsing.

---

### SECTION G: Web Security & Transport

---

#### Finding SEC-15: Missing Essential HTTP Security Headers
- **Severity:** MEDIUM
- **File & Line:** [vercel.json](file:///c:/Users/admin/Projects/Brand_Demo/vercel.json), [server/index.js](file:///c:/Users/admin/Projects/Brand_Demo/server/index.js)
- **Description:** The application does not define `Content-Security-Policy` (CSP), `Strict-Transport-Security` (HSTS), `X-Frame-Options`, `X-Content-Type-Options`, or `Permissions-Policy`.
- **Impact:** Vulnerability to clickjacking if framed in external web pages, and absence of defense-in-depth against Cross-Site Scripting (XSS).

---

### SECTION H: Infrastructure & Dependency Security

---

#### Finding SEC-16: Outdated Dependencies with Known Security Advisories
- **Severity:** HIGH
- **File & Line:** `package.json`, `package-lock.json`
- **Description:** NPM security audit identified 15 vulnerabilities (4 Critical, 8 High, 1 Moderate, 2 Low):
  - **`vite` (>=8.2.0 <=8.2.3):** GHSA-587h-7wmj-h5pm (High severity command execution bypass on Windows)
  - **`source-map-js` (<1.2.2):** GHSA-68fv-2mgg-jv7q (High severity denial of service)
  - **`zod` (<4.6.6):** GHSA-mrhx-c7xc-m3w5 (High severity memory exhaustion on oversized collections)
  - **`axios` / `@better-auth`:** Sub-dependency advisories for SSRF and concurrency bypass.
- **Impact:** Local development command injection and potential memory exhaustion in backend build/validation pipelines.

---

## 4. Vulnerability Findings Summary Table

| Finding ID | Title | Severity | Impacted Component | CVSS v3.1 | Exploit Difficulty |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Hardcoded Razorpay Secret & Webhook Secret Fallbacks | **CRITICAL** | `server/payment.js` | 9.8 | Low |
| **SEC-04** | Admin Privilege Escalation via Hardcoded Email Strings | **CRITICAL** | `supabase/schema.sql`, `server/admin.js` | 9.1 | Low |
| **SEC-05** | Supabase RLS Policy Permitting Client-Side Order Status Tampering | **CRITICAL** | `supabase/schema.sql`, `src/App.jsx` | 8.8 | Low |
| **SEC-02** | Hardcoded Cron Secret Fallback in Inventory Cleanup | **HIGH** | `server/payment.js` | 7.5 | Low |
| **SEC-06** | Unauthenticated Arbitrary Product Creation in Review Endpoint | **HIGH** | `server/index.js` | 7.5 | Low |
| **SEC-08** | Client-Side Admin Panel Bypass via LocalStorage Flag | **HIGH** | `src/pages/AdminPage.jsx` | 7.2 | Low |
| **SEC-13** | Insecure CORS Configuration (Origin Reflection with Credentials) | **HIGH** | `server/index.js` | 7.5 | Medium |
| **SEC-16** | Outdated Dependencies with Critical/High Security Advisories | **HIGH** | `package.json` | 7.5 | Medium |
| **SEC-07** | Local File Storage Fallback on Serverless Filesystem | **MEDIUM** | `server/admin.js` | 5.3 | Medium |
| **SEC-09** | Unauthenticated Order Tracking PII Disclosure | **MEDIUM** | `supabase/schema.sql`, `OrderTrackingPage` | 5.3 | Medium |
| **SEC-12** | Cash On Delivery Lacks Verification (Inventory Denial of Service) | **MEDIUM** | `server/payment.js` | 5.3 | Medium |
| **SEC-15** | Missing Standard Security Headers (CSP, HSTS, X-Frame-Options) | **MEDIUM** | `vercel.json`, `server/index.js` | 4.8 | Medium |
| **SEC-03** | Hardcoded Supabase Fallback Credentials in Client Code | **LOW** | `src/lib/supabase.js` | 3.7 | High |
| **SEC-10** | Cart & Wishlist State Stored Solely in LocalStorage | **LOW** | `src/App.jsx` | 3.1 | High |
| **SEC-11** | Public Exposure of Razorpay Gateway Config Identifier | **LOW** | `server/payment.js` | 3.1 | High |
| **SEC-14** | Overly Permissive 50MB Request Body Limit on API | **LOW** | `server/index.js` | 3.7 | Medium |

---

## 5. Realistic Attack Scenarios

### Scenario 1: Total Administrative Takeover via Email Registration
1. An attacker inspects `supabase/schema.sql` or notices the admin emails in the client bundle.
2. The attacker registers a new account using `admin@mail.com` or `admin@edenthreads.luxury`.
3. The database trigger `handle_new_user()` checks the email string and sets `role = 'admin'`.
4. The attacker logs in, obtains a valid JWT, and calls `GET /api/admin/orders`.
5. The attacker downloads the customer database (names, phone numbers, addresses, order history) and modifies product catalog prices to ₹1.

### Scenario 2: Zero-Cost Order Fulfillment via Client-Side RLS Abuse
1. An attacker selects luxury linen garments worth ₹75,000 and proceeds to checkout with Cash on Delivery or initiates a payment.
2. An order row is inserted into Supabase with `user_id = auth.uid()` and `payment_status = 'pending'`.
3. The attacker opens the browser devtools console and executes:
   ```javascript
   await supabase.from('orders').update({ payment_status: 'paid', status: 'Payment Received' }).eq('id', orderId);
   ```
4. Because the Supabase RLS policy `"Users can update their own orders"` lacks column-level restrictions, Supabase allows the update.
5. The admin order dashboard reads the order as "Paid", and the warehouse packages and dispatches the luxury goods without payment.

### Scenario 3: Inventory Exhaustion & Sales Sabotage
1. An attacker discovers the hardcoded fallback cron secret `eden_threads_cron_secret_luxury` in `server/payment.js`.
2. The attacker writes a simple 5-line script sending a POST request to `/api/payment/cleanup-reservations` every 10 seconds.
3. Every legitimate customer browsing the site and attempting to purchase a shirt has their 10-minute reservation immediately evicted and canceled before completing Razorpay checkout.
4. Concurrently, the attacker posts 500 fake COD orders using random names, permanently locking remaining inventory.

---

## 6. Prioritized Remediation Plan (Phase 2 Roadmap)

### Immediate Priority (Day 1 - Critical Remediations)
1. **Fix Admin Authorization:** Remove hardcoded email lists from SQL triggers and backend code. Enforce strict database RBAC (Role-Based Access Control) managed exclusively via service role scripts or Supabase Auth Claims (`app_metadata.role = 'admin'`).
2. **Lock Down Supabase RLS Policies:** Drop `"Users can update their own orders"` policy. Ensure users can only `SELECT` their own orders. Only the server backend via `SUPABASE_SERVICE_ROLE_KEY` should update order status or payment status.
3. **Purge Fallback Gateway Secrets:** Remove all fallback strings for `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `CRON_SECRET`. Fail fast with descriptive errors if environment variables are missing.
4. **Fix CORS Configuration:** Replace `origin: true` with an explicit whitelist of trusted domains (`https://edenandthread.com`, `https://eden-threads.vercel.app`, and `http://localhost:5173` in development).

### High Priority (Day 2 - Structural & Logic Hardening)
1. **Restrict Review Endpoint:** Require authenticated sessions or customer order verification before submitting reviews. Remove automatic product insertion logic from `POST /api/reviews`.
2. **Remove LocalStorage Admin Bypass:** Strip `localStorage.getItem('eden_threads_admin_session')` from `AdminPage.jsx`. All admin views must depend solely on verified server tokens.
3. **Secure Order Tracking Endpoint:** Require either customer authentication or a combination of `Order ID` + `Customer Phone/Email` to prevent PII harvesting.
4. **Update Vulnerable Dependencies:** Run `npm audit fix` and upgrade `vite`, `zod`, and `source-map-js`.

### Medium Priority (Day 3 - Defense in Depth & Headers)
1. **Inject HTTP Security Headers:** Configure `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security` in `vercel.json` and Express middleware.
2. **Tune API Payload Limits:** Lower `express.json()` body size from 50MB to 2MB for standard routes, reserving larger buffers strictly for file upload endpoints.
3. **Implement Rate Limiting & Verification for COD:** Add rate limiting and CAPTCHA / OTP verification for Cash on Delivery submissions.

---
*Report generated strictly under Phase 1 (Inspection & Documentation). No code has been modified.*

