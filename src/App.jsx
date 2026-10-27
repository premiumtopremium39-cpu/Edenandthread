import React, { useState, useEffect, lazy, Suspense } from 'react';
import AnnouncementBar from './components/AnnouncementBar';
import Header from './components/Header';
import SearchOverlay from './components/SearchOverlay';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import WishlistDrawer from './components/WishlistDrawer';
import QuickViewModal from './components/QuickViewModal';
import SizeChartModal from './components/SizeChartModal';
import ToastContainer from './components/ToastContainer';

// Core entry pages loaded directly for instant initial rendering
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';

// Lazy loaded auxiliary pages for faster initial load time & minimal bundle size
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const OurStoryPage = lazy(() => import('./pages/OurStoryPage'));
const JournalPage = lazy(() => import('./pages/JournalPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'));

// Supabase Integration
import { 
  supabase, 
  authService, 
  productService, 
  orderService, 
  promoService, 
  announcementService,
  sizeGuideService, 
  formatUserData, 
  isSupabaseConfigured 
} from './lib/supabase';
import { get5ViewsForSet } from './utils/productViews';

const PRODUCTS = [
  {
    id: 1,
    title: "Classic Spread Collar Linen Shirt",
    category: "spread-collar",
    price: 24999.00,
    stock: 23,
    image: "/assets/shirt_front.png",
    badge: "Summer Atelier Collection 2026",
    description: "Our signature long-sleeve linen shirt. Super light, breathable, and finished with clean natural buttons. Keeps you cool in the daytime and looks sharp for dinners.",
    colors: [
      {
        name: "Pristine White",
        code: "#FFFFFF",
        stock: 10,
        image: "/assets/shirt_front.png",
        views: get5ViewsForSet("shirt")
      },
      {
        name: "Sky Blue",
        code: "#B0C4DE",
        stock: 5,
        image: "/assets/shirt_blue_front.png",
        views: get5ViewsForSet("shirt_blue")
      },
      {
        name: "Olive Green",
        code: "#556B2F",
        stock: 8,
        image: "/assets/shirt_olive_front.png",
        views: get5ViewsForSet("shirt_olive")
      }
    ],
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: 2,
    title: "Portofino Band Collar Linen Shirt",
    category: "band-collar",
    price: 18500.00,
    stock: 15,
    image: "/assets/set1/front.png",
    badge: "Pre-Washed Soft",
    description: "A clean, modern collarless linen shirt. Pre-washed so it feels super soft from day one. Perfect with shorts or casual trousers for easy weekend style.",
    colors: [
      {
        name: "Pristine White",
        code: "#FFFFFF",
        stock: 6,
        image: "/assets/shirt_front.png",
        views: get5ViewsForSet("shirt")
      },
      {
        name: "Sand Beige",
        code: "#E5DCD0",
        stock: 5,
        image: "/assets/shirt_beige_front.png",
        views: get5ViewsForSet("shirt_beige")
      },
      {
        name: "Atelier Charcoal",
        code: "#303438",
        stock: 4,
        image: "/assets/shirt_charcoal_front.png",
        views: get5ViewsForSet("shirt_charcoal")
      }
    ],
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: 3,
    title: "Capri Short-Sleeve Camp Shirt",
    category: "camp-collar",
    price: 15500.00,
    stock: 15,
    image: "/assets/shirt_blue_front.png",
    badge: "Summer Essential",
    description: "A relaxed short-sleeve shirt with an open Cuban collar. Lets the warm breeze flow through to keep you cool on the hottest sunny days.",
    colors: [
      {
        name: "Sky Blue",
        code: "#87CEEB",
        stock: 6,
        image: "/assets/shirt_blue_front.png",
        views: get5ViewsForSet("shirt_blue")
      },
      {
        name: "Sand Beige",
        code: "#E1D8C7",
        stock: 5,
        image: "/assets/shirt_beige_front.png",
        views: get5ViewsForSet("shirt_beige")
      },
      {
        name: "Riviera Sage",
        code: "#768E70",
        stock: 4,
        image: "/assets/shirt_sage_front.png",
        views: get5ViewsForSet("shirt_sage")
      }
    ],
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: 4,
    title: "Riviera Popover Linen Shirt",
    category: "popover",
    price: 13500.00,
    stock: 15,
    image: "/assets/shirt_peach_front.png",
    badge: "Easy Slip-On",
    description: "An easy slip-on shirt with a buttoned neck. Made from airy organic linen that moves comfortably with you on beach days and holiday trips.",
    colors: [
      {
        name: "Sunset Peach",
        code: "#F4A460",
        stock: 5,
        image: "/assets/shirt_peach_front.png",
        views: get5ViewsForSet("shirt_peach")
      },
      {
        name: "Pristine White",
        code: "#FFFFFF",
        stock: 6,
        image: "/assets/shirt_front.png",
        views: get5ViewsForSet("shirt")
      },
      {
        name: "Deep Navy Blue",
        code: "#1C2D48",
        stock: 4,
        image: "/assets/shirt_navy_front.png",
        views: get5ViewsForSet("shirt_navy")
      }
    ],
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: 5,
    title: "Monaco Structured Linen Overshirt",
    category: "tailored-fit",
    price: 16500.00,
    stock: 12,
    image: "/assets/shirt_beige_front.png",
    badge: "All-Season Layer",
    description: "A versatile heavier linen shirt. Wear it unbuttoned over a simple white T-shirt on cool evenings or buttoned up as a smart casual jacket.",
    colors: [
      {
        name: "Sand Beige",
        code: "#E5DCD0",
        stock: 4,
        image: "/assets/shirt_beige_front.png",
        views: get5ViewsForSet("shirt_beige")
      },
      {
        name: "Olive Green",
        code: "#556B2F",
        stock: 5,
        image: "/assets/shirt_olive_front.png",
        views: get5ViewsForSet("shirt_olive")
      },
      {
        name: "Deep Navy Blue",
        code: "#1C2D48",
        stock: 3,
        image: "/assets/shirt_navy_front.png",
        views: get5ViewsForSet("shirt_navy")
      }
    ],
    sizes: ["S", "M", "L", "XL"]
  }
];

