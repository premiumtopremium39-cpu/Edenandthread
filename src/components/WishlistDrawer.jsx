import React from 'react';
import { handleImageError, DEFAULT_FALLBACK_IMAGE } from '../utils/productViews';

export default function WishlistDrawer({
  isOpen,
  onClose,
  wishlistItems = [],
  onRemoveFromWishlist,
  onMoveToCart,
  onProductClick
}) {
  return (
    <>
      <div 
        className={`cart-drawer-overlay ${isOpen ? 'active' : ''}`} 
        id="wishlistDrawerOverlay"
        onClick={onClose}
      ></div>
      <aside 
        className={`cart-drawer ${isOpen ? 'active' : ''}`} 
        id="wishlistDrawer" 
        aria-hidden={!isOpen} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="wishlistTitle"
      >
        <div className="cart-drawer-header">
          <h3 id="wishlistTitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-heart" style={{ color: 'var(--gold)' }}></i>
            Saved Items ({wishlistItems.length})
          </h3>
          <button 
            className="close-cart-btn" 
            id="closeWishlistBtn" 
            aria-label="Close wishlist drawer"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="cart-empty-state" style={{ display: 'flex', padding: '4rem 2rem' }}>
            <i className="fa-regular fa-heart empty-icon" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '1rem' }}></i>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--green-dark)', marginBottom: '0.5rem' }}>
              Your Wishlist is Empty
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center' }}>
              Tap the heart icon on any linen garment to save your favorites for later.
            </p>
            <a 
              href="#shop" 
              className="btn btn-secondary"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                const shopEl = document.getElementById('shop');
                if (shopEl) shopEl.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{ fontSize: '0.75rem', padding: '0.8rem 1.75rem' }}
            >
              Explore Collection
            </a>
          </div>
        ) : (
          <div className="cart-items-container" style={{ display: 'block', padding: '1.5rem 2rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Saved for your wardrobe
            </p>
            {wishlistItems.map((item) => (
              <div key={item.id} className="cart-item" style={{ position: 'relative' }}>
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="cart-item-img" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    onClose();
                    if (onProductClick) onProductClick(item.id);
                  }}
                  onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
                />
                <div className="cart-item-details">
                  <div className="cart-item-header">
                    <h4 
                      className="cart-item-title" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        onClose();
                        if (onProductClick) onProductClick(item.id);
                      }}
                    >
                      {item.title}
                    </h4>
                    <button 
                      className="cart-item-remove" 
                      onClick={() => onRemoveFromWishlist(item.id)}
                      aria-label="Remove from wishlist"
                      title="Remove from saved items"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                  <p className="cart-item-variant">{item.category?.replace('-', ' ')} &bull; 100% Linen</p>
                  
                  <div className="cart-item-footer" style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="cart-item-price" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--green-dark)' }}>
                      ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      className="btn btn-primary"
                      onClick={() => onMoveToCart(item)}
                      style={{ 
                        padding: '0.45rem 0.9rem', 
                        fontSize: '0.7rem', 
                        letterSpacing: '0.05em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fa-solid fa-bag-shopping"></i> Add to Bag
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
