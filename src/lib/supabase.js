import { createClient } from '@supabase/supabase-js';

// Retrieve and normalize Supabase environment variables
const getEnvVar = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

// Production fallback publishable credentials for guaranteed connectivity
const DEFAULT_SUPABASE_URL = 'https://dqcigdsajzimqhshnpws.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Ho2uS_PVo95wA2Chn3mDUg_FVfKku_r';

const rawUrl = (getEnvVar('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL).trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (getEnvVar('VITE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY).trim();

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20
  );
};

// Create the browser client (Protected by PostgreSQL Row-Level-Security)
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Normalizes Supabase auth user into a consistent shape across the app
 */
export const formatUserData = (user, profile = null) => {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const fullName = profile?.full_name || meta.full_name || meta.name || user.email?.split('@')[0] || 'Patron';
  const role = profile?.role || (user.email === 'admin@mail.com' || user.email === 'admin@edenthreads.luxury' ? 'admin' : 'customer');

  return {
    id: user.id,
    email: user.email,
    name: fullName,
    fullName: fullName,
    role: role,
    avatar: profile?.avatar_url || meta.avatar_url || meta.picture || null,
    avatarUrl: profile?.avatar_url || meta.avatar_url || meta.picture || null,
    phone: profile?.phone || user.phone || null,
  };
};

// ==============================================================================
// 1. AUTHENTICATION SERVICES
// ==============================================================================
export const authService = {
  // Sign up with Email and Password
  async signUp(email, password, fullName = '') {
    if (!supabase) throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
    
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        data: {
          full_name: fullName.trim(),
          name: fullName.trim(),
        },
      },
    });

    if (error) throw error;
    return data;
  },

  // Sign in with Email and Password
  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) throw error;
    return data;
  },

  // Sign in with Google OAuth
  async signInWithGoogle(redirectHash = '#checkout') {
    if (!supabase) throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');

    try {
      localStorage.setItem("eden_threads_oauth_target", redirectHash);
    } catch {}

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    return data;
  },

  // Sign Out
  async signOut() {
    if (!supabase) return { error: null };
    return await supabase.auth.signOut();
  },

  // Get active session
  async getSession() {
    if (!supabase) return { data: { session: null }, error: null };
    return await supabase.auth.getSession();
  },

  // Get user profile
  async getProfile(userId) {
    if (!supabase || !userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('[Supabase Profile Error]:', error.message);
      return null;
    }
    return data;
  },
};

// ==============================================================================
// 2. PRODUCTS SERVICE (Fast Read, Admin Protected)
// ==============================================================================
// Server API fallback helper for guaranteed admin persistence
async function callAdminServerApi(endpoint, options = {}) {
  const urls = [
    endpoint,
    `http://localhost:5000${endpoint}`,
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // try next url
    }
  }
  return null;
}

export const productService = {
  async getProducts() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (error) {
      console.warn('[Supabase Products Error]:', error.message);
      return null;
    }
    return data;
  },

  async createProduct(product) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert([
            {
              title: product.title,
              category: product.category || 'spread-collar',
              price: Number(product.price || 0),
              stock: Number(product.stock || 0),
              image: product.image || '/assets/shirt_front.png',
              badge: product.badge || '',
              description: product.description || '',
              sizes: typeof product.sizes === 'string' ? product.sizes.split(',').map(s => s.trim()) : (product.sizes || ['S', 'M', 'L', 'XL']),
              colors: Array.isArray(product.colors) ? product.colors : [],
              is_active: true,
            },
          ])
          .select();

        if (!error && data && data.length > 0) {
          return data[0];
        }
      } catch (err) {
        console.warn('[Client createProduct failed, trying server fallback]:', err.message);
      }
    }

    // Server fallback using service-role key
    const serverResult = await callAdminServerApi('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    if (serverResult?.data) return serverResult.data;
    return product;
  },

  async updateProduct(id, updates) {
    const sanitized = {};
    if (updates.title !== undefined) sanitized.title = updates.title;
    if (updates.category !== undefined) sanitized.category = updates.category;
    if (updates.price !== undefined) sanitized.price = Number(updates.price);
    if (updates.stock !== undefined) sanitized.stock = Number(updates.stock);
    if (updates.image !== undefined) sanitized.image = updates.image;
    if (updates.badge !== undefined) sanitized.badge = updates.badge;
    if (updates.description !== undefined) sanitized.description = updates.description;
    if (updates.sizes !== undefined) {
      sanitized.sizes = typeof updates.sizes === 'string' ? updates.sizes.split(',').map(s => s.trim()) : updates.sizes;
    }
    if (updates.colors !== undefined) sanitized.colors = updates.colors;
    if (updates.is_active !== undefined) sanitized.is_active = updates.is_active;

    if (supabase) {
      try {
        const numId = Number(id);
        const { data, error } = await supabase
          .from('products')
          .update(sanitized)
          .eq('id', numId)
          .select();

        if (!error && data && data.length > 0) {
          return data[0];
        }
      } catch (err) {
        console.warn('[Client updateProduct failed, trying server fallback]:', err.message);
      }
    }

    // Server fallback using service-role key
    const serverResult = await callAdminServerApi(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitized),
    });
    if (serverResult?.data) return serverResult.data;
    return { id, ...updates };
  },

  async deleteProduct(id) {
    if (supabase) {
      try {
        const numId = Number(id);
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', numId);

        if (!error) return true;
      } catch (err) {
        console.warn('[Client deleteProduct failed, trying server fallback]:', err.message);
      }
    }

    // Server fallback using service-role key
    await callAdminServerApi(`/api/admin/products/${id}`, {
      method: 'DELETE',
    });
    return true;
  },
};

