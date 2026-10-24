import express from 'express';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabase.js';

const router = express.Router();

// Helper to check if supabaseAdmin is available
const checkAdmin = (req, res, next) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase service role admin is not configured on server' });
  }
  next();
};

// 1. Products CRUD
router.post('/products', checkAdmin, async (req, res) => {
  try {
    const product = req.body;
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([{
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
      }])
      .select();

    if (error) throw error;
    res.json({ success: true, data: data?.[0] || null });
  } catch (err) {
    console.error('[Server Admin Add Product Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/products/:id', checkAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
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

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(sanitized)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data?.[0] || null });
  } catch (err) {
    console.error('[Server Admin Update Product Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/products/:id', checkAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Server Admin Delete Product Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Announcements
router.put('/announcement', checkAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .upsert({ id: 1, message: String(message || '').trim(), active: true })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: data?.message });
  } catch (err) {
    console.error('[Server Admin Update Announcement Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Promo Codes
router.post('/promos', checkAdmin, async (req, res) => {
  try {
    const promo = req.body;
    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .insert([{
        code: promo.code.toUpperCase().trim(),
        type: promo.type,
        value: Number(promo.value),
        active: true,
        usage_count: 0,
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[Server Admin Create Promo Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/promos/:id/toggle', checkAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { active } = req.body;
    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .update({ active: Boolean(active) })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[Server Admin Toggle Promo Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/promos/:id', checkAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { error } = await supabaseAdmin.from('promo_codes').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Server Admin Delete Promo Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Orders
router.put('/orders/:id/status', checkAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, carrier, trackingNumber } = req.body;
    const updateObj = { order_status: status };
    if (carrier) updateObj.carrier = carrier;
    if (trackingNumber) updateObj.tracking_number = trackingNumber;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updateObj)
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[Server Admin Update Order Status Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Reviews
router.get('/reviews', checkAdmin, async (req, res) => {
  try {
    const { data: reviews, error } = await supabaseAdmin
      .from('product_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: prods } = await supabaseAdmin.from('products').select('id, title, image');
    const prodsMap = (prods || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

    const enriched = (reviews || []).map(r => ({
      ...r,
      productTitle: prodsMap[r.product_id]?.title || `Product #${r.product_id}`,
      productImage: prodsMap[r.product_id]?.image || '/assets/shirt_front.png'
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('[Server Admin Get Reviews Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reviews', async (req, res) => {
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
    console.error('[Server Add Review Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/reviews/:id', checkAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { error } = await supabaseAdmin.from('product_reviews').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Server Admin Delete Review Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. PNG Image Upload (Strictly accepts .png only, uploads to Supabase Storage bucket or local)
router.post('/upload-image', checkAdmin, async (req, res) => {
  try {
    const { filename, base64Data, contentType } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Strict validation: Only PNG format allowed
    const isPngType = contentType === 'image/png' || (typeof base64Data === 'string' && base64Data.startsWith('data:image/png'));
    const isPngExt = (filename || '').toLowerCase().endsWith('.png');

    if (!isPngType && !isPngExt) {
      return res.status(400).json({ error: 'Invalid file format. Only PNG images (.png) are permitted.' });
    }

    // Strip base64 metadata header if present
    const cleanBase64 = base64Data.replace(/^data:image\/[^;]+;base64,/, '').replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Verify PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.length < 8 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
      return res.status(400).json({ error: 'Corrupted or non-PNG file header. Only valid PNG files (.png) are accepted.' });
    }

    // Clean safe filename
    const safeBaseName = (filename || 'garment')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const finalFilename = `${safeBaseName}_${Date.now()}.png`;

    let finalPublicUrl = null;

    // 1. Try uploading to Supabase Storage 'garment-photos' bucket first
    if (supabaseAdmin) {
      try {
        // Ensure bucket exists or create if needed
        try {
          const { data: buckets } = await supabaseAdmin.storage.listBuckets();
          const bucketExists = (buckets || []).some(b => b.name === 'garment-photos');
          if (!bucketExists) {
            await supabaseAdmin.storage.createBucket('garment-photos', { public: true });
          }
        } catch (bErr) {
          console.warn('[Supabase Storage Bucket check/create]:', bErr.message);
        }

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('garment-photos')
          .upload(finalFilename, buffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('garment-photos')
            .getPublicUrl(finalFilename);

          if (publicUrlData?.publicUrl) {
            finalPublicUrl = publicUrlData.publicUrl;
            console.log(`[Supabase Storage]: Successfully uploaded to ${finalPublicUrl}`);
          }
        } else if (uploadError) {
          console.warn('[Supabase Storage upload error]:', uploadError.message);
        }
      } catch (storageErr) {
        console.warn('[Supabase Storage error]:', storageErr.message);
      }
    }

    // 2. Fallback to writing to public/assets/uploads/ if local file system is writable
    if (!finalPublicUrl) {
      try {
        const uploadDir = path.resolve(process.cwd(), 'public', 'assets', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, finalFilename);
        fs.writeFileSync(filePath, buffer);
        finalPublicUrl = `/assets/uploads/${finalFilename}`;
      } catch (fsErr) {
        console.warn('[Local fs write error, using Base64 data]:', fsErr.message);
        finalPublicUrl = `data:image/png;base64,${cleanBase64}`;
      }
    }

    res.json({
      success: true,
      url: finalPublicUrl,
      filename: finalFilename,
      sizeBytes: buffer.length
    });
  } catch (err) {
    console.error('[Server Admin Image Upload Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
