import React from 'react';
import BrandLogo from './BrandLogo';

export default function BrandIntro() {
  return (
    <section className="brand-intro container">
      <div className="intro-grid">
        <div className="intro-text">
          <span style={{ 
            fontSize: '0.75rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.2em', 
            color: 'var(--gold-dark)', 
            fontWeight: 700, 
            display: 'block', 
            marginBottom: '1rem' 
          }}>
            Welcome to Eden &amp; Thread
          </span>
          <h2 className="section-title-serif">Style Woven into Everyday Life</h2>
          <p className="lead-para">Every great style journey begins with a vision. At Eden &amp; Thread, we believe that true fashion lives at the intersection of modern versatility, effortless comfort, and lasting quality.</p>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7 }}>
            Our story started with a simple passion: to curate a clothing destination where updating your everyday wardrobe feels natural, inspiring, and accessible. Whether you are looking for crisp men’s shirts, perfectly tailored pants, everyday casual denim, or dynamic women’s wear—from effortless kurtis and essential leggings to modern track pants—Eden &amp; Thread is designed to fit your rhythm.
          </p>
        </div>

        <div className="intro-emblem-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem 0' }}>
          <BrandLogo variant="circle" size={190} />
        </div>

        <div className="intro-stats">
          <div className="stat-card">
            <span className="stat-num">Curated</span>
            <span className="stat-lbl">Everyday Essentials</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">100%</span>
            <span className="stat-lbl">Quality You Feel</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">All-Day</span>
            <span className="stat-lbl">Modern Versatility</span>
          </div>
        </div>
      </div>
    </section>
  );
}