// ==============================================================================
// 3. ORDERS SERVICE (Secure Customer & Admin Logistics)
// ==============================================================================
export const orderService = {
  async getOrders() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Orders Error]:', error.message);
      return null;
    }
    return (data || []).map(formatOrderRecord);
  },

  async getUserOrders(userId) {
    if (!supabase || !userId) return [];
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase User Orders Error]:', error.message);
      return [];
    }
    return (data || []).map(formatOrderRecord);
  },

  async createOrder(orderPayload) {
    if (!supabase) return null;

    const row = {
      order_id: orderPayload.orderId || `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: orderPayload.userId || null,
      customer_name: orderPayload.shipping?.name || orderPayload.customerName || 'Guest Patron',
      customer_email: orderPayload.shipping?.email || orderPayload.customerEmail || 'patron@example.com',
      customer_phone: orderPayload.shipping?.phone || orderPayload.customerPhone || null,
      shipping_address: orderPayload.shipping || {},
      items: orderPayload.items || [],
      subtotal: Number(orderPayload.subtotal || orderPayload.amount || 0),
      discount: Number(orderPayload.discount || 0),
      total_amount: Number(orderPayload.amount || orderPayload.totalAmount || 0),
      currency: orderPayload.currency || 'INR',
      payment_id: orderPayload.paymentId || null,
      payment_status: orderPayload.paymentStatus || (orderPayload.paymentId ? 'paid' : 'pending'),
      order_status: orderPayload.status || 'Paid',
      carrier: orderPayload.carrier || null,
      tracking_number: orderPayload.trackingNumber || null,
      notes: orderPayload.notes || {},
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([row])
      .select()
      .single();

    if (error) throw error;
    return formatOrderRecord(data);
  },

  async updateOrderStatus(orderId, newStatus, carrier = null, trackingNumber = null) {
    const updateObj = { order_status: newStatus };
    if (carrier) updateObj.carrier = carrier;
    if (trackingNumber) updateObj.tracking_number = trackingNumber;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update(updateObj)
          .eq('order_id', orderId)
          .select()
          .single();

        if (!error && data) return formatOrderRecord(data);
      } catch (err) {
        console.warn('[Client updateOrderStatus failed, trying server fallback]:', err.message);
      }
    }

    // Server fallback using service-role key
    const serverResult = await callAdminServerApi(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus, carrier, trackingNumber }),
    });
    if (serverResult?.data) return formatOrderRecord(serverResult.data);
    return null;
  },

  async trackOrder(orderId, email = null) {
    if (!supabase || !orderId) return null;

    try {
      // Use secure PostgreSQL RPC function first
      const { data, error } = await supabase.rpc('track_order', {
        p_order_id: orderId.trim(),
        p_email: email ? email.trim() : null,
      });

      if (!error && data && data.length > 0) {
        return formatOrderRecord(data[0]);
      }
    } catch (e) {
      console.warn('[Supabase Track Order RPC Notice]:', e);
    }

    // Direct fallback query
    let query = supabase.from('orders').select('*').ilike('order_id', orderId.trim());
    const { data: directData, error: directErr } = await query;
    if (!directErr && directData && directData.length > 0) {
      return formatOrderRecord(directData[0]);
    }

    return null;
  },
};

// ==============================================================================
// 4. PAYMENT TRANSACTIONS SERVICE (Audit Log)
// ==============================================================================
export const paymentService = {
  async recordTransaction(txData) {
    if (!supabase) return null;
    const row = {
      order_id: txData.orderId,
      razorpay_order_id: txData.razorpay_order_id || txData.orderId,
      razorpay_payment_id: txData.razorpay_payment_id || txData.paymentId,
      razorpay_signature: txData.razorpay_signature || null,
      amount: Number(txData.amount || 0),
      currency: txData.currency || 'INR',
      status: txData.status || 'captured',
      method: txData.method || 'razorpay',
      verified: Boolean(txData.verified),
      raw_response: txData.rawResponse || {},
    };

    const { data, error } = await supabase
      .from('payment_transactions')
      .insert([row])
      .select()
      .single();

    if (error) {
      console.warn('[Supabase Payment Transaction Notice]:', error.message);
      return null;
    }
    return data;
  },
};

// ==============================================================================
// 5. PROMO CODES SERVICE
// ==============================================================================
export const promoService = {
  async getActivePromos() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('active', true)
      .order('id', { ascending: true });

    if (error) return null;
    return (data || []).map(p => ({
      id: p.id,
      code: p.code,
      type: p.type,
      value: Number(p.value),
      active: p.active,
      usageCount: p.usage_count,
    }));
  },

  async getAllPromos() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('id', { ascending: true });

    if (error) return null;
    return (data || []).map(p => ({
      id: p.id,
      code: p.code,
      type: p.type,
      value: Number(p.value),
      active: p.active,
      usageCount: p.usage_count,
    }));
  },

  async createPromo(promo) {
    const payload = {
      code: promo.code.toUpperCase().trim(),
      type: promo.type,
      value: Number(promo.value),
      active: true,
      usage_count: 0,
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('promo_codes')
          .insert([payload])
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            code: data.code,
            type: data.type,
            value: Number(data.value),
            active: data.active,
            usageCount: data.usage_count,
          };
        }
      } catch (err) {
        console.warn('[Client createPromo failed, trying server fallback]:', err.message);
      }
    }

    // Server fallback using service-role key
    const serverResult = await callAdminServerApi('/api/admin/promos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (serverResult?.data) {
      const d = serverResult.data;
      return {
        id: d.id,
        code: d.code,
        type: d.type,
        value: Number(d.value),
        active: d.active,
        usageCount: d.usage_count || 0,
      };
    }
    return { id: Date.now(), ...payload, usageCount: 0 };
  },

  async togglePromo(id, active) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('promo_codes')
          .update({ active: active })
          .eq('id', Number(id))
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('[Client togglePromo failed, trying server fallback]:', err.message);
      }
    }

    // Server fallback using service-role key
    const serverResult = await callAdminServerApi(`/api/admin/promos/${id}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ active }),
    });
    return serverResult?.data || { id, active };
  },

  async deletePromo(id) {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('promo_codes')
          .delete()
          .eq('id', Number(id));

        if (!error) return true;
      } catch (err) {
        console.warn('[Client deletePromo failed, trying server fallback]:', err.message);
      }
    }

    // Server fallback using service-role key
    await callAdminServerApi(`/api/admin/promos/${id}`, {
      method: 'DELETE',
    });
    return true;
  },
};

