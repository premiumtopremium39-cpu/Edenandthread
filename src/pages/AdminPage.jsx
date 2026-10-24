import React, { useState, useEffect } from 'react';
import { supabase, authService, reviewService, isSupabaseConfigured } from '../lib/supabase';
import { AVAILABLE_IMAGE_SETS, get5ViewsForSet, getProductColorImage, handleImageError, DEFAULT_FALLBACK_IMAGE } from '../utils/productViews';

const INITIAL_DEMO_ORDERS = [
  {
    orderId: "order_ATELIER_98214",
    paymentId: "pay_rzp_live_839210",
    amount: 43000.00,
    items: [
      { id: 1, title: "Loro Piana Spread Collar Shirt", price: 24500.00, qty: 1, color: "White", size: "L" },
      { id: 2, title: "Cucinelli Band Collar Linen Shirt", price: 18500.00, qty: 1, color: "Oatmeal", size: "M" }
    ],
    shipping: {
      name: "Matteo Rossi",
      email: "matteo.rossi@milano.it",
      address: "Via Montenapoleone 8",
      city: "Milan",
      zip: "20121",
      country: "Italy",
      phone: "+39 02 8765432"
    },
    timestamp: "15 Aug 2026, 06:30 PM",
    status: "Delivered"
  },
  {
    orderId: "order_ATELIER_98215",
    paymentId: "pay_rzp_live_839211",
    amount: 15500.00,
    items: [
      { id: 3, title: "Luca Faloni Capri Camp Collar", price: 15500.00, qty: 1, color: "Sky Blue", size: "M" }
    ],
    shipping: {
      name: "Arthur Pendelton",
      email: "arthur.p@london.co.uk",
      address: "42 Mayfair Square",
      city: "London",
      zip: "W1K 4QA",
      country: "United Kingdom",
      phone: "+44 20 7946 0912"
    },
    timestamp: "15 Aug 2026, 07:15 PM",
    status: "Dispatched"
  },
  {
    orderId: "order_ATELIER_98216",
    paymentId: "pay_rzp_live_839212",
    amount: 13500.00,
    items: [
      { id: 4, title: "Brunello Cucinelli Popover Shirt", price: 13500.00, qty: 1, color: "Peach", size: "L" }
    ],
    shipping: {
      name: "Elena Rostova",
      email: "elena.r@monaco.mc",
      address: "Le Mirabeau, 2 Avenue des Citronniers",
      city: "Monaco",
      zip: "98000",
      country: "Monaco",
      phone: "+377 93 25 00 00"
    },
    timestamp: "15 Aug 2026, 07:30 PM",
    status: "Preparation"
  },
  {
    orderId: "order_ATELIER_98217",
    paymentId: "pay_rzp_live_839213",
    amount: 16500.00,
    items: [
      { id: 5, title: "Orlebar Brown Tailored Linen Shirt", price: 16500.00, qty: 1, color: "White", size: "XL" }
    ],
    shipping: {
      name: "Vikram Singhania",
      email: "vikram.s@atelier.in",
      address: "Bungalow 7, Malabar Hill",
      city: "Mumbai",
      zip: "400006",
      country: "India",
      phone: "+91 98200 12345"
    },
    timestamp: "15 Aug 2026, 07:45 PM",
    status: "Paid"
  }
];

