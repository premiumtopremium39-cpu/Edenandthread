import React from 'react';

export default function BrandValues() {
  return (
    <section className="brand-values" id="brand-values">
      <div className="container-full">
        <div className="values-grid">
          <div className="values-img-panel" style={{ backgroundImage: `url('/assets/mens_linen_editorial.jpeg')` }}></div>
          <div className="values-text-panel">
            <span className="panel-meta">The Pieces That Matter Most</span>
            <h2 className="panel-title">Crafted for Comfort. Designed for Your Life.</h2>
            <p className="panel-desc">Eden &amp; Thread isn't just about clothes; it’s about expressing who you are with confidence, ease, and simplicity.</p>
            
            <div className="promises-list">
              <div className="promise-item">
                <div className="promise-icon"><i className="fa-solid fa-shirt"></i></div>
                <div className="promise-content">
                  <h4>Curated Essentials</h4>
                  <p>Designed with contemporary fits and premium fabrics built for all-day wear.</p>
                </div>
              </div>
              <div className="promise-item">
                <div className="promise-icon"><i className="fa-solid fa-compass"></i></div>
                <div className="promise-content">
                  <h4>Modern Versatility</h4>
                  <p>Effortlessly transition from work to relaxed weekends without missing a beat.</p>
                </div>
              </div>
              <div className="promise-item">
                <div className="promise-icon"><i className="fa-solid fa-gem"></i></div>
                <div className="promise-content">
                  <h4>Quality You Feel</h4>
                  <p>Every seam, stitch, and thread is chosen with comfort and longevity in mind.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
