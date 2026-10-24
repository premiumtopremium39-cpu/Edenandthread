import React, { useState, useEffect, useRef } from 'react';

import BrandLogo from './BrandLogo';

export default function Header({ 
  cartCount, 
  wishlistCount = 0,
  onCartClick, 
  onWishlistClick,
  onSearchClick, 
  user, 
  onLogout 
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const [currentHash, setCurrentHash] = useState(() => typeof window !== 'undefined' ? window.location.hash : '');

  useEffect(() => {
    const handleHash = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const isHomePage = currentHash === '' || currentHash === '#' || currentHash === '#collections';
  const isHeaderSolid = isScrolled || !isHomePage;

  return (
    <header 
      className={isHeaderSolid ? 'scrolled' : ''} 
      id="main-header"
      style={!isHomePage ? { backgroundColor: 'var(--white)', borderBottom: '1px solid var(--border-light)', top: 0, boxShadow: '0 2px 10px rgba(10, 28, 21, 0.04)' } : {}}
    >
      <div className="header-container">
        <button 
          className="mobile-nav-toggle" 
          aria-label="Toggle navigation menu" 
          id="mobileMenuBtn"
          onClick={toggleMobileMenu}
        >
          <i className={isMobileMenuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars-staggered"}></i>
        </button>

        <div className="logo">
          <a href="#" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <BrandLogo variant="header" size={isScrolled ? 34 : 40} />
          </a>
        </div>

        <nav className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`} id="navMenu">
          <a href="#collections" className="nav-link" onClick={handleNavLinkClick}>Collections</a>
          <a href="#shop" className="nav-link" onClick={handleNavLinkClick}>Shop</a>
          <a href="#story" className="nav-link" onClick={handleNavLinkClick}>Our Story</a>
          <a href="#journal" className="nav-link" onClick={handleNavLinkClick}>Journal</a>
          <a href="#track" className="nav-link" onClick={handleNavLinkClick} style={{ 
            color: 'var(--accent)', 
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}>
            <i className="fa-solid fa-location-dot" style={{ fontSize: '0.75rem' }}></i> Track Order
          </a>
        </nav>

        <div className="header-actions">
          {/* Search Trigger */}
          <button 
            className="action-btn search-trigger" 
            aria-label="Search" 
            id="searchBtn"
            onClick={onSearchClick}
          >
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>

          {/* Wishlist Trigger */}
          <button 
            className="action-btn wishlist-trigger" 
            aria-label="Saved items" 
            id="wishlistToggleBtn"
            onClick={onWishlistClick}
            style={{ position: 'relative' }}
          >
            <i className="fa-regular fa-heart"></i>
            {wishlistCount > 0 && (
              <span className="cart-badge" id="wishlistBadgeCount" style={{ backgroundColor: 'var(--gold)', color: 'var(--green-dark)' }}>
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart Trigger */}
          <button 
            className="action-btn cart-trigger" 
            aria-label="Cart" 
            id="cartToggleBtn"
            onClick={onCartClick}
          >
            <i className="fa-solid fa-bag-shopping"></i>
            <span className="cart-badge" id="cartBadgeCount">{cartCount}</span>
          </button>

          {/* User Authentication Trigger */}
          {user ? (
            <div className="profile-dropdown-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={dropdownRef}>
              <button 
                className="action-btn profile-trigger" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-label="User Account"
                style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--green-light)', 
                  color: 'var(--green-dark)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 700, 
                  fontSize: '0.75rem',
                  border: '1px solid var(--border-medium)',
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                {getUserInitials(user.name)}
              </button>
              {isDropdownOpen && (
                <div className="profile-dropdown" style={{ 
                  position: 'absolute', 
                  top: '130%', 
                  right: 0, 
                  backgroundColor: 'var(--glass-bg)', 
                  border: '1px solid var(--border-light)', 
                  boxShadow: 'var(--shadow-soft)', 
                  padding: '1.25rem 1.5rem', 
                  minWidth: '220px', 
                  zIndex: 150,
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>{user.name}</h4>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', wordBreak: 'break-all' }}>{user.email}</p>
                  <ul style={{ display: 'grid', gap: '0.6rem', fontSize: '0.8rem', color: 'var(--text-secondary)', listStyle: 'none', padding: 0, margin: 0 }}>
                    <li>
                      <a href="#track" onClick={() => setIsDropdownOpen(false)} style={{ display: 'block', transition: 'var(--transition-fast)', color: 'var(--green-dark)', fontWeight: 600 }}>
                        <i className="fa-solid fa-plane-departure" style={{ marginRight: '0.5rem', width: '14px' }}></i> Track Orders &amp; History
                      </a>
                    </li>
                    <li>
                      <a href="#checkout" onClick={() => setIsDropdownOpen(false)} style={{ display: 'block', transition: 'var(--transition-fast)' }}>
                        <i className="fa-solid fa-credit-card" style={{ marginRight: '0.5rem', width: '14px' }}></i> Saved Checkout Info
                      </a>
                    </li>
                    {user?.role === 'admin' && (
                      <li>
                        <a href="#admin" onClick={() => setIsDropdownOpen(false)} style={{ display: 'block', transition: 'var(--transition-fast)', color: 'var(--gold-dark)', fontWeight: 600 }}>
                          <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.5rem', width: '14px' }}></i> Executive Admin
                        </a>
                      </li>
                    )}
                    <li style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                      <button 
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onLogout();
                        }}
                        style={{ 
                          color: 'var(--text-secondary)', 
                          fontWeight: 600, 
                          fontSize: '0.8rem', 
                          width: '100%', 
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0,
                          transition: 'var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                      >
                        <i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: '0.5rem', width: '14px' }}></i> Sign Out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <a 
              href="#login" 
              className="action-btn auth-trigger" 
              aria-label="Sign In"
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <i className="fa-regular fa-user"></i>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