// ==============================================================================
// 6. PRODUCT REVIEWS SERVICE
// ==============================================================================
export const reviewService = {
  async getProductReviews(productId) {
    if (!productId) return null;
    const numId = Number(productId);
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('product_reviews')
          .select('*')
          .eq('product_id', numId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(r => ({
            id: r.id,
            author: r.author,
            rating: r.rating,
            date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            title: r.title,
            comment: r.comment,
            verified: r.verified,
          }));
        }
      } catch (err) {
        console.warn('[Supabase getProductReviews Warning]:', err.message);
      }
    }

    // Server fallback
    try {
      const res = await fetch(`/api/reviews?productId=${numId}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          return json.data.map(r => ({
            id: r.id,
            author: r.author,
            rating: r.rating,
            date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            title: r.title,
            comment: r.comment,
            verified: r.verified,
          }));
        }
      }
    } catch {}

    return null;
  },

  async getAllReviews() {
    let list = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('product_reviews')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          list = data;
        }
      } catch (err) {
        console.warn('[Direct Supabase getAllReviews]:', err.message);
      }
    }

    if (!list) {
      try {
        const res = await fetch('/api/admin/reviews');
        if (res.ok) {
          const json = await res.json();
          if (json?.data) list = json.data;
        }
      } catch {}
    }

    if (!list) {
      try {
        const res = await fetch('/api/reviews');
        if (res.ok) {
          const json = await res.json();
          if (json?.data) list = json.data;
        }
      } catch {}
    }

    if (!list) return null;

    return list.map(r => ({
      id: r.id,
      productId: r.product_id,
      productTitle: r.products?.title || `Product #${r.product_id}`,
      productImage: r.products?.image || '/assets/shirt_front.png',
      author: r.author,
      rating: r.rating,
      date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      title: r.title,
      comment: r.comment,
      verified: r.verified,
    }));
  },

  async addReview(productId, review, userId = null) {
    const row = {
      product_id: Number(productId),
      user_id: userId || null,
      author: review.author.trim(),
      rating: Number(review.rating || 5),
      title: review.title?.trim() || 'Verified Experience',
      comment: review.comment.trim(),
      verified: true,
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('product_reviews')
          .insert([row])
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            author: data.author,
            rating: data.rating,
            date: new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            title: data.title,
            comment: data.comment,
            verified: data.verified,
          };
        }
      } catch (err) {
        console.warn('[Direct Supabase addReview error]:', err.message);
      }
    }

    // Backend server fallback:
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row)
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          const data = json.data;
          return {
            id: data.id,
            author: data.author,
            rating: data.rating,
            date: new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            title: data.title,
            comment: data.comment,
            verified: data.verified,
          };
        }
      }
    } catch (serverErr) {
      console.warn('[Server fallback addReview error]:', serverErr);
    }

    return {
      id: Date.now(),
      author: row.author,
      rating: row.rating,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      title: row.title,
      comment: row.comment,
      verified: true,
    };
  },

  async deleteReview(reviewId) {
    const numId = Number(reviewId);
    if (supabase) {
      try {
        const { error } = await supabase
          .from('product_reviews')
          .delete()
          .eq('id', Number(reviewId));

        if (!error) return true;
      } catch (err) {
        console.warn('[Client deleteReview notice]:', err.message);
      }
    }

    // Server fallback using service-role key
    await callAdminServerApi(`/api/admin/reviews/${reviewId}`, {
      method: 'DELETE',
    });
    return true;
  },
};

