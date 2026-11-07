import express from "express";
import cors from "cors";
import paymentRouter from "./payment.js";
import adminRouter from "./admin.js";
import { isServerSupabaseConfigured, supabaseAdmin } from "./supabase.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Whitelist allowed origins for CORS with credentials
const ALLOWED_ORIGINS = [
  "https://edenandthread.com",
  "https://www.edenandthread.com",
  "https://eden-threads.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or curl/mobile requests without origin header
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app") || origin.endsWith(".loca.lt")) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy violation: Unauthorized origin"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Cron-Secret", "Accept"]
}));

// Express body parser with 50mb limit and rawBody capture for webhook cryptographic verification
app.use(express.json({
  limit: "50mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Admin API routes (Supabase Service-Role guaranteed persistence)
app.use("/api/admin", adminRouter);

// Payment API routes (Razorpay orders and verification)
app.use("/api/payment", paymentRouter);

// Public reviews endpoints for customer submissions and retrieval
app.get("/api/reviews", async (req, res) => {
  try {
    const productId = req.query.productId ? Number(req.query.productId) : null;
    let query = supabaseAdmin.from('product_reviews').select('*').order('created_at', { ascending: false });
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reviews", async (req, res) => {
  try {
    const { product_id, author, rating, title, comment, verified, user_id } = req.body;
    if (!product_id || !author || !comment) {
      return res.status(400).json({ error: 'Missing required review fields' });
    }
    const numProductId = Number(product_id);

    // Verify product exists prior to accepting review
    const { data: existingProd } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', numProductId)
      .maybeSingle();

    if (!existingProd) {
      return res.status(404).json({ error: 'Cannot review non-existent product' });
    }

    const { data, error } = await supabaseAdmin
      .from('product_reviews')
      .insert([{
        product_id: numProductId,
        user_id: user_id || null,
        author: author.trim(),
        rating: Number(rating || 5),
        title: title?.trim() || 'Verified Experience',
        comment: comment.trim(),
        verified: verified ?? true
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dynamic XML Sitemap Route (Supabase Realtime Synced)
app.get("/sitemap.xml", async (req, res) => {
  try {
    let products = [];
    if (isServerSupabaseConfigured()) {
      const { data } = await supabaseAdmin.from('products').select('id, title, updated_at').eq('is_active', true);
      if (data) products = data;
    }

    const today = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    const staticRoutes = [
      { loc: "https://edenandthread.com/", priority: "1.0", changefreq: "daily" },
      { loc: "https://edenandthread.com/shop", priority: "0.9", changefreq: "daily" },
      { loc: "https://edenandthread.com/story", priority: "0.8", changefreq: "monthly" },
      { loc: "https://edenandthread.com/journal", priority: "0.8", changefreq: "weekly" }
    ];

    staticRoutes.forEach(r => {
      xml += `  <url>\n    <loc>${r.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>\n`;
    });

    products.forEach(p => {
      const slug = p.title ? p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : `product-${p.id}`;
      xml += `  <url>\n    <loc>https://edenandthread.com/products/${slug}</loc>\n    <lastmod>${(p.updated_at || today).split('T')[0]}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.95</priority>\n  </url>\n`;
    });

    xml += `</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating dynamic sitemap');
  }
});

// Health and status endpoint
app.get("/status", (req, res) => {
  res.json({ 
    status: "active", 
    backend: "Supabase-PostgreSQL",
    supabaseConfigured: isServerSupabaseConfigured(),
    payment: "razorpay-active",
    environment: process.env.VERCEL ? "vercel-serverless" : "local-standalone"
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[EDEN & THREADS Server] Running on http://localhost:${PORT}`);
    console.log(`[EDEN & THREADS Server] Supabase Database: ${isServerSupabaseConfigured() ? 'Connected' : 'Waiting for environment variables'}`);
  });
}

export default app;

