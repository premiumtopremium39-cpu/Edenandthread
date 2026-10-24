import React, { useState } from 'react';
import { newsletterService } from '../lib/supabase';

export default function NewsletterSignup({ onSubscribe }) {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubscribed(true);
    try {
      await newsletterService.subscribe(email.trim());
    } catch (err) {
      console.warn('[Newsletter Supabase Notice]:', err.message);
    }
    if (onSubscribe) {
      onSubscribe(email.trim());
    }
  };

  return (
    <section className="newsletter-section" id="newsletter">
      <div className="newsletter-container">
        <span className="letter-meta">Special Invitation</span>
        <h2>Get 10% Off Your First Order</h2>
        <p>Subscribe for free to get an instant 10% discount on your first linen shirt, plus early access to new summer drops.</p>
        
        {!isSubscribed ? (
          <form className="newsletter-form" id="newsletterForm" onSubmit={handleSubmit}>
            <input 
              type="email" 
              placeholder="Enter your email address" 
              required 
              aria-label="Email Address" 
              id="newsletterEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="newsletter-btn">
              Get 10% Off <i className="fa-solid fa-arrow-right"></i>
            </button>
          </form>
        ) : (
          <p className="form-feedback success-msg" id="newsletterSuccess" style={{ display: 'block' }}>
            Thank you! Use code <strong>EDEN10</strong> at checkout for 10% off.
          </p>
        )}
      </div>
    </section>
  );
}
