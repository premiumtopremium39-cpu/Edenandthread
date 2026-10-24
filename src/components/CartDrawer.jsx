import React from 'react';
import { handleImageError, DEFAULT_FALLBACK_IMAGE } from '../utils/productViews';

export default function CartDrawer({ 
  isOpen, 
  onClose, 
  cartItems, 
  onAdjustQty, 
  onRemoveItem, 
  onCheckout 
}) {
  const totalQty = cartItems.reduce((acc, item) => acc + item.qty, 0);
  const subtotalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const shippingThreshold = 1500;

  const handleBrowseCollection = (e) => {
    e.preventDefault();
    onClose();
    const shopSection = document.getElementById('shop');
    if (shopSection) {
      shopSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div 
        className={`cart-drawer-overlay ${isOpen ? 'active' : ''}`} 
        id="cartDrawerOverlay"
        onClick={onClose}
      ></div>
      <aside 
        className={`cart-drawer ${isOpen ? 'active' : ''}`} 
        id="cartDrawer" 
        aria-hidden={!isOpen} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="cartTitle"
      >
        <div className="cart-drawer-header">
          <h3 id="cartTitle">Your Bag (<span id="cartCountTitle">{totalQty}</span>)</h3>
          <button 
            className="close-cart-btn" 
            id="closeCartBtn" 
            aria-label="Close cart drawer"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Empty state */}
        {cartItems.length === 0 ? (
          <div className="cart-empty-state" id="cartEmptyState" style={{ display: 'flex' }}>
            <i className="fa-solid fa-basket-shopping empty-icon"></i>
            <p>Your shopping bag is currently empty.</p>
            <a 
              href="#shop" 
              className="btn btn-secondary close-cart-link"
              onClick={handleBrowseCollection}
            >
              Browse Collection
            </a>
          </div>
        ) : (
          <>
            {/* Cart items list */}
            <div className="cart-items-container" id="cartItemsList" style={{ display: 'block' }}>
              {cartItems.map((item, index) => (
                <div key={`${item.id}-${item.color}-${item.size}`} className="cart-item">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="cart-item-img" 
                    onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
                  />
                  <div className="cart-item-details">
                    <div className="cart-item-header">
                      <h4 className="cart-item-title">{item.title}</h4>
                      <button 
                        className="cart-item-remove" 
                        onClick={() => onRemoveItem(index)} 
                        aria-label="Remove item"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                    <p className="cart-item-variant">{item.color} / {item.size}</p>
                    <div className="cart-item-footer">
                      <div className="quantity-controller">
                        <button 
                          className="qty-btn" 
                          onClick={() => onAdjustQty(index, -1)} 
                          aria-label="Decrease quantity"
                        >
                          <i className="fa-solid fa-minus"></i>
                        </button>
                        <span className="qty-val">{item.qty}</span>
                        <button 
                          className="qty-btn" 
                          onClick={() => onAdjustQty(index, 1)} 
                          aria-label="Increase quantity"
                        >
                          <i className="fa-solid fa-plus"></i>
                        </button>
                      </div>
                      <span className="cart-item-price">
                        ₹{(item.price * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart footer (totals and checkout) */}
            <div className="cart-drawer-footer" id="cartDrawerFooter" style={{ display: 'block' }}>
              <div className="summary-line">
                <span>Subtotal</span>
                <span className="summary-val" id="cartSubtotal">
                  ₹{subtotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="summary-line text-muted">
                <span>Shipping & taxes</span>
                <span className="summary-val">Calculated at checkout</span>
              </div>
              
              {/* Free Shipping Progress Indicator */}
              <div className="free-shipping-promo" id="shippingPromo" style={{ textAlign: 'left', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 600 }}>
                  <span>
                    {subtotalAmount >= shippingThreshold ? (
                      <span style={{ color: 'var(--green-dark)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-circle-check" style={{ color: 'var(--gold)' }}></i> Free Express Shipping Unlocked!
                      </span>
                    ) : (
                      <>Add <strong>₹{(shippingThreshold - subtotalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> for Free Express Shipping</>
                    )}
                  </span>
                  <span style={{ color: 'var(--gold-dark)', fontWeight: 700 }}>
                    {Math.min(100, Math.round((subtotalAmount / shippingThreshold) * 100))}%
                  </span>
                </div>
                {/* Visual Bar */}
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--green-surface)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${Math.min(100, Math.round((subtotalAmount / shippingThreshold) * 100))}%`, 
                      height: '100%', 
                      backgroundColor: subtotalAmount >= shippingThreshold ? 'var(--green-dark)' : 'var(--gold)',
                      transition: 'width 0.4s ease'
                    }}
                  ></div>
                </div>
              </div>
              
              <button 
                className="checkout-btn" 
                id="checkoutBtn"
                onClick={onCheckout}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
