import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { reviewService, isSupabaseConfigured } from '../lib/supabase';
import { getProductColorViews, getProductColorStock, handleImageError, DEFAULT_FALLBACK_IMAGE } from '../utils/productViews';

export default function ProductDetailPage({ 
  product, 
  allProducts = [], 
  onAddToBag, 
  onSizeChartOpen, 
  onProductClick,
  wishlist = [],
  onToggleWishlist,
  user,
  showToast
}) {
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [activeThumbIdx, setActiveThumbIdx] = useState(0);
  const [activeImgUrl, setActiveImgUrl] = useState('');
  const [activeImgAlt, setActiveImgAlt] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'care' | 'sustainability' | 'shipping' | 'reviews'

  // Admin role check
  const isAdmin = user?.role === 'admin' || (typeof window !== 'undefined' && localStorage.getItem("eden_threads_admin_session") === "true");

  // Reviews state
  const [reviews, setReviews] = useState(() => {
    const saved = localStorage.getItem(`eden_threads_reviews_${product?.id || 'default'}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    if (Number(product?.id) === 1) {
      return [
        {
          id: 1,
          author: "Julian Vance",
          rating: 5,
          date: "August 12, 2026",
          title: "Hands down the best linen shirt I've worn",
          comment: "The breathability in Mediterranean heat is unreal. It doesn't stick to the skin and the pre-washed texture feels soft immediately. Fits true to size.",
          verified: true
        },
        {
          id: 2,
          author: "Marcus Sterling",
          rating: 5,
          date: "July 29, 2026",
          title: "Subtle luxury without noisy logos",
          comment: "The mother of pearl buttons and French seams are flawless. Wore this to an outdoor coastal wedding and stayed cool the entire evening.",
          verified: true
        }
      ];
    } else if (Number(product?.id) === 2) {
      return [
        {
          id: 3,
          author: "Alexander Wright",
          rating: 5,
          date: "August 20, 2026",
          title: "Exceptional craftsmanship",
          comment: "The band collar is structured just right. Works great under a summer jacket or untucked with shorts.",
          verified: true
        }
      ];
    }
    return [];
  });

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ author: '', rating: 5, title: '', comment: '' });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Fetch reviews from Supabase / API when product loads or updates
  useEffect(() => {
    async function loadCloudReviews() {
      if (!product?.id) return;
      try {
        const cloudReviews = await reviewService.getProductReviews(product.id);
        if (cloudReviews) {
          setReviews(cloudReviews);
          try {
            localStorage.setItem(`eden_threads_reviews_${product.id}`, JSON.stringify(cloudReviews));
          } catch {}
        }
      } catch (err) {
        console.warn("[Reviews Notice]:", err);
      }
    }
    loadCloudReviews();

    const handleCloudReviewUpdate = () => {
      loadCloudReviews();
    };

    window.addEventListener('eden_threads_review_change', handleCloudReviewUpdate);
    return () => window.removeEventListener('eden_threads_review_change', handleCloudReviewUpdate);
  }, [product?.id]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newReview.author.trim() || !newReview.comment.trim()) return;

    const createdReview = {
      id: Date.now(),
      author: newReview.author.trim(),
      rating: parseInt(newReview.rating, 10) || 5,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      title: newReview.title.trim() || 'Verified Experience',
      comment: newReview.comment.trim(),
      verified: true
    };

    const updatedReviews = [createdReview, ...reviews];
    setReviews(updatedReviews);

    if (product?.id) {
      try {
        localStorage.setItem(`eden_threads_reviews_${product.id}`, JSON.stringify(updatedReviews));
      } catch (err) {
        console.error('Failed to save review locally:', err);
      }

      try {
        const savedCloud = await reviewService.addReview(product.id, newReview, user?.id || null);
        if (savedCloud) {
          setReviews(prev => [savedCloud, ...prev.filter(r => r.id !== createdReview.id)]);
        }
      } catch (cloudErr) {
        console.error("[Add Review Error]:", cloudErr);
      }
    }

    setNewReview({ author: '', rating: 5, title: '', comment: '' });
    setReviewSubmitted(true);
    setTimeout(() => {
      setReviewSubmitted(false);
      setShowReviewForm(false);
    }, 1800);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this customer review as Admin?")) return;
    const updated = reviews.filter(r => r.id !== reviewId);
    setReviews(updated);
    if (product?.id) {
      try {
        localStorage.setItem(`eden_threads_reviews_${product.id}`, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to update reviews:', err);
      }

      if (isSupabaseConfigured()) {
        try {
          await reviewService.deleteReview(reviewId);
        } catch (cloudErr) {
          console.error("[Supabase Delete Review Error]:", cloudErr);
        }
      }
    }
    if (showToast) {
      showToast("<i class='fa-solid fa-trash-can'></i> Customer review deleted by Administrator");
    }
  };

  useEffect(() => {
    if (product) {
      const initialColor = product.colors?.[0]?.name || '';
      setSelectedColor(initialColor);
      setSelectedSize(product.sizes?.[0] || '');
      
      const views = getProductColorViews(product, initialColor);
      if (views.length > 0) {
        setActiveImgUrl(views[0].url);
        setActiveImgAlt(`${product.title} - ${views[0].name}`);
        setActiveThumbIdx(0);
      }

      const saved = localStorage.getItem(`eden_threads_reviews_${product.id}`);
      if (saved) {
        try { setReviews(JSON.parse(saved)); } catch {}
      }
      
      // Scroll to top on product change
      window.scrollTo(0, 0);
    }
  }, [product]);

  if (!product) {
    return (
      <div style={{ paddingTop: '150px', textAlign: 'center', minHeight: '50vh' }}>
        <h3>Product not found.</h3>
        <a href="#shop" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Back to Shop</a>
      </div>
    );
  }

  const views = getProductColorViews(product, selectedColor);
  const colorStock = getProductColorStock(product, selectedColor);
  const isColorSoldOut = colorStock <= 0;
  const isColorLowStock = colorStock > 0 && colorStock <= 3;

  const relatedProducts = (allProducts || []).filter(p => p.id !== product.id).slice(0, 3);
  const avgRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)).toFixed(1);
  const isCurrentWishlisted = (wishlist || []).includes(product?.id);

  const handleThumbClick = (url, name, idx) => {
    setActiveImgUrl(url);
    setActiveImgAlt(`${product.title} - ${name}`);
    setActiveThumbIdx(idx);
  };

  const handleColorChange = (colorName) => {
    setSelectedColor(colorName);
    const newViews = getProductColorViews(product, colorName);
    if (newViews.length > 0) {
      setActiveImgUrl(newViews[0].url);
      setActiveImgAlt(`${product.title} - ${newViews[0].name}`);
      setActiveThumbIdx(0);
    }
  };

  const handleAdd = () => {
    if (isColorSoldOut) return;
    onAddToBag(product.id, selectedColor, selectedSize);
  };

  return (
    <div className="product-detail-page" style={{ paddingTop: '160px', paddingBottom: '100px', backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: '1240px' }}>
        
        {/* Breadcrumbs */}
        <nav style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          <a href="#" style={{ color: 'inherit', transition: 'color var(--transition-fast)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold)'} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>Home</a>
          <span style={{ margin: '0 0.6rem', opacity: 0.5 }}>/</span>
          <a href="#shop" style={{ color: 'inherit', transition: 'color var(--transition-fast)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold)'} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>Shop Collection</a>
          <span style={{ margin: '0 0.6rem', opacity: 0.5 }}>/</span>
          <span style={{ color: 'var(--green-dark)', fontWeight: 600 }}>{product.title}</span>
        </nav>

        {/* Product Layout Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '4.5rem', marginBottom: '5rem', alignItems: 'start' }} className="pdp-grid">
          
          {/* Left Column: Photo Gallery Component */}
          <div>
            <div className="pdp-gallery-main" style={{ width: '100%', aspectRatio: '3/4', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)' }}>
              <img 
                src={activeImgUrl} 
                alt={activeImgAlt} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
              />
              {product.badge && (
                <span className="product-badge" style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', zIndex: 2 }}>
                  {product.badge}
                </span>
              )}
            </div>

            {/* Thumbnail Selector List - Perfectly Aligned 5-Column Grid */}
            {views.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${views.length}, 1fr)`, gap: '10px', marginTop: '1.25rem', width: '100%' }}>
                {views.map((v, idx) => (
                  <button
                    key={v.name}
                    onClick={() => handleThumbClick(v.url, v.name, idx)}
                    style={{
                      width: '100%',
                      aspectRatio: '3/4',
                      padding: 0,
                      border: activeThumbIdx === idx ? '2px solid var(--gold)' : '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-secondary)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      boxShadow: activeThumbIdx === idx ? '0 4px 14px rgba(197, 160, 89, 0.3)' : 'none',
                      transform: activeThumbIdx === idx ? 'scale(1.02)' : 'scale(1)'
                    }}
                    title={v.name}
                    aria-label={`View ${v.name}`}
                  >
                    <img 
                      src={v.url} 
                      alt={v.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} 
                      onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
                    />
                    <span style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0, 
                      width: '100%', 
                      backgroundColor: activeThumbIdx === idx ? 'var(--green-dark)' : 'rgba(14, 37, 25, 0.8)', 
                      color: activeThumbIdx === idx ? 'var(--gold)' : '#FFFFFF', 
                      fontSize: '0.62rem', 
                      fontWeight: 700, 
                      letterSpacing: '0.04em', 
                      textTransform: 'uppercase', 
                      padding: '4px 2px', 
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.1
                    }}>
                      {v.name.replace(' View', '').replace(' Side', '')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Sticky Product Info and Actions */}
          <div style={{ position: 'sticky', top: '120px', alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <span className="modal-meta" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>
                {product.category?.replace('-', ' ')}
              </span>
              <span style={{ color: 'var(--border-medium)' }}>&bull;</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--gold-dark)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                <i className="fa-solid fa-star" style={{ color: 'var(--gold)' }}></i> {avgRating} ({reviews.length} Reviews)
              </span>
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 400, color: 'var(--green-dark)', marginBottom: '0.75rem', lineHeight: 1.25 }}>
              {product.title}
            </h1>

            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--green-dark)', marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
              ₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>

            <p className="modal-desc" style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem' }}>
              {product.description}
            </p>

            {/* Color Swatches */}
            <div className="selector-group" style={{ marginBottom: '1.75rem' }}>
              <span className="selector-label" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', display: 'block' }}>
                Color: <strong id="selectedColorName">{selectedColor}</strong>
              </span>
              <div className="color-dots" style={{ display: 'flex', gap: '0.75rem' }}>
                {(product.colors || []).map((c) => {
                  const colorCode = c.code || c.hex || '#FFFFFF';
                  return (
                    <button 
                      key={c.name}
                      className={`color-dot ${c.name === selectedColor ? 'active' : ''}`} 
                      data-color={c.name} 
                      onClick={() => handleColorChange(c.name)}
                      style={{ 
                        backgroundColor: colorCode, 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%',
                        border: c.name === selectedColor ? '2.5px solid var(--gold)' : colorCode.toLowerCase() === '#ffffff' ? '1px solid var(--border-medium)' : '1px solid transparent',
                        cursor: 'pointer',
                        boxShadow: c.name === selectedColor ? '0 0 0 2px #fff inset, 0 2px 8px rgba(0,0,0,0.15)' : 'none',
                        transform: c.name === selectedColor ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.2s ease'
                      }}
                      aria-label={c.name}
                      title={`${c.name} (${getProductColorStock(product, c.name)} in stock)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Size Options & Guide Link */}
            <div className="selector-group" style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="selector-label" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                  Size: <strong>{selectedSize}</strong>
                </span>
                <button 
                  onClick={onSizeChartOpen} 
                  style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    color: 'var(--gold-dark)', 
                    borderBottom: '1px solid var(--gold)', 
                    background: 'none', 
                    borderTop: 'none', 
                    borderLeft: 'none', 
                    borderRight: 'none', 
                    cursor: 'pointer', 
                    padding: 0 
                  }}
                >
                  <i className="fa-solid fa-ruler-horizontal" style={{ marginRight: '4px' }}></i> Size Guide
                </button>
              </div>
              <div className="size-options" style={{ display: 'flex', gap: '0.6rem' }}>
                {(product.sizes || []).map((s) => (
                  <button 
                    key={s}
                    className={`size-btn ${s === selectedSize ? 'active' : ''}`} 
                    onClick={() => setSelectedSize(s)}
                    style={{ 
                      width: '46px', 
                      height: '46px', 
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      cursor: 'pointer',
                      backgroundColor: s === selectedSize ? 'var(--green-dark)' : '#fff',
                      color: s === selectedSize ? '#fff' : 'var(--text-primary)',
                      border: s === selectedSize ? '1.5px solid var(--green-dark)' : '1px solid var(--border-medium)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Color-Specific Stock Availability Indicator */}
            {isColorSoldOut ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.75rem', width: 'fit-content' }}>
                <i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444' }}></i> Out of Stock in {selectedColor}
              </div>
            ) : isColorLowStock ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', backgroundColor: 'var(--gold-light)', border: '1px solid var(--gold-border)', color: 'var(--gold-dark)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.75rem', width: 'fit-content' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> Only {colorStock} units remaining in {selectedColor}
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', backgroundColor: 'var(--green-light)', border: '1px solid var(--green-surface)', color: 'var(--green-dark)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.75rem', width: 'fit-content' }}>
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--gold)' }}></i> In Stock &bull; Ready for Immediate Dispatch ({colorStock} Units in {selectedColor})
              </div>
            )}

            {/* Actions: Add to Bag + Wishlist Heart */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', alignItems: 'stretch' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleAdd}
                disabled={isColorSoldOut}
                style={{ 
                  flex: 1, 
                  height: '52px',
                  padding: '0 1.5rem', 
                  fontSize: '0.85rem', 
                  letterSpacing: '0.1em', 
                  textTransform: 'uppercase', 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isColorSoldOut ? 'var(--green-surface)' : undefined,
                  borderColor: isColorSoldOut ? 'var(--border-medium)' : undefined,
                  color: isColorSoldOut ? 'var(--text-muted)' : undefined,
                  cursor: isColorSoldOut ? 'not-allowed' : 'pointer'
                }}
              >
                {isColorSoldOut ? `Sold Out in ${selectedColor}` : 'Add to Shopping Bag'}
              </button>

              {onToggleWishlist && (
                <button
                  onClick={() => onToggleWishlist(product.id)}
                  aria-label={isCurrentWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  style={{
                    width: '52px',
                    height: '52px',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: '#fff',
                    color: isCurrentWishlisted ? '#c53030' : 'var(--green-dark)',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition-fast)',
                    flexShrink: 0
                  }}
                  title={isCurrentWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
                >
                  <i className={isCurrentWishlisted ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                </button>
              )}
            </div>

            {/* Details tabs */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                {['details', 'care', 'shipping'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.08em', 
                      color: activeTab === tab ? 'var(--green-dark)' : 'var(--text-muted)',
                      borderBottom: activeTab === tab ? '2px solid var(--green-dark)' : '2px solid transparent',
                      paddingBottom: '0.75rem',
                      marginBottom: '-0.85rem',
                      background: 'none',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {tab === 'details' ? 'Details & Fit' : tab === 'care' ? 'Materials & Care' : 'Shipping & Returns'}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {activeTab === 'details' && (
                  <p style={{ whiteSpace: 'pre-line' }}>
                    {product.size_guide?.details_fit || product.details_fit || 'Designed for a relaxed resort fit. Finished with genuine mother-of-pearl buttons and clean French seams. Fits true to size.'}
                  </p>
                )}
                {activeTab === 'care' && (
                  <p style={{ whiteSpace: 'pre-line' }}>
                    {product.size_guide?.materials_care || product.materials_care || '100% traceably sourced organic European flax. Pre-washed with volcanic pumice. Machine wash cold on gentle cycle and hang dry in shade.'}
                  </p>
                )}
                {activeTab === 'shipping' && (
                  <p style={{ whiteSpace: 'pre-line' }}>
                    {product.size_guide?.shipping_returns || product.shipping_returns || 'Complimentary worldwide express shipping on orders over ₹1,500. Duties and local taxes covered. 30-day returns accepted in original condition.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '4rem', marginBottom: '5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--gold-dark)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                Verified Patron Feedback
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--green-dark)', margin: 0 }}>
                Customer Reviews ({reviews.length})
              </h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
              <div style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>
                <i className="fa-solid fa-star"></i>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--green-dark)' }}>{avgRating}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 5.0</span>
            </div>
          </div>

          {/* Reviews Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {reviews.map(rev => (
              <div key={rev.id} style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '1.75rem', boxShadow: 'var(--shadow-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i key={i} className={i < rev.rating ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rev.date}</span>
                </div>
                
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--green-dark)', marginBottom: '0.5rem' }}>
                  {rev.title}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  "{rev.comment}"
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{rev.author}</span>
                  {rev.verified && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--green-dark)', backgroundColor: 'var(--green-light)', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>
                      <i className="fa-solid fa-circle-check" style={{ color: 'var(--gold)', marginRight: '3px' }}></i> Verified Buyer
                    </span>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteReview(rev.id)}
                      style={{
                        marginLeft: 'auto',
                        background: 'none',
                        border: '1px solid rgba(197, 48, 48, 0.4)',
                        color: '#c53030',
                        fontSize: '0.68rem',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#c53030';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#c53030';
                      }}
                      title="Delete this customer review (Administrator)"
                    >
                      <i className="fa-solid fa-trash-can"></i> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Related Products Grid */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '4rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: 'var(--green-dark)', marginBottom: '2.5rem', textAlign: 'center' }}>
            Atelier Recommendations
          </h2>
          <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem' }}>
            {relatedProducts.map(p => (
              <div 
                key={p.id} 
                onClick={() => onProductClick(p.id)}
                style={{ cursor: 'pointer' }}
              >
                <ProductCard 
                  product={p}
                  onQuickView={(id) => onProductClick(id)}
                  onQuickAdd={(id) => onAddToBag(id, p.colors[0].name, p.sizes[0])}
                  isWishlisted={wishlist.includes(p.id)}
                  onToggleWishlist={onToggleWishlist}
                />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
