import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export const isServerSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseServiceKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseServiceKey.length > 20
  );
};

export const supabaseAdmin = isServerSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Securely logs a verified payment transaction into Supabase PostgreSQL
 */
export async function recordServerPaymentTransaction({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  amount,
  currency = 'INR',
  status = 'verified',
  method = 'razorpay',
  verified = true,
  rawResponse = {},
}) {
  if (!supabaseAdmin) {
    console.log('[Supabase Server] Admin client not configured, skipping cloud db audit log');
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('payment_transactions')
      .insert([
        {
          order_id: orderId,
          razorpay_order_id: razorpayOrderId || orderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
          amount: Number(amount || 0),
          currency: currency,
          status: status,
          method: method,
          verified: verified,
          raw_response: rawResponse,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn('[Supabase Server Payment Log Warning]:', error.message);
      return null;
    }

    // Also update order payment status
    await supabaseAdmin
      .from('orders')
      .update({
        payment_id: razorpayPaymentId,
        payment_status: verified ? 'paid' : 'pending',
        order_status: verified ? 'Paid' : 'Placed',
      })
      .eq('order_id', orderId);

    return data;
  } catch (err) {
    console.error('[Supabase Server Payment Log Error]:', err);
    return null;
  }
}
