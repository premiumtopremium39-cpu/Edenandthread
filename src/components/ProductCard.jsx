import React, { memo, useState } from 'react';
import { getProductColorImage, getProductColorStock, handleImageError, DEFAULT_FALLBACK_IMAGE } from '../utils/productViews';

function ProductCard({ 
  product, 
  onQuickView, 
  onQuickAdd, 
  isWishlisted = false, 
  onToggleWishlist 
}) {
  const { id, title, category, price, badge, colors = [] } = product;
  const [selectedColor, setSelectedColor] = useState(colors[0]?.name || '');

  const activeColorStock = getProductColorStock(product, selectedColor);
  const isSoldOut = activeColorStock <= 0;
  const isLowStock = activeColorStock > 0 && activeColorStock <= 3;
  const currentImg = getProductColorImage(product, selectedColor);

  return (
    <div className={`product-card ${isSoldOut ? 'product-sold-out' : ''}`}>
      <div className="product-img-wrapper" style={{ position: 'relative' }}>
        {isSoldOut ? (
          <span className="product-badge" style={{ backgroundColor: 'var(--green-dark)', color: 'var(--white)', fontWeight: 700, letterSpacing: '0.1em' }}>
            SOLD OUT
          </span>
        ) : badge ? (
          <span className="product-badge" style={{ backgroundColor: 'var(--white)', color: 'var(--green-dark)', border: '1px solid var(--border-light)' }}>
            {badge}
          </span>
        ) : null}

        {/* Wishlist Heart Button */}
        {onToggleWishlist && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWishlist(id);
            }}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            style={{
              position: 'absolute',
              top: '0.9rem',
              right: '0.9rem',
              zIndex: 10,
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'var(--glass-bg)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isWishlisted ? '#c53030' : 'var(--green-dark)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'var(--transition-fast)'
            }}
            className="wishlist-card-btn"
          >
            <i className={isWishlisted ? "fa-solid fa-heart" : "fa-regular fa-heart"} style={{ fontSize: '0.85rem' }}></i>
          </button>
        )}

        <a href={`#product/${id}`} className="product-img-link" style={{ display: 'block', width: '100%', height: '100%', opacity: isSoldOut ? 0.75 : 1 }}>
          <img 
            src={currentImg} 
            alt={title} 
            className="product-img" 
            loading="lazy" 
            decoding="async" 
            onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
          />
        </a>
        <div className="product-card-overlay">
          <button 
            className="overlay-btn btn-quickview" 
            onClick={(e) => {
              e.preventDefault();
              onQuickView(id);
            }}
          >
            Quick View
          </button>
          <button 
            className="overlay-btn btn-addcart" 
            disabled={isSoldOut}
            style={isSoldOut ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: 'var(--green-surface)', color: 'var(--text-muted)' } : {}}
            onClick={(e) => {
              e.preventDefault();
              if (!isSoldOut) onQuickAdd(id, selectedColor);
            }}
          >
            {isSoldOut ? 'Sold Out' : 'Add to Bag'}
          </button>
        </div>
      </div>
      <div className="product-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
          <span className="product-meta">{category?.replace('-', ' ')}</span>
          {isLowStock && (
            <span style={{ fontSize: '0.7rem', color: 'var(--gold-dark)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Only {activeColorStock} left
            </span>
          )}
        </div>
        <h3 className="product-title" style={{ marginBottom: '0.4rem' }}>
          <a href={`#product/${id}`} style={{ color: 'inherit' }}>{title}</a>
        </h3>

        {/* Inline Color Dot Swatches */}
        {colors.length > 1 && (
          <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            {colors.map((c) => {
              const colorCode = c.code || c.hex || '#FFFFFF';
              return (
                <span
                  key={c.name}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedColor(c.name);
                  }}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: colorCode,
                    cursor: 'pointer',
                    border: c.name === selectedColor ? '2px solid var(--gold)' : colorCode.toLowerCase() === '#ffffff' ? '1px solid #ccc' : '1px solid transparent',
                    transform: c.name === selectedColor ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                    display: 'inline-block'
                  }}
                  title={`${c.name} (${getProductColorStock(product, c.name)} units)`}
                />
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="product-price">
            ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          {isSoldOut && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Out of Stock
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
