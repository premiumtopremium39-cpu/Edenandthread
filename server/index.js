import express from "express";
import cors from "cors";
import paymentRouter from "./payment.js";
import adminRouter from "./admin.js";
import { isServerSupabaseConfigured, supabaseAdmin } from "./supabase.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for client Vite server, localtunnel, and Vercel domains
app.use(cors({
  origin: true,
  credentials: true
}));

// Express body parser with 50mb limit for PNG uploads
app.use(express.json({ limit: "50mb" }));
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

    // Verify if product exists in products table, if not ensure entry so FK constraint succeeds
    try {
      const { data: existingProd } = await supabaseAdmin.from('products').select('id').eq('id', numProductId).maybeSingle();
      if (!existingProd) {
        await supabaseAdmin.from('products').insert([{
          id: numProductId,
          title: `Linen Garment #${numProductId}`,
          category: 'linen-shirts',
          price: 18500,
          stock: 15,
          image: '/assets/shirt_front.png',
          is_active: true
        }]);
      }
    } catch (prodErr) {
      console.warn('[Auto-create product for review warning]:', prodErr.message);
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

