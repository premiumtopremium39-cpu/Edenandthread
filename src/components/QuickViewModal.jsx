import React, { useState, useEffect } from 'react';
import { getProductColorViews, getProductColorStock, handleImageError, DEFAULT_FALLBACK_IMAGE } from '../utils/productViews';

export default function QuickViewModal({ 
  product, 
  isOpen, 
  onClose, 
  onSizeChartOpen, 
  onAddToBag,
  isWishlisted = false,
  onToggleWishlist
}) {
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [activeImgUrl, setActiveImgUrl] = useState('');
  const [activeImgAlt, setActiveImgAlt] = useState('');
  const [activeThumbIdx, setActiveThumbIdx] = useState(0);

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
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const views = getProductColorViews(product, selectedColor);
  const colorStock = getProductColorStock(product, selectedColor);
  const isColorSoldOut = colorStock <= 0;
  const isColorLowStock = colorStock > 0 && colorStock <= 3;

  const handleThumbClick = (url, name, idx) => {
    setActiveImgUrl(url);
    setActiveImgAlt(`${product.title} - ${name}`);
    setActiveThumbIdx(idx);
  };

  const handleColorChange = (colorName) => {
    setSelectedColor(colorName);
    const newViews = getProductColorViews(product, colorName);
    if (newViews && newViews.length > 0) {
      setActiveImgUrl(newViews[0].url);
      setActiveImgAlt(`${product.title} - ${newViews[0].name}`);
      setActiveThumbIdx(0);
    }
  };

  const handleAdd = () => {
    if (isColorSoldOut) return;
    onAddToBag(product.id, selectedColor, selectedSize);
    onClose();
  };

  return (
    <div 
      className={`modal-overlay ${isOpen ? 'active' : ''}`} 
      id="quickViewOverlay"
      onClick={(e) => {
        if (e.target.id === 'quickViewOverlay') onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(10, 28, 21, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: isOpen ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.25rem',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
        transition: 'all 0.3s ease'
      }}
    >
      <div 
        className="modal-container" 
        id="quickViewModal" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modalProductTitle"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          maxWidth: '860px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          position: 'relative',
          border: '1px solid var(--border-light)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
          padding: '2rem'
        }}
      >
        <button 
          className="close-modal-btn" 
          id="closeModalBtn" 
          aria-label="Close modal"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            zIndex: 10,
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            lineHeight: 1,
            padding: '0.25rem'
          }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Gallery View */}
          <div className="modal-gallery" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div 
              className="modal-main-img" 
              style={{ 
                position: 'relative', 
                aspectRatio: '3/4', 
                backgroundColor: 'var(--bg-secondary)', 
                overflow: 'hidden',
                border: '1px solid var(--border-light)'
              }}
            >
              {product.badge && (
                <span 
                  className="product-badge" 
                  id="modalBadge" 
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    backgroundColor: 'var(--glass-bg)',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid var(--border-light)',
                    zIndex: 2
                  }}
                >
                  {product.badge}
                </span>
              )}
              <img 
                src={activeImgUrl || product.image} 
                alt={activeImgAlt || product.title} 
                id="modalMainImg" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  transition: 'opacity 0.25s ease'
                }}
                onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
              />
            </div>

            {/* Thumbnail Navigation Row (5 Angle Views) */}
            {views.length > 1 && (
              <div 
                className="modal-thumbs" 
                id="modalThumbs" 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: `repeat(${views.length}, 1fr)`, 
                  gap: '0.5rem',
                  marginTop: '0.25rem'
                }}
              >
                {views.map((v, idx) => (
                  <button
                    key={v.name}
                    className={`thumb-btn ${idx === activeThumbIdx ? 'active' : ''}`}
                    onClick={() => handleThumbClick(v.url, v.name, idx)}
                    style={{
                      aspectRatio: '1',
                      border: idx === activeThumbIdx ? '2px solid var(--gold)' : '1px solid var(--border-medium)',
                      padding: 0,
                      backgroundColor: 'var(--bg-secondary)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative',
                      boxShadow: idx === activeThumbIdx ? '0 2px 8px rgba(197, 160, 89, 0.3)' : 'none',
                      transform: idx === activeThumbIdx ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.15s ease'
                    }}
                    title={v.name}
                  >
                    <img 
                      src={v.url} 
                      alt={`${v.name} Thumbnail`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} 
                      onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
                    />
                    <span style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0, 
                      width: '100%', 
                      backgroundColor: idx === activeThumbIdx ? 'var(--green-dark)' : 'rgba(14, 37, 25, 0.82)', 
                      color: idx === activeThumbIdx ? 'var(--gold)' : '#FFFFFF', 
                      fontSize: '0.55rem', 
                      fontWeight: 700, 
                      letterSpacing: '0.03em', 
                      textTransform: 'uppercase', 
                      padding: '2px 1px', 
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

          {/* Details view */}
          <div className="modal-info" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="modal-meta" id="modalCategory" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
              {product.category?.replace('-', ' ')}
            </span>
            <h2 className="modal-title" id="modalProductTitle" style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 400, color: 'var(--green-dark)', marginBottom: '0.4rem', lineHeight: 1.2 }}>
              {product.title}
            </h2>
            <div className="modal-price" id="modalPrice" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--green-dark)', marginBottom: '0.75rem' }}>
              ₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>

            <p className="modal-desc" id="modalDesc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem' }}>
              {product.description}
            </p>

            {/* Color selection - Reactive Color Switching */}
            <div className="selector-group" style={{ marginBottom: '1.1rem' }}>
              <span className="selector-label" style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem', display: 'block' }}>
                Color: <strong id="modalSelectedColor">{selectedColor}</strong>
              </span>
              <div className="color-dots" id="modalColorDots" style={{ display: 'flex', gap: '0.6rem' }}>
                {(product.colors || []).map((c) => {
                  const colorCode = c.code || c.hex || '#FFFFFF';
                  return (
                    <span 
                      key={c.name}
                      className={`color-dot ${c.name === selectedColor ? 'active' : ''}`} 
                      data-color={c.name} 
                      style={{ 
                        backgroundColor: colorCode, 
                        cursor: 'pointer',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: c.name === selectedColor ? '2.5px solid var(--gold)' : colorCode.toLowerCase() === '#ffffff' ? '1px solid var(--border-medium)' : '1px solid transparent',
                        boxShadow: c.name === selectedColor ? '0 0 0 2px #fff inset, 0 2px 6px rgba(0,0,0,0.15)' : 'none',
                        transform: c.name === selectedColor ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        display: 'inline-block'
                      }}
                      onClick={() => handleColorChange(c.name)}
                      role="button"
                      aria-label={`Select color ${c.name}`}
                      title={`${c.name} (${getProductColorStock(product, c.name)} in stock)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Size selection */}
            <div className="selector-group" style={{ marginBottom: '1.1rem' }}>
              <div className="selector-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span className="selector-label" style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Size: <strong>{selectedSize}</strong></span>
                <button 
                  className="size-chart-link" 
                  onClick={onSizeChartOpen}
                  style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    color: 'var(--gold-dark)', 
                    borderBottom: '1px solid var(--gold)', 
                    background: 'none',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)' 
                  }}
                >
                  Size Guide
                </button>
              </div>
              <div className="size-options" style={{ display: 'flex', gap: '0.5rem' }}>
                {(product.sizes || []).map((s) => (
                  <button 
                    key={s}
                    className={`size-btn ${s === selectedSize ? 'active' : ''}`} 
                    data-size={s}
                    onClick={() => setSelectedSize(s)}
                    style={{
                      width: '40px',
                      height: '40px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: s === selectedSize ? 'var(--green-dark)' : '#fff',
                      color: s === selectedSize ? '#fff' : 'var(--text-primary)',
                      border: s === selectedSize ? '1.5px solid var(--green-dark)' : '1px solid var(--border-medium)'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Color-Specific Stock Availability Indicator */}
            {isColorSoldOut ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444' }}></i> Out of Stock in {selectedColor}
              </div>
            ) : isColorLowStock ? (
              <div style={{ color: 'var(--gold-dark)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> Only {colorStock} units remaining in {selectedColor}
              </div>
            ) : (
              <div style={{ color: 'var(--green-dark)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--gold)' }}></i> In Stock ({colorStock} Units Available)
              </div>
            )}

            {/* Actions */}
            <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleAdd}
                disabled={isColorSoldOut}
                style={{
                  flex: 1,
                  height: '46px',
                  fontSize: '0.8rem',
                  letterSpacing: '0.08em',
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
                  className={`modal-wishlist-btn ${isWishlisted ? 'active' : ''}`}
                  onClick={() => onToggleWishlist(product.id)}
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  style={{
                    width: '46px',
                    height: '46px',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: '#fff',
                    color: isWishlisted ? '#c53030' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className={isWishlisted ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
