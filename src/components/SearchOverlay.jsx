import React, { useEffect, useRef } from 'react';
import { handleImageError, DEFAULT_FALLBACK_IMAGE } from '../utils/productViews';

export default function SearchOverlay({ 
  isOpen, 
  onClose, 
  searchQuery, 
  onSearchChange,
  products = [],
  onProductClick
}) {
  const inputRef = useRef(null);

  const POPULAR_TAGS = ["White Linen", "Spread Collar", "Band Collar", "Camp Collar", "Riviera Popover", "Overshirt"];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        onClose();
        const shopSection = document.getElementById('shop');
        if (shopSection) {
          shopSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const matchingProducts = searchQuery.trim() ? products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className={`search-overlay ${isOpen ? 'active' : ''}`} id="searchOverlay">
      <button className="close-search" id="closeSearchBtn" onClick={onClose} aria-label="Close search">
        <i className="fa-solid fa-xmark"></i>
      </button>
      
      <div className="search-container" style={{ maxWidth: '750px', width: '90%' }}>
        <input 
          type="text" 
          placeholder="Search linen shirts, collars, colors..." 
          id="searchInput"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          ref={inputRef}
          style={{ width: '100%', fontSize: '1.75rem', paddingBottom: '0.75rem' }}
        />
        <span className="search-line"></span>
        
        {/* Popular Tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.5rem', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            Popular Searches:
          </span>
          {POPULAR_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => onSearchChange(tag)}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                padding: '0.3rem 0.75rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--green-dark)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Live Matching Results */}
        {searchQuery.trim() && (
          <div style={{ marginTop: '2rem', textAlign: 'left', maxHeight: '350px', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.4rem' }}>
              Matching Garments ({matchingProducts.length})
            </div>
            {matchingProducts.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem 0' }}>
                No shirts matched "{searchQuery}". Try searching for "Spread Collar", "Band Collar", or "White".
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {matchingProducts.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      onClose();
                      if (onProductClick) onProductClick(item.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#fff',
                      border: '1px solid var(--border-light)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
                  >
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      style={{ width: '48px', height: '48px', objectFit: 'cover' }} 
                      onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--green-dark)', margin: 0 }}>{item.title}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.category?.replace('-', ' ')} &bull; {item.badge}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--green-dark)' }}>
                      ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="search-tips" style={{ marginTop: '2rem' }}>Press ENTER to view all in store &bull; ESC to close</p>
      </div>
    </div>
  );
}
