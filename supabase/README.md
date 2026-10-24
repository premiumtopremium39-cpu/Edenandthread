# Supabase Configuration & Quick Setup Guide

This guide walks you through setting up your **Supabase Database and Authentication** for **EDEN & THREADS**.

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project** and name your project (e.g. `eden-threads-db`).
3. Choose a strong database password and select the region closest to your users.
4. Wait for your project to initialize (~1-2 minutes).

---

## Step 2: Apply the Unified Database Schema (1-Click)

1. Open your Supabase Project Dashboard.
2. In the left navigation bar, click on **SQL Editor**.
3. Click **New query**.
4. Open [supabase/schema.sql](file:///c:/Users/admin/clothesbranddemo/supabase/schema.sql) in this repository, copy all contents, and paste them into the Supabase SQL Editor.
5. Click **Run** (green button).

All 8 tables, indexes, automatic triggers, Row-Level-Security (RLS) policies, and seed data will be created instantly.

---

## Step 3: Retrieve Your API Keys

1. In your Supabase Project Dashboard, click the **Settings** icon (gear icon) in the left sidebar.
2. Select **API** (or **Data API**).
3. Copy the following values:
   - **Project URL**: (e.g., `https://xyzcompany.supabase.co`)
   - **anon / public Key**: (safe for browser usage)
   - **service_role Key**: (SECRET! Server-side only, never share publicly)

---

## Step 4: Configure Your `.env` File

Add your keys to your `.env` file in the root directory:

```env
# -------------------------------------------------------------
# Supabase Configuration (Frontend - Safe for browser with RLS)
# -------------------------------------------------------------
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# -------------------------------------------------------------
# Supabase Configuration (Backend Server - Secret & Protected)
# -------------------------------------------------------------
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# -------------------------------------------------------------
# Server & Payment Configuration
# -------------------------------------------------------------
PORT=5000
RAZORPAY_KEY_ID=rzp_test_TPWevL7fL58oyF
RAZORPAY_KEY_SECRET=Ml1V2WMiJ4SBo55VaeopdeKE
```

---

## Step 5: (Optional) Enable Google OAuth in Supabase

If you want users to sign in with Google:
1. In Supabase Dashboard, go to **Authentication** > **Providers** > **Google**.
2. Toggle Google to **Enabled**.
3. Enter your Google Client ID and Secret from Google Cloud Console.
4. Copy the **Callback URL (for OAuth)** shown in Supabase and paste it into Google Cloud Console under Authorized Redirect URIs.
5. In Supabase Dashboard, go to **Authentication** > **URL Configuration** and add `http://localhost:5173` and your production URL to **Redirect URLs**.

---

## Database Architecture Overview

| Table Name | Purpose | RLS Protection |
| :--- | :--- | :--- |
| `profiles` | User profile data, roles (`admin` or `customer`) | Users view/edit own profile; Admins full access |
| `products` | Luxury linen shirt catalog, inventory, prices | Public read; Admin write |
| `orders` | Orders, shipping info, carrier tracking | Owner read; Admin full access |
| `payment_transactions` | Payment audit log (Razorpay references) | Owner read; Admin full access |
| `promo_codes` | Discount codes (`SUMMER15`, `EDEN10`, etc.) | Public read active; Admin write |
| `product_reviews` | Customer ratings and reviews | Public read; Owner/Admin delete |
| `announcements` | Header banner message | Public read; Admin update |
| `newsletter_subscribers` | Email marketing list | Public write (insert); Admin read only |

---

## Security Verification (Anti-Hack Safeguards)

1. **Row Level Security (RLS)** is enabled on all tables, preventing any unauthorized reads, modifications, or deletions.
2. **Service Role Key Separation**: The service role key is strictly isolated to server-side code (`server/supabase.js`) and never packaged into frontend builds.
3. **No Direct Card Storage**: Razorpay handles PCI-DSS tokenized payments, and only verified transaction references and audit logs are recorded.