export default function App() {
  // Navigation Routing States
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedProductId, setSelectedProductId] = useState(null);

  // Real-time Supabase Auth Session
  const [supabaseUser, setSupabaseUser] = useState(null);
  
  // Local simulated user fallback (for preview/testing when keys are not configured yet)
  const [simulatedUser, setSimulatedUser] = useState(() => {
    const saved = localStorage.getItem("eden_threads_simulated_user");
    return saved ? JSON.parse(saved) : null;
  });

  const user = supabaseUser || simulatedUser;

  // Supabase Auth listener
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    // Fetch active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        authService.getProfile(session.user.id).then(profile => {
          setSupabaseUser(formatUserData(session.user, profile));
        });
      } else {
        setSupabaseUser(null);
      }
    });

    // Listen to real-time auth events (Sign in, Sign out, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await authService.getProfile(session.user.id);
        setSupabaseUser(formatUserData(session.user, profile));
      } else {
        setSupabaseUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // App State Variables (Initial fallback to PRODUCTS, synced from Supabase)
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem("eden_threads_products");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(p => {
            const def = PRODUCTS.find(d => Number(d.id) === Number(p.id));
            const baseImg = p.image || def?.image || "/assets/shirt_front.png";
            if (def && (!p.colors?.[0]?.views || p.colors?.[0]?.stock === undefined)) {
              return { ...p, image: baseImg, colors: def.colors, stock: def.stock };
            }
            return { ...p, image: baseImg };
          });
        }
      } catch (e) {
        console.error("Error parsing saved products:", e);
      }
    }
    return PRODUCTS;
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem("eden_threads_orders");
    return saved ? JSON.parse(saved) : [];
  });

  const [promoCodes, setPromoCodes] = useState(() => {
    const saved = localStorage.getItem("eden_threads_promos");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      { id: 1, code: 'SUMMER15', type: 'percent', value: 15, active: true, usageCount: 8 },
      { id: 2, code: 'EDEN10', type: 'percent', value: 10, active: true, usageCount: 14 },
      { id: 3, code: 'LUXURY5000', type: 'flat', value: 5000, active: true, usageCount: 3 }
    ];
  });

  const [announcementText, setAnnouncementText] = useState(() => {
    return localStorage.getItem("eden_threads_announcement") || "COMPLIMENTARY WORLDWIDE SHIPPING ON ORDERS OVER ₹1,500 • DUTY-FREE DELIVERY";
  });

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("eden_threads_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem("eden_threads_wishlist");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortOption, setSortOption] = useState("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const [activeProductSizeGuide, setActiveProductSizeGuide] = useState(null);
  const [sizeGuideData, setSizeGuideData] = useState(() => {
    const saved = localStorage.getItem('eden_threads_sizeguide');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return null;
  });
  const [quickViewProductId, setQuickViewProductId] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Fetch unified database records from Supabase on mount
  useEffect(() => {
    async function loadCloudData() {
      if (!isSupabaseConfigured()) return;
      try {
        const [cloudProducts, cloudPromos, cloudAnnouncement, cloudOrders, cloudSizeGuide] = await Promise.all([
          productService.getProducts(),
          promoService.getAllPromos(),
          announcementService.getAnnouncement(),
          sizeGuideService.getSizeGuide(),
          orderService.getOrders(),
        ]);

        if (cloudProducts && cloudProducts.length > 0) setProducts(cloudProducts);
        if (cloudPromos && cloudPromos.length > 0) setPromoCodes(cloudPromos);
        if (cloudAnnouncement) setAnnouncementText(cloudAnnouncement);
        if (cloudSizeGuide) setSizeGuideData(cloudSizeGuide);
        if (cloudOrders && cloudOrders.length > 0) setOrders(cloudOrders);
      } catch (err) {
        console.warn("[Supabase Load Notice]:", err);
      }
    }
    loadCloudData();
  }, []);

  // Listen to Realtime Database changes across all users and admin updates
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel('public-db-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        try {
          const latestProducts = await productService.getProducts();
          if (latestProducts && latestProducts.length > 0) setProducts(latestProducts);
        } catch (err) {
          console.warn("[Realtime Products Refresh]:", err);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, async () => {
        try {
          const [latestMsg, latestGuide] = await Promise.all([
            announcementService.getAnnouncement(),
            sizeGuideService.getSizeGuide()
          ]);
          if (latestMsg) setAnnouncementText(latestMsg);
          if (latestGuide) setSizeGuideData(latestGuide);
        } catch (err) {
          console.warn("[Realtime Announcement Refresh]:", err);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_codes' }, async () => {
        try {
          const latestPromos = await promoService.getAllPromos();
          if (latestPromos && latestPromos.length > 0) setPromoCodes(latestPromos);
        } catch (err) {
          console.warn("[Realtime Promos Refresh]:", err);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        try {
          const latestOrders = await orderService.getOrders();
          if (latestOrders && latestOrders.length > 0) setOrders(latestOrders);
        } catch (err) {
          console.warn("[Realtime Orders Refresh]:", err);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_reviews' }, async () => {
        // Broadcast review update event so ProductDetailPage and AdminPage refresh immediately
        window.dispatchEvent(new CustomEvent('eden_threads_review_change'));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle Google OAuth post-redirect routing
  useEffect(() => {
    if (!supabase) return;

    // Check if coming back from Google OAuth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const targetHash = localStorage.getItem("eden_threads_oauth_target");
        if (targetHash) {
          localStorage.removeItem("eden_threads_oauth_target");
          window.location.hash = targetHash;
        }
      }
    }).catch((_err) => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const targetHash = localStorage.getItem("eden_threads_oauth_target");
        if (targetHash) {
          localStorage.removeItem("eden_threads_oauth_target");
          window.location.hash = targetHash;
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sync state to local storage for fast resilience
  useEffect(() => {
    try {
      localStorage.setItem("eden_threads_products", JSON.stringify(products));
    } catch (err) {
      console.warn("[LocalStorage Products Quota Notice]:", err.message);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem("eden_threads_orders", JSON.stringify(orders));
    } catch (err) {
      console.warn("[LocalStorage Orders Notice]:", err.message);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem("eden_threads_promos", JSON.stringify(promoCodes));
    } catch (err) {
      console.warn("[LocalStorage Promos Notice]:", err.message);
    }
  }, [promoCodes]);

  useEffect(() => {
    try {
      localStorage.setItem("eden_threads_announcement", announcementText);
    } catch (err) {
      console.warn("[LocalStorage Announcement Notice]:", err.message);
    }
  }, [announcementText]);

  useEffect(() => {
    try {
      localStorage.setItem("eden_threads_wishlist", JSON.stringify(wishlist));
    } catch (err) {
      console.warn("[LocalStorage Wishlist Notice]:", err.message);
    }
  }, [wishlist]);

  // Product CRUD handlers for Admin
  const handleAddProduct = async (newProd) => {
    const nextId = products.length > 0 ? Math.max(...products.map(p => Number(p.id) || 0)) + 1 : 1;
    let createdItem = { ...newProd, id: nextId };

    try {
      const saved = await productService.createProduct(newProd);
      if (saved?.id) {
        createdItem = { ...newProd, ...saved };
        showToast("<i class='fa-solid fa-cloud-check'></i> Product created and synced live to all visitors!");
      }
    } catch (err) {
      console.error("[Supabase Create Product Error]:", err);
      showToast(`<i class='fa-solid fa-triangle-exclamation'></i> Cloud Sync Warning: ${err.message}`);
    }

    setProducts(prev => [createdItem, ...prev.filter(p => p.id !== createdItem.id && p.id !== nextId)]);
  };

  const handleUpdateProduct = async (id, updatedFields) => {
    setProducts(prev => prev.map(p => (p.id === id || String(p.id) === String(id)) ? { ...p, ...updatedFields } : p));
    if (isSupabaseConfigured()) {
      try {
        await productService.updateProduct(id, updatedFields);
        showToast("<i class='fa-solid fa-cloud-check'></i> Product updated and synced live to all visitors!");
      } catch (err) {
        console.error("[Supabase Update Product Error]:", err);
        showToast(`<i class='fa-solid fa-triangle-exclamation'></i> Cloud Sync Warning: ${err.message}`);
      }
    }
  };

  const handleDeleteProduct = async (id) => {
    setProducts(prev => prev.filter(p => !(p.id === id || String(p.id) === String(id))));
    if (isSupabaseConfigured()) {
      try {
        await productService.deleteProduct(id);
        showToast("<i class='fa-solid fa-trash'></i> Product removed from catalog and database!");
      } catch (err) {
        console.error("[Supabase Delete Product Error]:", err);
        showToast(`<i class='fa-solid fa-triangle-exclamation'></i> Cloud Sync Warning: ${err.message}`);
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus, carrier = null, trackingNumber = null) => {
    setOrders(prev => prev.map(o => {
      if (o.orderId === orderId) {
        return {
          ...o,
          status: newStatus,
          carrier: carrier || o.carrier,
          trackingNumber: trackingNumber || o.trackingNumber
        };
      }
      return o;
    }));

    if (isSupabaseConfigured()) {
      try {
        await orderService.updateOrderStatus(orderId, newStatus, carrier, trackingNumber);
      } catch (err) {
        console.error("[Supabase Update Order Status Error]:", err);
      }
    }
  };

  // Promo Code Handlers
  const handleAddPromoCode = async (promo) => {
    const nextId = promoCodes.length > 0 ? Math.max(...promoCodes.map(p => p.id)) + 1 : 1;
    setPromoCodes(prev => [{ ...promo, id: nextId, usageCount: 0 }, ...prev]);
    if (isSupabaseConfigured()) {
      try {
        const saved = await promoService.createPromo(promo);
        if (saved?.id) {
          setPromoCodes(prev => prev.map(p => p.id === nextId ? saved : p));
        }
        showToast("<i class='fa-solid fa-cloud-check'></i> Promo code active and saved to Supabase!");
      } catch (err) {
        console.error("[Supabase Create Promo Error]:", err);
        showToast(`<i class='fa-solid fa-triangle-exclamation'></i> Cloud Sync Warning: ${err.message}`);
      }
    }
  };

  const handleTogglePromoCode = async (id) => {
    const promo = promoCodes.find(p => p.id === id);
    const newActive = promo ? !promo.active : true;
    setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, active: newActive } : p));
    if (isSupabaseConfigured()) {
      try {
        await promoService.togglePromo(id, newActive);
      } catch (err) {
        console.error("[Supabase Toggle Promo Error]:", err);
      }
    }
  };

  const handleDeletePromoCode = async (id) => {
    setPromoCodes(prev => prev.filter(p => p.id !== id));
    if (isSupabaseConfigured()) {
      try {
        await promoService.deletePromo(id);
      } catch (err) {
        console.error("[Supabase Delete Promo Error]:", err);
      }
    }
  };

  const handleUpdateAnnouncement = async (newText) => {
    setAnnouncementText(newText);
    if (isSupabaseConfigured()) {
      try {
        await announcementService.updateAnnouncement(newText);
        showToast("<i class='fa-solid fa-cloud-check'></i> Announcement broadcast synced live!");
      } catch (err) {
        console.error("[Supabase Update Announcement Error]:", err);
        showToast(`<i class='fa-solid fa-triangle-exclamation'></i> Cloud Sync Warning: ${err.message}`);
      }
    }
  };

  // 1. Hash-based Router Effect
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '' || hash === '#') {
        setCurrentPage('home');
        setSelectedProductId(null);
      } else if (hash === '#shop') {
        setCurrentPage('shop');
        setSelectedProductId(null);
      } else if (hash === '#story') {
        setCurrentPage('story');
        setSelectedProductId(null);
      } else if (hash === '#journal') {
        setCurrentPage('journal');
        setSelectedProductId(null);
      } else if (hash === '#checkout') {
        setCurrentPage('checkout');
        setSelectedProductId(null);
      } else if (hash === '#login') {
        setCurrentPage('login');
        setSelectedProductId(null);
      } else if (hash === '#admin') {
        setCurrentPage('admin');
        setSelectedProductId(null);
      } else if (hash === '#track') {
        setCurrentPage('track');
        setSelectedProductId(null);
        setTrackingOrderId(null);
      } else if (hash.startsWith('#track/')) {
        const ordId = decodeURIComponent(hash.replace('#track/', ''));
        setTrackingOrderId(ordId);
        setCurrentPage('track');
        setSelectedProductId(null);
      } else if (hash.startsWith('#product/')) {
        const id = parseInt(hash.replace('#product/', ''));
        setSelectedProductId(id);
        setCurrentPage('product-detail');
      } else if (hash === '#collections') {
        setCurrentPage('home');
        setSelectedProductId(null);
        setTimeout(() => {
          const colSec = document.getElementById('collections');
          if (colSec) colSec.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return;
      }

      // Always scroll to top on other page changes
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Guarantee scroll-to-top on page state change
  useEffect(() => {
    if (window.location.hash !== '#collections') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [currentPage, selectedProductId]);

  // 2. SEO Meta Tag Updater Effect
  useEffect(() => {
    let title = "Eden & Thread | Style Woven into Everyday Life";
    let description = "True fashion lives at the intersection of modern versatility, effortless comfort, and lasting quality. Discover curated everyday essentials.";

    if (currentPage === 'shop') {
      title = "Shop Curated Essentials | Eden & Thread";
      description = "Browse crisp men’s shirts, tailored pants, casual denim, and dynamic women’s wear crafted for all-day comfort.";
    } else if (currentPage === 'story') {
      title = "Crafted for Comfort. Designed for Your Life. | About Eden & Thread";
      description = "Every great style journey begins with a vision. Read our story and discover our commitment to craftsmanship, everyday style, and customer-first curation.";
    } else if (currentPage === 'journal') {
      title = "Care Guides & Style Journal | Eden & Thread";
      description = "Explore garment care guides, capsule wardrobe advice, and styling tips for modern versatile dressing.";
    } else if (currentPage === 'checkout') {
      title = "Secure Checkout | Eden & Thread";
      description = "Finalize your order for curated apparel with secure shipping and express delivery.";
    } else if (currentPage === 'login') {
      title = "Sign In & Authentication | Eden & Thread";
      description = "Authenticate securely with Google or email to access your profile and track orders.";
    } else if (currentPage === 'admin') {
      title = "Management Console | Eden & Thread";
      description = "Administrative management console for Eden & Thread operations and inventory.";
    } else if (currentPage === 'product-detail' && selectedProductId) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        title = `${product.title} | EDEN & THREAD`;
        description = product.description;
      }
    }

    document.title = title;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
  }, [currentPage, selectedProductId, products]);

  // Sync cart with localStorage
  useEffect(() => {
    localStorage.setItem("eden_threads_cart", JSON.stringify(cart));
  }, [cart]);

  // Toast handler
  const showToast = (message) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, isRemoving: false }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isRemoving: true } : t))
      );
    }, 3500);
  };

  const handleRemoveToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth Operations
  const handleLoginSimulate = (userData) => {
    setSimulatedUser(userData);
    localStorage.setItem("eden_threads_simulated_user", JSON.stringify(userData));
  };

  const handleLogout = async () => {
    if (simulatedUser) {
      setSimulatedUser(null);
      localStorage.removeItem("eden_threads_simulated_user");
    }
    if (isSupabaseConfigured()) {
      await authService.signOut();
      setSupabaseUser(null);
    }
    showToast("<i class='fa-solid fa-circle-check'></i> Logged out successfully.");
    window.location.hash = "#";
  };

  // Sync cart item prices whenever products are updated in Admin
  useEffect(() => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        const matchingProd = products.find((p) => p.id === item.id);
        if (matchingProd && matchingProd.price !== item.price) {
          return { ...item, price: matchingProd.price };
        }
        return item;
      })
    );
  }, [products]);

  // Cart operations
  const handleQuickAdd = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (typeof product.stock === 'number' && product.stock <= 0) {
      showToast(`<i class='fa-solid fa-triangle-exclamation'></i> Sorry, ${product.title} is currently sold out.`);
      return;
    }

    const defaultColor = product.colors?.[0]?.name || "White";
    const defaultSize = product.sizes?.[0] || "M";

    handleAddToCart(productId, defaultColor, defaultSize, 1);
    showToast(`<i class='fa-solid fa-bag-shopping'></i> Added ${product.title} to bag.`);
  };

  const handleAddToCart = (productId, color, size, qty = 1) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (typeof product.stock === 'number' && product.stock <= 0) {
      showToast(`<i class='fa-solid fa-triangle-exclamation'></i> Sorry, ${product.title} is currently out of stock.`);
      return;
    }

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (item) => item.id === productId && item.color === color && item.size === size
      );

      let newCart;
      if (existingIdx > -1) {
        const newQty = prevCart[existingIdx].qty + qty;
        if (typeof product.stock === 'number' && newQty > product.stock) {
          showToast(`<i class='fa-solid fa-triangle-exclamation'></i> Maximum available stock for ${product.title} is ${product.stock} units.`);
          return prevCart;
        }
        newCart = [...prevCart];
        newCart[existingIdx] = {
          ...newCart[existingIdx],
          qty: newQty,
          price: product.price // ALWAYS keep price synced with dynamic product
        };
      } else {
        let finalQty = qty;
        if (typeof product.stock === 'number' && qty > product.stock) {
          showToast(`<i class='fa-solid fa-triangle-exclamation'></i> Only ${product.stock} units available.`);
          finalQty = product.stock;
        }
        newCart = [
          ...prevCart,
          {
            id: productId,
            title: product.title,
            price: product.price, // DYNAMIC PRICE
            image: product.image,
            color: color,
            size: size,
            qty: finalQty,
            stock: product.stock
          }
        ];
      }
      return newCart;
    });

    setIsCartOpen(true);
  };

  const handleAdjustQty = (index, amount) => {
    setCart((prevCart) => {
      const item = prevCart[index];
      if (!item) return prevCart;
      const currentProd = products.find((p) => p.id === item.id);
      const maxStock = currentProd && typeof currentProd.stock === 'number' ? currentProd.stock : 99;

      const newQty = item.qty + amount;
      if (amount > 0 && newQty > maxStock) {
        showToast(`<i class='fa-solid fa-triangle-exclamation'></i> Only ${maxStock} units available in stock.`);
        return prevCart;
      }

      const newCart = [...prevCart];
      newCart[index] = { 
        ...newCart[index], 
        qty: newQty, 
        price: currentProd ? currentProd.price : item.price 
      };
      if (newCart[index].qty <= 0) {
        newCart.splice(index, 1);
      }
      return newCart;
    });
  };

  const handleRemoveItem = (index) => {
    const item = cart[index];
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
    showToast(`<i class='fa-solid fa-trash-can'></i> Removed ${item.title} from bag.`);
  };

  const handleNewsletterSubscribe = (_email) => {
    showToast("<i class='fa-solid fa-envelope-open-text'></i> Welcomed to the EDEN &amp; THREADS list!");
  };

  // Wishlist Handlers
  const handleToggleWishlist = (productId) => {
    const prod = products.find(p => p.id === productId);
    setWishlist((prev) => {
      if (prev.includes(productId)) {
        showToast(`<i class='fa-regular fa-heart'></i> Removed ${prod ? prod.title : 'item'} from saved items.`);
        return prev.filter(id => id !== productId);
      } else {
        showToast(`<i class='fa-solid fa-heart' style='color: var(--gold);'></i> Saved ${prod ? prod.title : 'item'} to your wishlist.`);
        return [...prev, productId];
      }
    });
  };

  const handleMoveWishlistToCart = (item) => {
    handleAddToCart(item.id, item.colors ? item.colors[0].name : "Pristine White", item.sizes ? item.sizes[0] : "M", 1);
    showToast(`<i class='fa-solid fa-bag-shopping'></i> Moved ${item.title} to shopping bag.`);
  };

  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  // Dynamic Page Content Renderer
  const renderPageContent = () => {
    return (
      <Suspense fallback={
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.75rem', color: 'var(--gold)' }}></i>
        </div>
      }>
        {(() => {
          switch (currentPage) {
            case 'shop':
              return (
                <ShopPage 
                  products={products}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  sortOption={sortOption}
                  onSortChange={setSortOption}
                  searchQuery={searchQuery}
                  onQuickView={setQuickViewProductId}
                  onQuickAdd={handleQuickAdd}
                  wishlist={wishlist}
                  onToggleWishlist={handleToggleWishlist}
                />
              );
            case 'story':
              return <OurStoryPage />;
            case 'journal':
              return <JournalPage />;
            case 'admin':
              return (
                <div style={{ padding: '6rem 2rem', textAlign: 'center', minHeight: '60vh' }}>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', marginBottom: '1rem' }}>Restricted Area</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Administrative operations are managed through the dedicated executive dashboard.</p>
                  <a href="#home" className="btn-luxury" style={{ display: 'inline-block', padding: '0.8rem 2rem' }}>Return to Storefront</a>
                </div>
              );
            case 'track':
              return (
                <OrderTrackingPage 
                  orders={orders}
                  initialOrderId={trackingOrderId}
                  onNavigateToShop={() => {
                    window.location.hash = '#shop';
                  }}
                />
              );
            case 'checkout':
              return (
                <CheckoutPage 
                  cartItems={cart}
                  user={user}
                  promoCodes={promoCodes}
                  onOrderComplete={async (orderData) => {
                    if (orderData) {
                      setOrders((prev) => [orderData, ...prev]);

                      // Sync with Supabase Orders & Payment Transactions in Cloud
                      if (isSupabaseConfigured()) {
                        try {
                          await orderService.createOrder({
                            ...orderData,
                            userId: user?.id || null,
                          });
                          if (orderData.paymentId) {
                            await paymentService.recordTransaction({
                              orderId: orderData.orderId,
                              paymentId: orderData.paymentId,
                              amount: orderData.amount,
                              currency: 'INR',
                              status: 'captured',
                              method: 'razorpay',
                              verified: true,
                              rawResponse: orderData,
                            });
                          }
                        } catch (err) {
                          console.error("[Supabase Order Sync Notice]:", err);
                        }
                      }

                      // Live inventory deduction on purchase!
                      if (orderData.items && orderData.items.length > 0) {
                        setProducts((prevProducts) =>
                          prevProducts.map((prod) => {
                            const orderedItem = orderData.items.find((it) => it.id === prod.id);
                            if (orderedItem) {
                              const updatedStock = Math.max(0, (prod.stock ?? 10) - (orderedItem.qty || 1));
                              if (isSupabaseConfigured()) {
                                productService.updateProduct(prod.id, { stock: updatedStock }).catch(e => console.warn(e));
                              }
                              return { ...prod, stock: updatedStock };
                            }
                            return prod;
                          })
                        );
                      }
                    }
                    setCart([]);
                  }}
                  showToast={showToast}
                />
              );
            case 'login':
              return (
                <LoginPage 
                  onLoginSimulate={handleLoginSimulate} 
                  showToast={showToast} 
                />
              );
            case 'product-detail':
              const currentProd = products.find(p => p.id === selectedProductId || String(p.id) === String(selectedProductId));
              return (
                <ProductDetailPage 
                  product={currentProd}
                  allProducts={products}
                  onAddToBag={handleAddToCart}
                  onSizeChartOpen={() => {
                    setActiveProductSizeGuide(currentProd?.size_guide || null);
                    setIsSizeChartOpen(true);
                  }}
                  onProductClick={(id) => {
                    window.location.hash = `#product/${id}`;
                  }}
                  wishlist={wishlist}
                  onToggleWishlist={handleToggleWishlist}
                  user={user}
                  showToast={showToast}
                />
              );
            case 'home':
            default:
              return (
                <HomePage 
                  products={products}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  sortOption={sortOption}
                  onSortChange={setSortOption}
                  searchQuery={searchQuery}
                  onQuickView={setQuickViewProductId}
                  onQuickAdd={handleQuickAdd}
                  wishlist={wishlist}
                  onToggleWishlist={handleToggleWishlist}
                  onSubscribe={handleNewsletterSubscribe}
                />
              );
          }
        })()}
      </Suspense>
    );
  };

  const selectedQuickViewProduct = products.find(p => p.id === quickViewProductId || String(p.id) === String(quickViewProductId));
  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

  return (
    <>
      <AnnouncementBar message={announcementText} />
      
      <Header 
        cartCount={cartCount} 
        wishlistCount={wishlist.length}
        onCartClick={() => setIsCartOpen(true)}
        onWishlistClick={() => setIsWishlistOpen(true)}
        onSearchClick={() => setIsSearchOpen(true)}
        user={user}
        onLogout={handleLogout}
      />

      <SearchOverlay 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          setSearchQuery(query);
          if (window.location.hash !== '#shop' && query.trim() !== '') {
            window.location.hash = '#shop';
          }
        }}
        products={products}
        onProductClick={(id) => {
          window.location.hash = `#product/${id}`;
        }}
      />

      {renderPageContent()}

      <Footer onCategoryChange={(cat) => {
        setActiveCategory(cat);
        window.location.hash = '#shop';
      }} />

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onAdjustQty={handleAdjustQty}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          setIsCartOpen(false);
          window.location.hash = '#checkout';
        }}
      />

      <WishlistDrawer 
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistItems={wishlistProducts}
        onRemoveFromWishlist={handleToggleWishlist}
        onMoveToCart={(item) => {
          handleMoveWishlistToCart(item);
          setIsWishlistOpen(false);
          setIsCartOpen(true);
        }}
        onProductClick={(id) => {
          window.location.hash = `#product/${id}`;
        }}
      />

      <QuickViewModal 
        product={selectedQuickViewProduct}
        isOpen={quickViewProductId !== null}
        onClose={() => setQuickViewProductId(null)}
        onSizeChartOpen={() => {
          setActiveProductSizeGuide(selectedQuickViewProduct?.size_guide || null);
          setIsSizeChartOpen(true);
        }}
        onAddToBag={(productId, color, size) => {
          handleAddToCart(productId, color, size, 1);
          showToast(`<i class='fa-solid fa-bag-shopping'></i> Added ${selectedQuickViewProduct?.title} to bag.`);
        }}
        isWishlisted={selectedQuickViewProduct ? wishlist.includes(selectedQuickViewProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
      />

      <SizeChartModal 
        isOpen={isSizeChartOpen}
        onClose={() => {
          setIsSizeChartOpen(false);
          setActiveProductSizeGuide(null);
        }}
        guideData={activeProductSizeGuide || sizeGuideData}
      />

      <ToastContainer 
        toasts={toasts}
        onRemoveToast={handleRemoveToast}
      />
    </>
  );
}