export default function AdminPage({ 
  products, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct, 
  orders, 
  onUpdateOrderStatus,
  promoCodes = [],
  onAddPromoCode,
  onTogglePromoCode,
  onDeletePromoCode,
  announcementText,
  onUpdateAnnouncement,
  user,
  onLogout,
  showToast 
}) {
  const isUserAdmin = user?.role === 'admin' || (user?.email && (user.email === 'admin@mail.com' || user.email === 'admin@edenthreads.luxury'));
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem("eden_threads_admin_session") === "true";
  });

  const isAllowed = isUserAdmin || isAdminAuthenticated;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'inventory' | 'promos' | 'broadcast' | 'subscribers'
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Auto-sync Supabase Auth admin session when admin is authenticated
  useEffect(() => {
    if (isAllowed && isSupabaseConfigured() && user?.role !== 'admin') {
      authService.signIn('admin@mail.com', 'admin123').catch((err) => {
        console.warn('[Admin Background Auth Notice]:', err?.message);
      });
    }
  }, [isAllowed, user?.role]);

  // Google OAuth for Admin
  const handleGoogleAdminLogin = async () => {
    setIsGoogleLoading(true);
    try {
      if (isSupabaseConfigured()) {
        localStorage.setItem("eden_threads_login_redirect", "#admin");
        await authService.signInWithGoogle("#admin");
      } else {
        setIsAdminAuthenticated(true);
        localStorage.setItem("eden_threads_admin_session", "true");
        showToast("<i class='fa-solid fa-shield-halved'></i> Signed in as Administrator");
      }
    } catch (err) {
      console.error("[Admin Google Auth Error]:", err);
      showToast(`<i class="fa-solid fa-triangle-exclamation"></i> Google Sign In failed: ${err.message}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Orders Filtering & Search State
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");


  // Promo Code Modal State
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: "",
    type: "percent",
    value: "15"
  });

  // Customer Reviews Moderation State
  const [reviewSearchTerm, setReviewSearchTerm] = useState("");
  const [reviewRatingFilter, setReviewRatingFilter] = useState("all");
  const [reviewsList, setReviewsList] = useState([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);

  // Fetch real reviews from Supabase across all products
  const fetchAllReviews = async () => {
    setIsReviewsLoading(true);
    try {
      const cloudReviews = await reviewService.getAllReviews();
      if (cloudReviews && cloudReviews.length > 0) {
        const mapped = cloudReviews.map(r => {
          const matchedProd = (products || []).find(p => Number(p.id) === Number(r.productId || r.product_id));
          return {
            ...r,
            productId: r.productId || r.product_id,
            productTitle: matchedProd?.title || r.productTitle || `Product #${r.productId || r.product_id}`,
            productImage: matchedProd?.image || r.productImage || '/assets/shirt_front.png'
          };
        });

        // Also merge any local reviews that might only be in this browser
        const cloudIds = new Set(mapped.map(m => String(m.id)));
        (products || []).forEach(prod => {
          const saved = localStorage.getItem(`eden_threads_reviews_${prod.id}`);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              parsed.forEach(rev => {
                if (!cloudIds.has(String(rev.id))) {
                  mapped.push({
                    ...rev,
                    productId: prod.id,
                    productTitle: prod.title,
                    productImage: prod.image
                  });
                }
              });
            } catch {}
          }
        });

        setReviewsList(mapped);
        setIsReviewsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[Admin Reviews Fetch Error]:', err);
    }

    // Fallback to local storage if Supabase is offline
    const localReviews = [];
    (products || []).forEach(prod => {
      const saved = localStorage.getItem(`eden_threads_reviews_${prod.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.forEach(rev => {
            localReviews.push({
              ...rev,
              productId: prod.id,
              productTitle: prod.title,
              productImage: prod.image
            });
          });
        } catch {}
      } else if (prod.id === 1) {
        localReviews.push(
          { id: 1, author: "Julian Vance", rating: 5, date: "August 12, 2026", title: "Hands down the best linen shirt I've worn", comment: "The breathability in Mediterranean heat is unreal. It doesn't stick to the skin and the pre-washed texture feels soft immediately. Fits true to size.", verified: true, productId: 1, productTitle: prod.title, productImage: prod.image },
          { id: 2, author: "Marcus Sterling", rating: 5, date: "July 29, 2026", title: "Subtle luxury without noisy logos", comment: "The mother of pearl buttons and French seams are flawless. Wore this to an outdoor coastal wedding and stayed cool the entire evening.", verified: true, productId: 1, productTitle: prod.title, productImage: prod.image }
        );
      } else if (prod.id === 2) {
        localReviews.push(
          { id: 3, author: "Alexander Wright", rating: 5, date: "August 20, 2026", title: "Exceptional craftsmanship", comment: "The band collar is structured just right. Works great under a summer jacket or untucked with shorts.", verified: true, productId: 2, productTitle: prod.title, productImage: prod.image }
        );
      }
    });
    setReviewsList(localReviews);
    setIsReviewsLoading(false);
  };

  useEffect(() => {
    fetchAllReviews();
  }, [products]);

  // Real-time listener for new reviews submitted by customers anywhere
  useEffect(() => {
    const handleLocalReviewChange = () => fetchAllReviews();
    window.addEventListener('eden_threads_review_change', handleLocalReviewChange);

    let channel = null;
    if (supabase) {
      channel = supabase
        .channel('admin-reviews-realtime-listener')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'product_reviews' }, () => {
          fetchAllReviews();
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('eden_threads_review_change', handleLocalReviewChange);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [products]);

  // Product Modal State (for Add / Edit)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedCardColors, setSelectedCardColors] = useState({});
  const [productForm, setProductForm] = useState({
    title: "",
    category: "spread-collar",
    price: "",
    image: "/assets/shirt_front.png",
    badge: "Italian Luxury",
    description: "Meticulously crafted from 100% pure organic European flax linen.",
    sizes: "S, M, L, XL"
  });
  const [colorVariants, setColorVariants] = useState([
    { name: "Pristine White", code: "#FFFFFF", stock: 10, imageSet: "shirt", customImage: null, customViews: null },
    { name: "Sky Blue", code: "#B0C4DE", stock: 5, imageSet: "shirt_blue", customImage: null, customViews: null },
    { name: "Olive Green", code: "#556B2F", stock: 8, imageSet: "shirt_olive", customImage: null, customViews: null }
  ]);
  // Standalone PNG Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedPngPreview, setUploadedPngPreview] = useState(null);
  const [uploadedPngUrl, setUploadedPngUrl] = useState("");
  const [uploadTargetProductId, setUploadTargetProductId] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // 5-Angle Custom Views Modal State
  const [isAnglesModalOpen, setIsAnglesModalOpen] = useState(false);
  const [editingAnglesColorIdx, setEditingAnglesColorIdx] = useState(null);
  const [tempAngleViews, setTempAngleViews] = useState([]);

  // Client-side image optimizer to preserve crisp quality while preventing quota issues
  const optimizeImage = (dataUrl, maxDimension = 1400) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.92));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Handle PNG Image File Upload (Strictly accepts .png only)
  const handleFileUpload = async (e, onComplete) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation: Only PNG format allowed
    const isPng = file.name.toLowerCase().endsWith('.png') || file.type === 'image/png';
    if (!isPng) {
      showToast("<i class='fa-solid fa-circle-exclamation'></i> Format Error: Only PNG images (.png) are accepted for garment assets.");
      e.target.value = "";
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast("<i class='fa-solid fa-triangle-exclamation'></i> File size exceeds 25MB limit.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      let base64Data = reader.result;

      try {
        base64Data = await optimizeImage(base64Data, 1400);
      } catch (optErr) {
        console.warn("[Image Optimizer]:", optErr);
      }

      let finalUrl = base64Data;

      try {
        let res;
        try {
          res = await fetch('/api/admin/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              contentType: 'image/png',
              base64Data
            })
          });
        } catch {
          res = await fetch('http://localhost:5000/api/admin/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              contentType: 'image/png',
              base64Data
            })
          });
        }

        if (res && res.ok) {
          const data = await res.json();
          if (data?.url) {
            finalUrl = data.url;
            showToast(`<i class='fa-solid fa-cloud-arrow-up'></i> Saved ${data.filename} to server!`);
          }
        } else if (res && !res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn("[Server upload rejected, using optimized local data]:", errData);
        }
      } catch (err) {
        console.warn("[Upload Server API Notice]:", err);
      }

      setIsUploading(false);
      if (onComplete) onComplete(finalUrl);
      e.target.value = "";
    };
    reader.onerror = () => {
      setIsUploading(false);
      showToast("<i class='fa-solid fa-triangle-exclamation'></i> Failed to read PNG file.");
    };
    reader.readAsDataURL(file);
  };

  // Handle Admin Login with live Supabase Auth
  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    const isAdminEmail = cleanEmail.toLowerCase() === "admin@mail.com" || cleanEmail.toLowerCase() === "admin@edenthreads.luxury";
    const isAcceptedPass = cleanPassword === "admin" || cleanPassword === "admin123";

    if (isAdminEmail && isAcceptedPass) {
      setIsAdminAuthenticated(true);
      localStorage.setItem("eden_threads_admin_session", "true");

      if (isSupabaseConfigured()) {
        try {
          await authService.signIn(cleanEmail.toLowerCase(), 'admin123');
          console.log('[Admin Auth]: Authenticated with Supabase Admin credentials');
        } catch (err) {
          console.warn('[Admin Supabase Auth Notice]:', err.message);
        }
      }

      showToast("<i class='fa-solid fa-shield-halved'></i> Welcome to the EDEN & THREADS Admin Portal");
    } else {
      showToast("<i class='fa-solid fa-triangle-exclamation'></i> Invalid credentials. Use admin@mail.com and admin");
    }
  };

  const handleQuickFill = () => {
    setEmail("admin@mail.com");
    setPassword("admin");
  };

  const handleLogout = async () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem("eden_threads_admin_session");
    if (isSupabaseConfigured()) {
      try {
        await authService.signOut();
      } catch (err) {
        console.warn('[Admin Sign Out Notice]:', err);
      }
    }
    if (onLogout) {
      onLogout();
    } else {
      showToast("<i class='fa-solid fa-arrow-right-from-bracket'></i> Admin session ended.");
    }
  };

  // Save Promo Code
  const handleSavePromo = (e) => {
    e.preventDefault();
    if (!promoForm.code || !promoForm.value) return;

    if (onAddPromoCode) {
      onAddPromoCode({
        code: promoForm.code.trim().toUpperCase(),
        type: promoForm.type,
        value: parseFloat(promoForm.value),
        active: true
      });
      showToast(`<i class='fa-solid fa-tag'></i> Created Promo Code ${promoForm.code.toUpperCase()}`);
    }

    setPromoForm({ code: "", type: "percent", value: "15" });
    setIsPromoModalOpen(false);
  };

  // Open modal to add product
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setProductForm({
      title: "",
      category: "spread-collar",
      price: "",
      image: "/assets/shirt_front.png",
      badge: "Italian Luxury",
      description: "Meticulously crafted from 100% pure organic European flax linen.",
      sizes: "S, M, L, XL"
    });
    setColorVariants([
      { name: "Pristine White", code: "#FFFFFF", stock: 10, imageSet: "shirt", customImage: null, customViews: null },
      { name: "Sky Blue", code: "#B0C4DE", stock: 5, imageSet: "shirt_blue", customImage: null, customViews: null },
      { name: "Olive Green", code: "#556B2F", stock: 8, imageSet: "shirt_olive", customImage: null, customViews: null }
    ]);
    setIsProductModalOpen(true);
  };

  // Open modal to edit product
  const handleOpenEditProduct = (prod) => {
    setEditingProductId(prod.id);
    setProductForm({
      title: prod.title,
      category: prod.category,
      price: prod.price.toString(),
      image: prod.image || "/assets/shirt_front.png",
      badge: prod.badge || "",
      description: prod.description || "",
      sizes: (prod.sizes || ["S", "M", "L", "XL"]).join(", ")
    });

    if (prod.colors && Array.isArray(prod.colors) && prod.colors.length > 0) {
      setColorVariants(prod.colors.map((c, idx) => {
        let set = "shirt";
        if (c.image) {
          const m = c.image.match(/(shirt_[a-z]+|shirt|set1|set2)/);
          if (m) set = m[1];
        } else {
          const nm = (c.name || '').toLowerCase();
          if (nm.includes('navy')) set = 'shirt_navy';
          else if (nm.includes('blue')) set = 'shirt_blue';
          else if (nm.includes('sage')) set = 'shirt_sage';
          else if (nm.includes('olive') || nm.includes('green')) set = 'shirt_olive';
          else if (nm.includes('beige') || nm.includes('oatmeal') || nm.includes('sand')) set = 'shirt_beige';
          else if (nm.includes('peach') || nm.includes('sunset')) set = 'shirt_peach';
          else if (nm.includes('charcoal')) set = 'shirt_charcoal';
        }

        const isStandardPreset = /^\/assets\/(shirt(_[a-z]+)?|set[12])_front\.png$/.test(c.image || '') || /^\/assets\/set[12]\/front\.png$/.test(c.image || '');
        const customImg = c.customImage || (!isStandardPreset && c.image ? c.image : (idx === 0 && prod.image && !/^\/assets\/(shirt|set)/.test(prod.image) ? prod.image : null));

        // Preserve full customized 5-angle views if user uploaded custom angle photos
        const hasCustomViews = Array.isArray(c.views) && c.views.some(v => v?.url && !/^\/assets\/(shirt|set)/.test(v.url));

        return {
          name: c.name || "Custom",
          code: c.code || "#FFFFFF",
          stock: typeof c.stock === 'number' ? c.stock : 5,
          imageSet: set,
          customImage: customImg,
          customViews: hasCustomViews ? c.views : (c.views || null)
        };
      }));
    } else {
      const isStandardPreset = /^\/assets\/(shirt(_[a-z]+)?|set[12])_front\.png$/.test(prod.image || '');
      const customImg = !isStandardPreset && prod.image ? prod.image : null;
      setColorVariants([
        { name: "Pristine White", code: "#FFFFFF", stock: prod.stock ?? 10, imageSet: "shirt", customImage: customImg, customViews: null }
      ]);
    }
    setIsProductModalOpen(true);
  };

  // Helper to open 5-angle custom photo modal for a specific color variant
  const handleOpenAnglesModal = (colorIdx) => {
    const cv = colorVariants[colorIdx];
    if (!cv) return;
    const baseViews = cv.customViews || get5ViewsForSet(cv.imageSet || 'shirt');
    // Ensure 5 slots
    const defaultLabels = ["Front View", "Back Side", "Left Side View", "Button View", "Right Side View"];
    const populated = defaultLabels.map((name, i) => {
      const existing = baseViews[i];
      if (existing) {
        return { name: existing.name || name, url: existing.url };
      }
      return { name, url: "" };
    });

    if (cv.customImage && populated[0]) {
      populated[0].url = cv.customImage;
    }

    setTempAngleViews(populated);
    setEditingAnglesColorIdx(colorIdx);
    setIsAnglesModalOpen(true);
  };

  // Save 5-angle custom photo modal
  const handleSaveAngleViews = () => {
    if (editingAnglesColorIdx === null) return;
    setColorVariants(prev => prev.map((item, i) => {
      if (i === editingAnglesColorIdx) {
        const frontUrl = tempAngleViews[0]?.url || item.customImage;
        return {
          ...item,
          customImage: frontUrl || item.customImage,
          customViews: tempAngleViews
        };
      }
      return item;
    }));
    setIsAnglesModalOpen(false);
    setEditingAnglesColorIdx(null);
    showToast("<i class='fa-solid fa-camera-retro'></i> Saved custom 5-angle views for this color variant!");
  };

  // Save product from form
  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!productForm.title || !productForm.price) return;

    // Build rich colors with 5 views each
    const parsedColors = colorVariants.map((cv, idx) => {
      let views = cv.customViews ? [...cv.customViews] : get5ViewsForSet(cv.imageSet || 'shirt');
      const activeCustom = cv.customImage || (idx === 0 && productForm.image && !productForm.image.startsWith('/assets/shirt') && !productForm.image.startsWith('/assets/set') ? productForm.image : null);
      if (activeCustom) {
        views[0] = { name: views[0]?.name || "Front View (Custom PNG)", url: activeCustom };
      }
      return {
        name: cv.name.trim() || 'Custom',
        code: cv.code || '#FFFFFF',
        stock: parseInt(cv.stock, 10) >= 0 ? parseInt(cv.stock, 10) : 0,
        image: activeCustom || views[0]?.url || '/assets/shirt_front.png',
        customImage: activeCustom,
        views: views
      };
    });

    const totalStock = parsedColors.reduce((sum, c) => sum + (c.stock || 0), 0);
    const parsedSizes = productForm.sizes.split(",").map(s => s.trim()).filter(Boolean);

    const productPayload = {
      title: productForm.title.trim(),
      category: productForm.category,
      price: parseFloat(productForm.price),
      stock: totalStock,
      image: productForm.image || parsedColors[0]?.image || '/assets/shirt_front.png',
      badge: productForm.badge.trim(),
      description: productForm.description.trim(),
      sizes: parsedSizes.length > 0 ? parsedSizes : ["S", "M", "L", "XL"],
      colors: parsedColors
    };

    if (editingProductId) {
      onUpdateProduct(editingProductId, productPayload);
      showToast(`<i class='fa-solid fa-check'></i> Updated ${productPayload.title} (${totalStock} units across ${parsedColors.length} colors)`);
    } else {
      onAddProduct(productPayload);
      showToast(`<i class='fa-solid fa-plus'></i> Added ${productPayload.title} (${parsedColors.length * 5} images created)`);
    }

    setIsProductModalOpen(false);
  };

  // KPI Calculations
  const allOrdersList = orders && orders.length > 0 ? orders : INITIAL_DEMO_ORDERS;
  const totalRevenue = allOrdersList.reduce((acc, o) => acc + (parseFloat(o.amount) || 0), 0);
  const totalOrdersCount = allOrdersList.length;
  const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const totalInventoryCount = (products || []).length;
  const totalStockUnits = (products || []).reduce((acc, p) => acc + (typeof p.stock === 'number' ? p.stock : 10), 0);
  const outOfStockCount = (products || []).filter(p => typeof p.stock === 'number' && p.stock <= 0).length;

  // 1. Unauthenticated Login Gate
  if (!isAllowed) {
    return (
      <div style={{ paddingTop: '120px', paddingBottom: '80px', minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fff', border: '1px solid var(--border-medium)', padding: '3rem 2.5rem', boxShadow: 'var(--shadow-medium)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--green-light)', color: 'var(--green-dark)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1rem' }}>
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Management Console
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--green-dark)', fontWeight: 400 }}>
              Atelier Admin Portal
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Restricted executive access for store operations
            </p>
          </div>

          {/* User Logged in without Admin Role Warning */}
          {user && !isUserAdmin && (
            <div style={{ backgroundColor: 'var(--gold-light)', border: '1px solid var(--gold-border)', color: 'var(--gold-dark)', padding: '0.75rem 1rem', fontSize: '0.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <div>
                Signed in as <strong>{user.email}</strong>.<br />
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>This account does not have Admin privileges. Sign in with an authorized Google account.</span>
              </div>
            </div>
          )}

          {/* Google Sign In for Admin */}
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button 
              type="button" 
              onClick={handleGoogleAdminLogin}
              disabled={isGoogleLoading}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.75rem', 
                padding: '0.9rem 1rem', 
                border: '1px solid var(--border-medium)', 
                backgroundColor: '#fff', 
                fontSize: '0.85rem', 
                fontWeight: 600, 
                color: 'var(--text-primary)', 
                transition: 'var(--transition-fast)',
                cursor: isGoogleLoading ? 'wait' : 'pointer',
                boxShadow: 'var(--shadow-subtle)'
              }}
              className="oauth-btn google-btn"
            >
              {isGoogleLoading ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.79 2.16c1.63-1.5 2.57-3.71 2.57-6.49z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.79-2.16c-.78.52-1.78.83-3.17.83-2.44 0-4.51-1.65-5.25-3.87L.96 12.77C2.43 15.69 5.47 17.75 9 17.75z"/>
                  <path fill="#FBBC05" d="M3.75 10.6c-.19-.58-.3-1.2-.3-1.8s.11-1.22.3-1.8L.96 4.84C.35 6.07 0 7.49 0 9s.35 2.93.96 4.16l2.79-2.56z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4C13.46.97 11.43.1 9 .1c-3.53 0-6.57 2.06-8.04 4.98L3.75 7.64C4.49 5.42 6.56 3.58 9 3.58z"/>
                </svg>
              )}
              Continue with Google (Admin)
            </button>
          </div>

          {/* Separator */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', color: 'var(--text-muted)' }}>
            <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }}></span>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 0.75rem' }}>or use credentials</span>
            <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }}></span>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1.25rem' }}>
            <div>
              <label htmlFor="admin-email" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Admin Email
              </label>
              <input 
                type="email" 
                id="admin-email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mail.com"
                style={{ width: '100%', padding: '0.85rem', border: '1px solid var(--border-medium)', fontSize: '0.9rem', borderRadius: 0 }}
              />
            </div>

            <div>
              <label htmlFor="admin-password" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input 
                type="password" 
                id="admin-password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.85rem', border: '1px solid var(--border-medium)', fontSize: '0.9rem', borderRadius: 0 }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: '100%', padding: '1rem', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginTop: '0.5rem' }}
            >
              <i className="fa-solid fa-lock" style={{ marginRight: '8px' }}></i> Sign In to Dashboard
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={handleQuickFill}
              style={{ padding: '0.65rem', fontSize: '0.75rem', border: '1px dashed var(--accent)', color: 'var(--accent)', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              <i className="fa-solid fa-key" style={{ marginRight: '6px' }}></i> Quick-Fill Credentials (admin@mail.com / admin)
            </button>

            <a 
              href="#" 
              style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'underline' }}
            >
              Return to Customer Storefront
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard
  return (
    <div style={{ paddingTop: '110px', paddingBottom: '80px', minHeight: '90vh', backgroundColor: '#fcfbf8' }} className="admin-dashboard-page">
      <div className="container">
        {/* Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-medium)', paddingBottom: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', color: 'var(--green-dark)', fontWeight: 400, margin: 0 }}>
                Executive Atelier Portal
              </h1>
              <span style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-dark)', padding: '0.25rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '4px' }}>
                Active Admin
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Logged in as <strong style={{ color: 'var(--text-primary)' }}>{user?.email || 'admin@mail.com'}</strong> &bull; EDEN &amp; THREADS Atelier
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a 
              href="#shop" 
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
            >
              <i className="fa-solid fa-eye" style={{ marginRight: '6px' }}></i> View Storefront
            </a>
            <button 
              onClick={handleLogout}
              className="btn"
              style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, backgroundColor: '#f5e8e8', color: '#9e2a2b', border: '1px solid #e0c8c8', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: '6px' }}></i> Logout
            </button>
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '1.75rem', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Gross Revenue
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--green-light)', color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                <i className="fa-solid fa-indian-rupee-sign"></i>
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--green-dark)', fontFamily: 'var(--font-sans)' }}>
              ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#2d6a4f', fontWeight: 600, display: 'block', marginTop: '0.5rem' }}>
              <i className="fa-solid fa-arrow-trend-up"></i> Razorpay Live Verified
            </span>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '1.75rem', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Total Orders
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f0f4f8', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                <i className="fa-solid fa-bag-shopping"></i>
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
              {totalOrdersCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.5rem' }}>
              Fulfillment in progress
            </span>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '1.75rem', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Inventory Units
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                <i className="fa-solid fa-boxes-stacked"></i>
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
              {totalStockUnits} Units
            </div>
            <span style={{ fontSize: '0.75rem', color: outOfStockCount > 0 ? '#b91c1c' : '#15803d', fontWeight: 600, display: 'block', marginTop: '0.5rem' }}>
              {outOfStockCount > 0 ? `${outOfStockCount} Style(s) Sold Out` : `Across ${totalInventoryCount} Active Models`}
            </span>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '1.75rem', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Average Order Value
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                <i className="fa-solid fa-chart-line"></i>
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
              ₹{avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.5rem' }}>
              Luxury tier segment
            </span>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-medium)', marginBottom: '2rem', gap: '2rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {[
            { id: 'overview', label: `Live Orders (${allOrdersList.length})`, icon: 'boxes-stacked' },
            { id: 'inventory', label: `Product Inventory (${totalInventoryCount})`, icon: 'tags' },
            { id: 'reviews', label: `Patron Reviews (${reviewsList.length})`, icon: 'star' },
            { id: 'promos', label: `Promo Vouchers (${(promoCodes || []).length})`, icon: 'ticket' },
            { id: 'broadcast', label: 'Store Broadcast', icon: 'bullhorn' },
            { id: 'subscribers', label: 'Atelier Contacts', icon: 'users' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                background: 'none', 
                border: 'none', 
                paddingBottom: '1rem', 
                fontSize: '0.85rem', 
                fontWeight: 600, 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em', 
                color: activeTab === tab.id ? 'var(--green-dark)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--green-dark)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px'
              }}
            >
              <i className={`fa-solid fa-${tab.icon}`} style={{ marginRight: '8px' }}></i> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Live Orders */}
        {activeTab === 'overview' && (() => {
          const filteredOrders = allOrdersList.filter(order => {
            const matchesSearch = !orderSearchTerm.trim() || 
              (order.orderId && order.orderId.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
              (order.shipping?.name && order.shipping.name.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
              (order.shipping?.email && order.shipping.email.toLowerCase().includes(orderSearchTerm.toLowerCase()));
            
            const matchesStatus = orderStatusFilter === 'all' || 
              (order.status && order.status.toLowerCase().includes(orderStatusFilter.toLowerCase()));

            return matchesSearch && matchesStatus;
          });

          return (
            <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--green-dark)', fontWeight: 400, margin: 0 }}>
                      Customer Orders &amp; Dispatches
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Real-time synchronization with Razorpay payment gateway
                    </p>
                  </div>
                  <div style={{ position: 'relative', maxWidth: '300px', width: '100%' }}>
                    <i className="fa-solid fa-search" style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
                    <input 
                      type="text" 
                      placeholder="Search Order ID, Name, Email..." 
                      value={orderSearchTerm}
                      onChange={(e) => setOrderSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Status Filter Pills */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['all', 'Paid', 'In Preparation', 'Dispatched', 'Delivered'].map(status => (
                    <button
                      key={status}
                      onClick={() => setOrderStatusFilter(status)}
                      style={{
                        padding: '0.4rem 1rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: orderStatusFilter === status ? 'var(--green-dark)' : 'var(--border-medium)',
                        backgroundColor: orderStatusFilter === status ? 'var(--green-dark)' : '#fff',
                        color: orderStatusFilter === status ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {status === 'all' ? 'All Orders' : status}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Order ID</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Customer</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Items</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Total (INR)</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Fulfillment Status</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No orders found matching criteria.</td></tr>
                    ) : filteredOrders.map((order, idx) => (
                      <tr key={order.orderId || idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--green-dark)' }}>
                          {order.orderId}
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>
                            {order.timestamp}
                          </span>
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <strong>{order.shipping?.name || "Client"}</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {order.shipping?.email} &bull; {order.shipping?.city}
                          </span>
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          {order.items?.map((item, i) => (
                            <div key={i} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                              {item.qty}x {item.title} <span style={{ color: 'var(--text-muted)' }}>({item.color}/{item.size})</span>
                            </div>
                          ))}
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--green-dark)' }}>
                          ₹{parseFloat(order.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          {order.status === 'Dispatched' ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '0.4rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              <i className="fa-solid fa-plane-departure"></i> Dispatched
                            </div>
                          ) : order.status === 'Delivered' ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#e6f4ea', color: '#137333', border: '1px solid #ceead6', padding: '0.4rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              <i className="fa-solid fa-box-open"></i> Delivered
                            </div>
                          ) : (
                            <select 
                              value={order.status || 'Paid'}
                              onChange={(e) => {
                                if (e.target.value === 'Dispatched') {
                                  handleOpenDispatchModal(order);
                                } else {
                                  if (onUpdateOrderStatus) onUpdateOrderStatus(order.orderId, e.target.value);
                                  showToast(`<i class='fa-solid fa-truck-fast'></i> Order ${order.orderId} status set to ${e.target.value}`);
                                }
                              }}
                              style={{ 
                                padding: '0.4rem 0.75rem', 
                                fontSize: '0.75rem', 
                                fontWeight: 600, 
                                borderRadius: '4px',
                                border: '1px solid var(--border-medium)',
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="Paid">Paid (Preparing)</option>
                              <option value="In Preparation">In Preparation</option>
                              <option value="Dispatched">Dispatch Consignment</option>
                            </select>
                          )}
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', border: '1px solid var(--border-medium)', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 600, display: 'block', width: '100%', marginBottom: '0.35rem' }}
                          >
                            Details
                          </button>
                          {order.status === 'Dispatched' && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textAlign: 'center' }}>
                              {order.carrier}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Tab 2: Product Inventory */}
        {activeTab === 'inventory' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--green-dark)', fontWeight: 400, margin: 0 }}>
                  Active Catalog Styles
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Add, update or retire garments from the active customer collection
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button 
                  onClick={() => {
                    setUploadedPngPreview(null);
                    setUploadedPngUrl("");
                    setUploadTargetProductId(products?.[0]?.id || "");
                    setIsUploadModalOpen(true);
                  }}
                  style={{
                    padding: '0.75rem 1.25rem',
                    fontSize: '0.75rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    border: '1.5px solid var(--green-dark)',
                    backgroundColor: '#fff',
                    color: 'var(--green-dark)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  title="Upload .PNG garment photo directly"
                >
                  <i className="fa-solid fa-cloud-arrow-up" style={{ color: 'var(--accent)' }}></i> Upload Photo (.PNG)
                </button>
                <button 
                  onClick={handleOpenAddProduct}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
                >
                  <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Add New Linen Shirt
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {(products || []).map((prod) => {
                const activeColorName = selectedCardColors[prod.id] || prod.colors?.[0]?.name || '';
                const activeColorObj = (prod.colors || []).find(c => c.name?.toLowerCase() === activeColorName?.toLowerCase()) || prod.colors?.[0];
                const displayImg = getProductColorImage(prod, activeColorName);
                const currentStock = typeof activeColorObj?.stock === 'number' ? activeColorObj.stock : (prod.stock ?? 10);
                const totalGarmentStock = Array.isArray(prod.colors) && prod.colors.length > 0
                  ? prod.colors.reduce((sum, c) => sum + (Number(c.stock) || 0), 0)
                  : (prod.stock ?? 10);

                return (
                  <div key={prod.id} style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: '260px', overflow: 'hidden', position: 'relative', backgroundColor: 'var(--bg-secondary)' }}>
                      <img 
                        src={displayImg} 
                        alt={prod.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', transition: 'all 0.3s ease' }} 
                        onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
                      />
                      {prod.badge && (
                        <span style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', backgroundColor: 'var(--glass-bg)', padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', backdropFilter: 'blur(8px)', border: '1px solid var(--border-light)' }}>
                          {prod.badge}
                        </span>
                      )}
                      <span style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', backgroundColor: 'rgba(10, 28, 21, 0.85)', color: '#fff', padding: '0.25rem 0.6rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {(prod.colors?.length || 1) * 5} Angles
                      </span>
                    </div>

                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                          {prod.category}
                        </span>
                        <h4 style={{ 
                          fontFamily: 'var(--font-display)', 
                          fontSize: '1.2rem', 
                          color: 'var(--green-dark)', 
                          fontWeight: 400, 
                          margin: '0 0 0.65rem 0',
                          minHeight: '3rem',
                          lineHeight: 1.25,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {prod.title}
                        </h4>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '30px', marginBottom: '0.85rem' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent)' }}>
                            ₹{prod.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div>
                            {totalGarmentStock <= 0 ? (
                              <span style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.25rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                                0 Total Units (Sold Out)
                              </span>
                            ) : totalGarmentStock <= 3 ? (
                              <span style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.25rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                                {totalGarmentStock} Total Left (Low)
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.25rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                                {totalGarmentStock} Total In Stock
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Color Stock Breakdown Pills */}
                        {prod.colors && prod.colors.length > 0 && (
                          <div style={{ marginBottom: '1rem', backgroundColor: 'var(--bg-secondary)', padding: '0.65rem', border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Color Variants:</span>
                              <span style={{ color: 'var(--green-dark)' }}>Click color to adjust stock</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {prod.colors.map(c => {
                                const isSelected = (c.name?.toLowerCase() === activeColorName?.toLowerCase());
                                const cStock = typeof c.stock === 'number' ? c.stock : 0;
                                return (
                                  <button
                                    key={c.name}
                                    onClick={() => setSelectedCardColors(prev => ({ ...prev, [prod.id]: c.name }))}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '0.25rem 0.55rem',
                                      borderRadius: '16px',
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      border: isSelected ? '1.5px solid var(--green-dark)' : '1px solid var(--border-medium)',
                                      backgroundColor: isSelected ? 'var(--green-surface)' : '#fff',
                                      color: isSelected ? 'var(--green-dark)' : 'var(--text-secondary)',
                                      boxShadow: isSelected ? '0 2px 6px rgba(10, 28, 21, 0.12)' : 'none',
                                      transition: 'all 0.15s ease'
                                    }}
                                    title={`Select ${c.name} (${cStock} in stock)`}
                                  >
                                    <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: c.code, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />
                                    <span>{c.name}:</span>
                                    <strong style={{ color: cStock <= 0 ? '#b91c1c' : cStock <= 3 ? '#b45309' : 'var(--green-dark)' }}>
                                      {cStock}
                                    </strong>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Live Quick Stock Adjuster for Selected Color */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafaf9', padding: '0.5rem 0.75rem', height: '44px', boxSizing: 'border-box', marginBottom: '1.25rem', border: '1px solid var(--border-medium)' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Stock for <strong style={{ color: 'var(--green-dark)' }}>{activeColorObj?.name || 'Color'}</strong>:
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button 
                              onClick={() => {
                                const newColorStock = Math.max(0, currentStock - 1);
                                const updatedColors = (prod.colors || []).map(c => 
                                  (c.name?.toLowerCase() === activeColorObj?.name?.toLowerCase())
                                    ? { ...c, stock: newColorStock }
                                    : c
                                );
                                const newTotal = updatedColors.reduce((sum, c) => sum + (Number(c.stock) || 0), 0);
                                onUpdateProduct(prod.id, { colors: updatedColors, stock: newTotal });
                                showToast(`Stock updated to ${newColorStock} units for ${prod.title} (${activeColorObj?.name})`);
                              }}
                              style={{ width: '24px', height: '24px', border: '1px solid var(--border-medium)', background: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title={`Decrease ${activeColorObj?.name || 'Color'} Stock`}
                            >-</button>
                            <strong style={{ fontSize: '0.85rem', minWidth: '24px', textAlign: 'center' }}>
                              {currentStock}
                            </strong>
                            <button 
                              onClick={() => {
                                const newColorStock = currentStock + 1;
                                const updatedColors = (prod.colors || []).map(c => 
                                  (c.name?.toLowerCase() === activeColorObj?.name?.toLowerCase())
                                    ? { ...c, stock: newColorStock }
                                    : c
                                );
                                const newTotal = updatedColors.reduce((sum, c) => sum + (Number(c.stock) || 0), 0);
                                onUpdateProduct(prod.id, { colors: updatedColors, stock: newTotal });
                                showToast(`Stock updated to ${newColorStock} units for ${prod.title} (${activeColorObj?.name})`);
                              }}
                              style={{ width: '24px', height: '24px', border: '1px solid var(--border-medium)', background: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title={`Increase ${activeColorObj?.name || 'Color'} Stock`}
                            >+</button>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                        <button 
                          onClick={() => handleOpenEditProduct(prod)}
                          style={{ flex: 1, padding: '0.6rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid var(--border-medium)', backgroundColor: '#fff', cursor: 'pointer' }}
                        >
                          <i className="fa-solid fa-pen" style={{ marginRight: '6px' }}></i> Edit Garment
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Remove ${prod.title} from store?`)) {
                              onDeleteProduct(prod.id);
                              showToast(`<i class='fa-solid fa-trash'></i> Removed ${prod.title}`);
                            }
                          }}
                          style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', cursor: 'pointer' }}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Subscribers & Contacts */}
        {activeTab === 'subscribers' && (
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '2rem', boxShadow: 'var(--shadow-soft)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--green-dark)', fontWeight: 400, marginBottom: '1.5rem' }}>
              Atelier Newsletter &amp; VIP Clients
            </h3>
            <div style={{ display: 'grid', gap: '1rem', maxWidth: '600px' }}>
              {[
                { email: "matteo.rossi@milano.it", tier: "VIP Patron", date: "Joined Aug 2026" },
                { email: "arthur.p@london.co.uk", tier: "Resort Member", date: "Joined Aug 2026" },
                { email: "vikram.s@atelier.in", tier: "VIP Patron", date: "Joined Jul 2026" },
                { email: "alex.mercer@gmail.com", tier: "Standard Subscriber", date: "Joined Jun 2026" }
              ].map((sub, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-secondary)' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{sub.email}</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.date}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {sub.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Promos */}
        {activeTab === 'promos' && (
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--green-dark)', fontWeight: 400, margin: 0 }}>
                  Promo Vouchers
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Create discount codes for customer checkout
                </p>
              </div>
              <button 
                onClick={() => {
                  setPromoForm({ code: "", type: "percent", value: "15" });
                  setIsPromoModalOpen(true);
                }}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
              >
                <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> New Promo
              </button>
            </div>
            <div style={{ overflowX: 'auto', padding: '1.5rem 2rem' }}>
              {(promoCodes || []).length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No active promotional campaigns.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                      <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Voucher Code</th>
                      <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Discount Value</th>
                      <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(promoCodes || []).map((promo, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>{promo.code}</td>
                        <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--green-dark)' }}>
                          {promo.type === 'flat' ? `₹${(promo.value || promo.discount || 0).toLocaleString('en-IN')}` : `${promo.value || promo.discount || 0}%`} OFF
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.3rem 0.75rem', 
                            borderRadius: '16px', 
                            fontSize: '0.7rem', 
                            fontWeight: 'bold',
                            backgroundColor: promo.active ? '#dcfce7' : '#fee2e2',
                            color: promo.active ? '#166534' : '#991b1b',
                            border: `1px solid ${promo.active ? '#bbf7d0' : '#fecaca'}`
                          }}>
                            {promo.active ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <button 
                            onClick={() => {
                              onTogglePromoCode(promo.id);
                            }}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', border: '1px solid var(--border-medium)', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 600, marginRight: '0.5rem' }}
                          >
                            {promo.active ? 'Pause' : 'Activate'}
                          </button>
                          <button 
                            onClick={() => {
                              onDeletePromoCode(promo.id);
                            }}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', border: '1px solid #fca5a5', color: '#b91c1c', backgroundColor: '#fef2f2', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Broadcast */}
        {activeTab === 'broadcast' && (
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--green-dark)', fontWeight: 400, margin: 0 }}>
                Storefront Global Broadcast
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                Update the sticky announcement bar displayed across the entire shopping experience.
              </p>
            </div>
            <div style={{ padding: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Broadcast Message
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  defaultValue={announcementText}
                  id="broadcastInput"
                  placeholder="e.g. Complimentary expedited shipping on all domestic orders."
                  style={{ flex: 1, padding: '0.85rem 1rem', border: '1px solid var(--border-medium)', fontSize: '0.9rem', outline: 'none' }}
                />
                <button 
                  onClick={() => {
                    const val = document.getElementById('broadcastInput').value;
                    if (onUpdateAnnouncement) {
                      onUpdateAnnouncement(val);
                      showToast('<i class="fa-solid fa-bullhorn"></i> Broadcast updated successfully on storefront');
                    }
                  }}
                  className="btn btn-primary"
                  style={{ padding: '0 2rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Publish to Store
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Clear the field and publish to hide the announcement bar completely.
              </p>
            </div>
          </div>
        )}

        {/* Tab: Reviews Moderation */}
        {activeTab === 'reviews' && (() => {
          // Filter reviewsList by search term & rating
          const filteredReviews = reviewsList.filter(rev => {
            const term = reviewSearchTerm.trim().toLowerCase();
            const matchesSearch = !term || 
              (rev.author && rev.author.toLowerCase().includes(term)) ||
              (rev.title && rev.title.toLowerCase().includes(term)) ||
              (rev.comment && rev.comment.toLowerCase().includes(term)) ||
              (rev.productTitle && rev.productTitle.toLowerCase().includes(term));

            const matchesRating = reviewRatingFilter === 'all' || String(rev.rating) === String(reviewRatingFilter);

            return matchesSearch && matchesRating;
          });

          const handleDeleteReviewFromAdmin = async (productId, reviewId) => {
            if (!window.confirm("Are you sure you want to permanently delete this customer review?")) return;
            
            setReviewsList(prev => prev.filter(r => r.id !== reviewId));

            if (isSupabaseConfigured()) {
              try {
                await reviewService.deleteReview(reviewId);
              } catch (cloudErr) {
                console.error("[Supabase Admin Delete Review Notice]:", cloudErr);
              }
            }

            if (productId) {
              try {
                const saved = localStorage.getItem(`eden_threads_reviews_${productId}`);
                if (saved) {
                  const parsed = JSON.parse(saved);
                  const updated = parsed.filter(r => r.id !== reviewId);
                  localStorage.setItem(`eden_threads_reviews_${productId}`, JSON.stringify(updated));
                }
              } catch (err) {
                console.error(err);
              }
            }

            showToast("<i class='fa-solid fa-trash-can'></i> Customer review permanently removed by Admin");
          };

          return (
            <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--green-dark)', fontWeight: 400, margin: 0 }}>
                      Customer Reviews Moderation ({reviewsList.length})
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                      Audit, inspect, and remove fraudulent or abusive patron reviews across all linen garments.
                    </p>
                  </div>

                  <button 
                    onClick={fetchAllReviews}
                    disabled={isReviewsLoading}
                    style={{
                      padding: '0.6rem 1.2rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#fff',
                      color: 'var(--green-dark)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className={`fa-solid fa-rotate ${isReviewsLoading ? 'fa-spin' : ''}`}></i>
                    {isReviewsLoading ? 'Refreshing...' : 'Refresh Reviews'}
                  </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 250px', position: 'relative' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}></i>
                    <input 
                      type="text" 
                      placeholder="Search reviews by patron, headline, or shirt title..."
                      value={reviewSearchTerm}
                      onChange={(e) => setReviewSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <select 
                    value={reviewRatingFilter} 
                    onChange={(e) => setReviewRatingFilter(e.target.value)}
                    style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem', backgroundColor: '#fff' }}
                  >
                    <option value="all">All Star Ratings</option>
                    <option value="5">★★★★★ - 5 Stars Only</option>
                    <option value="4">★★★★☆ - 4 Stars Only</option>
                    <option value="3">★★★☆☆ - 3 Stars Only</option>
                    <option value="2">★★☆☆☆ - 2 Stars Only</option>
                    <option value="1">★☆☆☆☆ - 1 Star Only</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              {filteredReviews.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <i className="fa-regular fa-comment-dots" style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--gold)', opacity: 0.5 }}></i>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--green-dark)', marginBottom: '0.5rem' }}>
                    No Customer Reviews Found
                  </h4>
                  <p style={{ fontSize: '0.85rem' }}>
                    No patron reviews matched your filter criteria.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-medium)' }}>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Garment</th>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Patron / Buyer</th>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rating</th>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Review Headline &amp; Feedback</th>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Date</th>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReviews.map((rev, idx) => (
                        <tr key={`${rev.productId}-${rev.id}-${idx}`} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s ease' }}>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <img src={rev.productImage} alt="" style={{ width: '40px', height: '50px', objectFit: 'cover', border: '1px solid var(--border-light)' }} />
                              <div>
                                <strong style={{ color: 'var(--green-dark)', display: 'block' }}>{rev.productTitle}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{rev.productId}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{rev.author}</strong>
                            {rev.verified && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--green-dark)', backgroundColor: 'var(--green-light)', padding: '2px 6px', borderRadius: '3px', fontWeight: 600, display: 'inline-block', marginTop: '2px' }}>
                                <i className="fa-solid fa-circle-check" style={{ color: 'var(--gold)', marginRight: '3px' }}></i> Verified
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <i key={i} className={i < rev.rating ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                            ))}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '4px', fontWeight: 600 }}>({rev.rating}/5)</span>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', maxWidth: '340px' }}>
                            <strong style={{ color: 'var(--green-dark)', display: 'block', marginBottom: '0.25rem' }}>{rev.title}</strong>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4, margin: 0 }}>"{rev.comment}"</p>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {rev.date}
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => handleDeleteReviewFromAdmin(rev.productId, rev.id)}
                              className="btn"
                              style={{
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                padding: '0.4rem 0.85rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                borderRadius: '3px',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#b91c1c';
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#fef2f2';
                                e.currentTarget.style.color = '#b91c1c';
                              }}
                              title="Permanently remove customer review"
                            >
                              <i className="fa-solid fa-trash-can"></i> Delete Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ backgroundColor: '#fff', maxWidth: '600px', width: '100%', padding: '2.5rem', border: '1px solid var(--border-medium)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
              <button 
                onClick={() => setSelectedOrder(null)}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>

              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Order Record
              </span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--green-dark)', fontWeight: 400, margin: '0 0 1.5rem 0' }}>
                {selectedOrder.orderId}
              </h3>

              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Payment Reference:</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedOrder.paymentId}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Timestamp:</span>
                    <div style={{ fontWeight: 600 }}>{selectedOrder.timestamp}</div>
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green-dark)', marginBottom: '0.75rem' }}>
                Delivery Destination
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                <strong>{selectedOrder.shipping?.name}</strong><br />
                {selectedOrder.shipping?.address}<br />
                {selectedOrder.shipping?.city} - {selectedOrder.shipping?.zip}, {selectedOrder.shipping?.country}<br />
                Phone: {selectedOrder.shipping?.phone} &bull; Email: {selectedOrder.shipping?.email}
              </p>

              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green-dark)', marginBottom: '0.75rem' }}>
                Ordered Items
              </h4>
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                    <div>
                      <strong>{item.title}</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Color: {item.color} | Size: {item.size} | Qty: {item.qty}</span>
                    </div>
                    <strong style={{ color: 'var(--green-dark)' }}>₹{(item.price * item.qty).toLocaleString('en-IN')}</strong>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--border-medium)', paddingTop: '1rem', marginBottom: '2rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>Total Charged:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--green-dark)' }}>
                  ₹{parseFloat(selectedOrder.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button 
                onClick={() => setSelectedOrder(null)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
              >
                Close Order Record
              </button>
            </div>
          </div>
        )}

        {/* Add / Edit Product Modal */}
        {isProductModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ backgroundColor: '#fff', maxWidth: '680px', width: '100%', padding: '2.5rem', border: '1px solid var(--border-medium)', position: 'relative', maxHeight: '92vh', overflowY: 'auto' }}>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>

              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                {editingProductId ? 'Update Item' : 'New Creation'}
              </span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--green-dark)', fontWeight: 400, margin: '0 0 0.5rem 0' }}>
                {editingProductId ? 'Edit Linen Garment' : 'Add New Linen Shirt'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Configure multi-color variants, color-specific stock, and 15 angle views (5 views per color)
              </p>

              <form onSubmit={handleSaveProduct} style={{ display: 'grid', gap: '1.1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Shirt Title</label>
                  <input 
                    type="text" 
                    required 
                    value={productForm.title} 
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    placeholder="e.g. Capri Tailored Linen Shirt" 
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Category Collar</label>
                    <select 
                      value={productForm.category} 
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }}
                    >
                      <option value="spread-collar">Spread Collar</option>
                      <option value="band-collar">Band Collar</option>
                      <option value="camp-collar">Camp Collar</option>
                      <option value="popover">Popover</option>
                      <option value="tailored-fit">Tailored Fit</option>
                      <option value="button-down-collar">Button-Down Collar</option>
                      <option value="cutaway-collar">Cutaway Collar</option>
                      <option value="mandarin-collar">Mandarin Collar</option>
                      <option value="cuban-collar">Cuban Collar</option>
                      <option value="point-collar">Point Collar</option>
                      <option value="grandad-collar">Grandad Collar</option>
                      <option value="club-collar">Club Collar</option>
                      <option value="wingtip-collar">Wingtip Collar</option>
                      <option value="tab-collar">Tab Collar</option>
                      <option value="pin-collar">Pin Collar</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Price (INR ₹)</label>
                    <input 
                      type="number" 
                      required 
                      value={productForm.price} 
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      placeholder="18500" 
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Atelier Badge</label>
                    <input 
                      type="text" 
                      value={productForm.badge} 
                      onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                      placeholder="Italian Luxury / 100% Pure Linen" 
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Sizes (Comma Separated)</label>
                    <input 
                      type="text" 
                      value={productForm.sizes} 
                      onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                      placeholder="S, M, L, XL" 
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }} 
                    />
                  </div>
                </div>

                {/* Primary Garment Featured Photo (PNG Format Only) */}
                <div style={{ border: '1px dashed var(--border-medium)', padding: '1rem', backgroundColor: '#fafaf9', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--green-dark)' }}>
                        Garment Featured Photo (PNG Format Only)
                      </span>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                        Upload a transparent or catalog .png photo of the clothing item
                      </p>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      PNG Only
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-medium)', backgroundColor: '#fff', flexShrink: 0 }}>
                      <img 
                        src={productForm.image} 
                        alt="Featured Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label 
                          style={{
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            backgroundColor: 'var(--green-dark)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '3px'
                          }}
                        >
                          <i className="fa-solid fa-cloud-arrow-up"></i> Upload PNG Photo
                          <input 
                            type="file" 
                            accept=".png,image/png" 
                            hidden 
                            onChange={(e) => handleFileUpload(e, (url) => {
                              setProductForm(prev => ({ ...prev, image: url }));
                              setColorVariants(prev => prev.map((cv, i) => i === 0 ? { ...cv, customImage: url, image: url } : cv));
                            })} 
                          />
                        </label>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Current: {productForm.image.split('/').pop()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Color Variants & Stock Manager */}
                <div style={{ border: '1px solid var(--border-medium)', padding: '1.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--green-dark)' }}>
                        Color Variants &amp; Stock Management
                      </span>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                        Each color variant generates 5 dedicated angle views ({colorVariants.length * 5} total images for this garment)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setColorVariants(prev => [
                          ...prev,
                          {
                            name: `Color ${prev.length + 1}`,
                            code: "#E5DCD0",
                            stock: 5,
                            imageSet: "shirt_beige",
                            customImage: null
                          }
                        ]);
                      }}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: 'var(--green-dark)',
                        color: 'var(--gold)',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '3px'
                      }}
                    >
                      <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i> Add Color
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {colorVariants.map((cv, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 85px 65px 1.2fr 105px 95px 32px', 
                          gap: '0.45rem', 
                          alignItems: 'center', 
                          backgroundColor: '#fff', 
                          padding: '0.65rem 0.75rem', 
                          border: '1px solid var(--border-light)' 
                        }}
                      >
                        {/* Color Name */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>Color Name</label>
                          <input 
                            type="text" 
                            required
                            value={cv.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setColorVariants(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                            }}
                            placeholder="e.g. Sky Blue"
                            style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border-medium)', fontSize: '0.8rem' }}
                          />
                        </div>

                        {/* Color Hex Swatch */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>Swatch</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <input 
                              type="color" 
                              value={cv.code.startsWith('#') ? cv.code : '#FFFFFF'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setColorVariants(prev => prev.map((item, i) => i === idx ? { ...item, code: val } : item));
                              }}
                              style={{ width: '24px', height: '24px', padding: 0, border: '1px solid var(--border-medium)', cursor: 'pointer', borderRadius: '3px' }}
                            />
                            <input 
                              type="text" 
                              value={cv.code}
                              onChange={(e) => {
                                const val = e.target.value;
                                setColorVariants(prev => prev.map((item, i) => i === idx ? { ...item, code: val } : item));
                              }}
                              style={{ width: '48px', padding: '0.35rem 0.2rem', fontSize: '0.68rem', textAlign: 'center', border: '1px solid var(--border-medium)' }}
                            />
                          </div>
                        </div>

                        {/* Stock Quantity */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>Stock</label>
                          <input 
                            type="number" 
                            min="0"
                            required
                            value={cv.stock}
                            onChange={(e) => {
                              const val = e.target.value;
                              setColorVariants(prev => prev.map((item, i) => i === idx ? { ...item, stock: val } : item));
                            }}
                            style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border-medium)', fontSize: '0.8rem', textAlign: 'center' }}
                          />
                        </div>

                        {/* Image Set Selection (5 Views) */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>5-Angle Preset</label>
                          <select
                            value={cv.imageSet}
                            onChange={(e) => {
                              const val = e.target.value;
                              const matchedSet = AVAILABLE_IMAGE_SETS.find(s => s.id === val);
                              setColorVariants(prev => prev.map((item, i) => i === idx ? { 
                                ...item, 
                                imageSet: val,
                                code: (item.code === '#FFFFFF' || item.code === '#E5DCD0') && matchedSet?.defaultHex ? matchedSet.defaultHex : item.code
                              } : item));
                            }}
                            style={{ width: '100%', padding: '0.35rem', border: '1px solid var(--border-medium)', fontSize: '0.72rem' }}
                          >
                            {AVAILABLE_IMAGE_SETS.map(set => (
                              <option key={set.id} value={set.id}>{set.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Upload Custom PNG Front */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>Custom .PNG</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {cv.customImage ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <img src={cv.customImage} alt="PNG" style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #15803d' }} title="Custom PNG uploaded" />
                                <button
                                  type="button"
                                  onClick={() => setColorVariants(prev => prev.map((item, i) => i === idx ? { ...item, customImage: null } : item))}
                                  style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '0.7rem', padding: '2px' }}
                                  title="Remove uploaded PNG (revert to preset)"
                                >
                                  <i className="fa-solid fa-xmark"></i>
                                </button>
                              </div>
                            ) : null}
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '0.35rem 0.5rem',
                                border: cv.customImage ? '1px solid #bbf7d0' : '1px solid var(--border-medium)',
                                backgroundColor: cv.customImage ? '#f0fdf4' : '#fafafa',
                                color: cv.customImage ? '#15803d' : 'var(--text-secondary)',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                borderRadius: '3px'
                              }}
                              title="Upload clothes image in .png format only"
                            >
                              <i className={cv.customImage ? "fa-solid fa-check" : "fa-solid fa-cloud-arrow-up"}></i>
                              <span>{cv.customImage ? 'PNG' : 'Upload'}</span>
                              <input 
                                type="file" 
                                accept=".png,image/png" 
                                hidden 
                                onChange={(e) => handleFileUpload(e, (url) => {
                                  setColorVariants(prev => prev.map((item, i) => i === idx ? { ...item, customImage: url } : item));
                                })} 
                              />
                            </label>
                          </div>
                        </div>

                        {/* All 5 Angles Manager Button */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>5 Angles</label>
                          <button
                            type="button"
                            onClick={() => handleOpenAnglesModal(idx)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '0.35rem 0.6rem',
                              border: cv.customViews ? '1px solid #86efac' : '1px solid var(--border-medium)',
                              backgroundColor: cv.customViews ? '#f0fdf4' : '#f8fafc',
                              color: cv.customViews ? '#15803d' : 'var(--green-dark)',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              borderRadius: '3px',
                              whiteSpace: 'nowrap'
                            }}
                            title="Upload or customize all 5 individual angles (Front, Back, Left Side, Button Detail, Right Side)"
                          >
                            <i className="fa-solid fa-camera-retro"></i>
                            <span>{cv.customViews ? '5 Angles ✓' : '5 Angles...'}</span>
                          </button>
                        </div>

                        {/* Remove Color */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', opacity: 0 }}>X</label>
                          <button
                            type="button"
                            disabled={colorVariants.length <= 1}
                            onClick={() => {
                              if (colorVariants.length > 1) {
                                setColorVariants(prev => prev.filter((_, i) => i !== idx));
                              }
                            }}
                            style={{
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #fecaca',
                              backgroundColor: colorVariants.length <= 1 ? '#f3f4f6' : '#fef2f2',
                              color: colorVariants.length <= 1 ? '#9ca3af' : '#b91c1c',
                              cursor: colorVariants.length <= 1 ? 'not-allowed' : 'pointer',
                              borderRadius: '3px'
                            }}
                            title="Delete Color Variant"
                          >
                            <i className="fa-solid fa-trash" style={{ fontSize: '0.7rem' }}></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-medium)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Total Calculated Garment Stock: <strong style={{ color: 'var(--green-dark)', fontSize: '0.85rem' }}>{colorVariants.reduce((sum, c) => sum + (parseInt(c.stock, 10) || 0), 0)} Units</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
                      <i className="fa-solid fa-camera-retro" style={{ marginRight: '4px' }}></i> {colorVariants.length * 5} Total Garment Views
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Garment Description</label>
                  <textarea 
                    rows={3}
                    value={productForm.description} 
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '0.85rem', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.85rem', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
                  >
                    {editingProductId ? 'Save Changes' : 'Publish to Store'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Standalone PNG Garment Photo Uploader Modal */}
        {isUploadModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem' }}>
            <div style={{ backgroundColor: '#fff', maxWidth: '520px', width: '100%', padding: '2.5rem', border: '1px solid var(--border-medium)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
              <button 
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadedPngPreview(null);
                  setUploadedPngUrl("");
                }}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>

              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Atelier Asset Manager
              </span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--green-dark)', fontWeight: 400, margin: '0 0 0.5rem 0' }}>
                Upload Clothes Image (.PNG Only)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Upload clothes photos in <strong>.PNG</strong> format only. Transparent and high-res PNG images preserve atelier fabric crispness.
              </p>

              {/* Upload Dropzone */}
              <div 
                style={{
                  border: '2px dashed var(--green-dark)',
                  borderRadius: '6px',
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  marginBottom: '1.5rem',
                  position: 'relative'
                }}
              >
                {isUploading ? (
                  <div style={{ padding: '2rem 0' }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: 'var(--green-dark)', marginBottom: '0.75rem' }}></i>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--green-dark)', margin: 0 }}>
                      Processing and verifying PNG image...
                    </p>
                  </div>
                ) : uploadedPngUrl ? (
                  <div>
                    <div style={{ width: '180px', height: '180px', margin: '0 auto 1rem auto', border: '1px solid var(--border-medium)', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#fff' }}>
                      <img src={uploadedPngUrl} alt="Uploaded Garment" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.3rem 0.8rem', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                      <i className="fa-solid fa-circle-check"></i> Validated PNG Format
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--green-dark)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>
                        Upload a different image (.png only)
                        <input type="file" accept=".png,image/png" hidden onChange={(e) => handleFileUpload(e, (url) => setUploadedPngUrl(url))} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2.5rem', color: 'var(--green-dark)', marginBottom: '0.75rem' }}></i>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--green-dark)', margin: '0 0 0.25rem 0' }}>
                      Select Clothes Photo (.PNG Format)
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                      Strictly files with <strong>.png</strong> extension (Max 25MB)
                    </p>
                    <label 
                      className="btn btn-primary"
                      style={{
                        padding: '0.65rem 1.4rem',
                        fontSize: '0.75rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-block'
                      }}
                    >
                      <i className="fa-solid fa-file-image" style={{ marginRight: '6px' }}></i> Browse .PNG File
                      <input 
                        type="file" 
                        accept=".png,image/png" 
                        hidden 
                        onChange={(e) => handleFileUpload(e, (url) => setUploadedPngUrl(url))} 
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Action Options once PNG is uploaded */}
              {uploadedPngUrl && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ border: '1px solid var(--border-medium)', padding: '1.25rem', backgroundColor: '#fff' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>
                      Option 1: Apply to Existing Garment
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select
                        value={uploadTargetProductId}
                        onChange={(e) => setUploadTargetProductId(e.target.value)}
                        style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', border: '1px solid var(--border-medium)' }}
                      >
                        <option value="">-- Choose Garment to Update Photo --</option>
                        {(products || []).map(p => (
                          <option key={p.id} value={p.id}>{p.title} (₹{p.price})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!uploadTargetProductId}
                        onClick={() => {
                          const targetId = Number(uploadTargetProductId);
                          const target = (products || []).find(p => p.id === targetId);
                          if (target) {
                            const updatedColors = (target.colors && target.colors.length > 0)
                              ? target.colors.map((c, i) => {
                                  if (i === 0) {
                                    const updatedViews = (c.views || []).map((v, vi) => vi === 0 ? { ...v, url: uploadedPngUrl } : v);
                                    if (!updatedViews.length) {
                                      updatedViews.push({ name: "Front View", url: uploadedPngUrl });
                                    }
                                    return { ...c, image: uploadedPngUrl, customImage: uploadedPngUrl, views: updatedViews };
                                  }
                                  return c;
                                })
                              : [
                                  {
                                    name: "Pristine White",
                                    code: "#FFFFFF",
                                    stock: target.stock || 10,
                                    image: uploadedPngUrl,
                                    customImage: uploadedPngUrl,
                                    views: [
                                      { name: "Front View", url: uploadedPngUrl },
                                      ...get5ViewsForSet('shirt').slice(1)
                                    ]
                                  }
                                ];

                            onUpdateProduct(targetId, { 
                              image: uploadedPngUrl,
                              colors: updatedColors
                            });
                            showToast(`<i class='fa-solid fa-check'></i> Updated photo for ${target.title}`);
                            setIsUploadModalOpen(false);
                            setUploadedPngUrl("");
                          }
                        }}
                        style={{
                          padding: '0.6rem 1.2rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor: uploadTargetProductId ? 'var(--green-dark)' : '#cbd5e1',
                          color: '#fff',
                          border: 'none',
                          cursor: uploadTargetProductId ? 'pointer' : 'not-allowed'
                        }}
                      >
                        Apply Photo
                      </button>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--border-medium)', padding: '1.25rem', backgroundColor: '#fff' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>
                      Option 2: Create New Garment with this Photo
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploadModalOpen(false);
                        handleOpenAddProduct();
                        setProductForm(prev => ({ ...prev, image: uploadedPngUrl }));
                        setColorVariants(prev => prev.map((c, i) => i === 0 ? { ...c, customImage: uploadedPngUrl } : c));
                        setUploadedPngUrl("");
                      }}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '0.75rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                    >
                      <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Create New Shirt With This Photo
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setUploadedPngUrl("");
                  }}
                  style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--border-medium)', background: '#fff', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Promo Modal */}
        {isPromoModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ backgroundColor: '#fff', maxWidth: '450px', width: '100%', padding: '2.5rem', border: '1px solid var(--border-medium)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
              <button 
                onClick={() => setIsPromoModalOpen(false)}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>

              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Atelier Campaigns
              </span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--green-dark)', fontWeight: 400, margin: '0 0 1.5rem 0' }}>
                New Promo Voucher
              </h3>

              <form onSubmit={handleSavePromo} style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Voucher Code</label>
                  <input 
                    type="text" 
                    required 
                    value={promoForm.code} 
                    onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                    placeholder="e.g. SUMMER20" 
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Discount Type</label>
                    <select 
                      value={promoForm.type} 
                      onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value })}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }}
                    >
                      <option value="percent">Percentage (% OFF)</option>
                      <option value="flat">Flat Amount (₹ OFF)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                      {promoForm.type === 'percent' ? 'Percentage' : 'Value (INR ₹)'}
                    </label>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      value={promoForm.value} 
                      onChange={(e) => setPromoForm({ ...promoForm, value: e.target.value })}
                      placeholder={promoForm.type === 'percent' ? '15' : '1000'} 
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    type="button"
                    onClick={() => setIsPromoModalOpen(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '0.85rem', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.85rem', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
                  >
                    Create Campaign
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5-Angle Photo Customizer Modal */}
        {isAnglesModalOpen && editingAnglesColorIdx !== null && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-medium)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--green-dark)', margin: 0 }}>
                    5-Angle Garment Photos ({colorVariants[editingAnglesColorIdx]?.name})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Upload or replace high-res PNG photos for all 5 viewing angles of this shirt color.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAnglesModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* 5 Angle Slots Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {tempAngleViews.map((angle, angleIdx) => {
                  const angleIcons = [
                    "fa-shirt",
                    "fa-arrows-rotate",
                    "fa-arrow-left",
                    "fa-circle-dot",
                    "fa-arrow-right"
                  ];
                  return (
                    <div 
                      key={angleIdx} 
                      style={{ 
                        border: angle.url ? '1.5px solid var(--green-dark)' : '1.5px dashed var(--border-medium)', 
                        padding: '0.85rem', 
                        backgroundColor: angle.url ? '#fbfdfc' : '#fcfcfc',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        position: 'relative'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--green-dark)', marginBottom: '0.5rem', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={`fa-solid ${angleIcons[angleIdx] || 'fa-camera'}`} style={{ marginRight: '5px', color: 'var(--accent)' }}></i>
                        {angle.name}
                      </div>

                      <div style={{ width: '100%', height: '150px', backgroundColor: '#f3f4f6', border: '1px solid var(--border-light)', borderRadius: '3px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', position: 'relative' }}>
                        {angle.url ? (
                          <img 
                            src={angle.url} 
                            alt={angle.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
                          />
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            <i className="fa-solid fa-image" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px', opacity: 0.5 }}></i>
                            No image
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ width: '100%', display: 'flex', gap: '4px' }}>
                        <label 
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.2rem',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            backgroundColor: 'var(--green-dark)',
                            color: '#fff',
                            cursor: 'pointer',
                            borderRadius: '3px',
                            textAlign: 'center',
                            display: 'inline-block'
                          }}
                          title={`Upload ${angle.name} (.png)`}
                        >
                          <i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: '3px' }}></i>
                          {angle.url ? 'Change' : 'Upload'}
                          <input 
                            type="file" 
                            accept=".png,image/png" 
                            hidden 
                            onChange={(e) => handleFileUpload(e, (url) => {
                              setTempAngleViews(prev => prev.map((item, i) => i === angleIdx ? { ...item, url } : item));
                            })} 
                          />
                        </label>

                        {angle.url && (
                          <button
                            type="button"
                            onClick={() => {
                              const presetViews = get5ViewsForSet(colorVariants[editingAnglesColorIdx]?.imageSet || 'shirt');
                              const fallbackUrl = presetViews[angleIdx]?.url || '/assets/shirt_front.png';
                              setTempAngleViews(prev => prev.map((item, i) => i === angleIdx ? { ...item, url: fallbackUrl } : item));
                            }}
                            style={{
                              padding: '0.4rem 0.5rem',
                              fontSize: '0.68rem',
                              border: '1px solid var(--border-medium)',
                              backgroundColor: '#fff',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              borderRadius: '3px'
                            }}
                            title="Reset to color preset default"
                          >
                            <i className="fa-solid fa-rotate-left"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const presetViews = get5ViewsForSet(colorVariants[editingAnglesColorIdx]?.imageSet || 'shirt');
                    setTempAngleViews(presetViews);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  <i className="fa-solid fa-rotate-left" style={{ marginRight: '4px' }}></i> Reset All to Preset
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAnglesModalOpen(false)}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAngleViews}
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1.4rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    <i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i> Save 5 Angle Views
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