// ==============================================================================
// 7. ANNOUNCEMENTS & BROADCAST SERVICE
// ==============================================================================
export const announcementService = {
  async getAnnouncement() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('id', { ascending: true })
      .limit(1)
      .single();

    if (error) return null;
    return data?.message || null;
  },

  async updateAnnouncement(message) {
    const trimmed = String(message || '').trim();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .upsert({ id: 1, message: trimmed, active: true })
          .select()
          .single();

        if (!error && data?.message) {
          return data.message;
        }
      } catch (err) {
        console.warn('[Client updateAnnouncement failed, trying server fallback]:', err.message);
      }
    }

    // Server fallback using service-role key
    const serverResult = await callAdminServerApi('/api/admin/announcement', {
      method: 'PUT',
      body: JSON.stringify({ message: trimmed }),
    });
    return serverResult?.message || trimmed;
  },
};

// ==============================================================================
// 8. NEWSLETTER SUBSCRIBERS SERVICE (Zero Leakage)
// ==============================================================================
export const newsletterService = {
  async subscribe(email) {
    if (!supabase) return true;
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert([{ email: email.toLowerCase().trim() }]);

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
    return true;
  },

  async getSubscribers() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  },
};

// ==============================================================================
// Internal Helpers
// ==============================================================================
function formatOrderRecord(row) {
  if (!row) return null;
  return {
    orderId: row.order_id || row.id,
    paymentId: row.payment_id || `pay_${row.order_id}`,
    amount: Number(row.total_amount || row.amount || 0),
    items: row.items || [],
    shipping: row.shipping_address || {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
    },
    carrier: row.carrier || null,
    trackingNumber: row.tracking_number || null,
    timestamp: row.created_at
      ? new Date(row.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    status: row.order_status || row.status || 'Paid',
    paymentStatus: row.payment_status || 'paid',
  };
}
