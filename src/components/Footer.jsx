import React from 'react';
import BrandLogo from './BrandLogo';

export default function Footer({ onCategoryChange }) {
  const handleNavClick = (e, hash, cat = null) => {
    e.preventDefault();
    if (cat && onCategoryChange) {
      onCategoryChange(cat);
    }
    if (window.location.hash === hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } else {
      window.location.hash = hash;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  return (
    <footer className="footer">
      <div className="container">
        {/* Luxury Value Pillars Ribbon */}
        <div className="footer-values-bar">
          <div className="footer-value-card">
            <div className="footer-value-icon">
              <i className="fa-solid fa-scissors"></i>
            </div>
            <div className="footer-value-content">
              <h5>Craftsmanship</h5>
              <p>Quality fabrics &amp; careful stitching in every piece.</p>
            </div>
          </div>

          <div className="footer-value-card">
            <div className="footer-value-icon">
              <i className="fa-solid fa-compass"></i>
            </div>
            <div className="footer-value-content">
              <h5>Everyday Style</h5>
              <p>Versatile designs crafted for modern living.</p>
            </div>
          </div>

          <div className="footer-value-card">
            <div className="footer-value-icon">
              <i className="fa-solid fa-truck-fast"></i>
            </div>
            <div className="footer-value-content">
              <h5>Customer First</h5>
              <p>Curated selection brought straight to your doorstep.</p>
            </div>
          </div>
        </div>

        {/* Balanced 4-Column Navigation Grid */}
        <div className="footer-grid">
          {/* Col 1: Brand & Social */}
          <div className="footer-col brand-col">
            <a href="#" onClick={(e) => handleNavClick(e, '#')} className="footer-logo" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', marginBottom: '1.25rem' }}>
              <BrandLogo variant="footer" size={44} />
            </a>
            <p className="footer-about">
              Style Woven into Everyday Life. Modern versatility, effortless comfort, and lasting quality designed to fit your rhythm.
            </p>
            <div className="social-links">
              <a href="https://wa.me/919677127882" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Support" title="WhatsApp (+91 96771 27882)"><i className="fa-brands fa-whatsapp"></i></a>
              <a href="tel:+919677127882" aria-label="Phone Support" title="Call Us (+91 96771 27882)"><i className="fa-solid fa-phone"></i></a>
              <a href="#" aria-label="Instagram"><i className="fa-brands fa-instagram"></i></a>
              <a href="#" aria-label="Pinterest"><i className="fa-brands fa-pinterest-p"></i></a>
            </div>
          </div>

          {/* Col 2: Collections */}
          <div className="footer-col">
            <h4>Collections</h4>
            <ul>
              <li><a href="#shop" onClick={(e) => handleNavClick(e, '#shop', 'all')}>All Collections</a></li>
              <li><a href="#shop" onClick={(e) => handleNavClick(e, '#shop', 'spread-collar')}>Men's Linen Shirts</a></li>
              <li><a href="#shop" onClick={(e) => handleNavClick(e, '#shop', 'mandarin-collar')}>Tailored Trousers &amp; Denim</a></li>
              <li><a href="#shop" onClick={(e) => handleNavClick(e, '#shop', 'cuban-camp')}>Women's Dynamic Wear</a></li>
              <li><a href="#shop" onClick={(e) => handleNavClick(e, '#shop', 'all')}>New Season Arrivals</a></li>
            </ul>
          </div>

          {/* Col 3: Client Services */}
          <div className="footer-col">
            <h4>Client Services</h4>
            <ul>
              <li>
                <a href="#track" onClick={(e) => handleNavClick(e, '#track')} style={{ color: 'var(--accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <i className="fa-solid fa-location-dot" style={{ fontSize: '0.75rem' }}></i> Track Your Order
                </a>
              </li>
              <li><a href="#story" onClick={(e) => handleNavClick(e, '#story')}>About Us &amp; Our Story</a></li>
              <li><a href="#journal" onClick={(e) => handleNavClick(e, '#journal')}>Garment Care Journal</a></li>
              <li><a href="#checkout" onClick={(e) => handleNavClick(e, '#checkout')}>Shipping &amp; Deliveries</a></li>
              <li><a href="#checkout" onClick={(e) => handleNavClick(e, '#checkout')}>Returns &amp; Exchanges</a></li>
            </ul>
          </div>

          {/* Col 4: Flagship Atelier */}
          <div className="footer-col">
            <h4>Flagship Atelier</h4>
            <p className="footer-address">
              No. 7, Ground Floor, Pasumpon Nagar,<br />
              Vedagiri Street, Pammal,<br />
              Chennai - 600075, Tamil Nadu.
            </p>
            <div className="footer-contact-list">
              <a href="https://wa.me/919677127882" target="_blank" rel="noopener noreferrer" className="footer-contact-item">
                <i className="fa-brands fa-whatsapp"></i>
                <span>+91 96771 27882</span>
              </a>
              <a href="mailto:contact@edenandthread.com" className="footer-contact-item">
                <i className="fa-regular fa-envelope"></i>
                <span>contact@edenandthread.com</span>
              </a>
              <div className="footer-hours">
                <i className="fa-regular fa-clock"></i>
                <span>Mon &ndash; Sat &bull; 9:30 AM &ndash; 7:30 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <p>&copy; 2026 EDEN <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400 }}>&amp;</span> THREAD. All rights reserved.</p>
          <div className="footer-badges">
            <span>Pure Natural Fabrics</span>
            <span>&bull;</span>
            <span>Secure Checkout</span>
            <span>&bull;</span>
            <span>Express Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
