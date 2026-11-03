import React from 'react';

const CATEGORIES = [
  {
    key: "with-collar",
    title: "With Collar",
    subtitle: "Classic spread & camp collar tailored shirts",
    image: "/assets/shirt_front.png"
  },
  {
    key: "without-collar",
    title: "Without Collar",
    subtitle: "Band collar & relaxed popover silhouettes",
    image: "/assets/set1/front.png"
  },
  {
    key: "accessories",
    title: "Accessories",
    subtitle: "Curated linen pocket squares, stoles & bags",
    image: "/assets/mens_linen_blazer.png"
  }
];

export default function CategoryGrid({ onCategorySelect }) {
  const handleClick = (categoryKey) => {
    if (onCategorySelect) {
      onCategorySelect(categoryKey);
    }
    const shopSection = document.getElementById('shop');
    if (shopSection) {
      shopSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="collections-section" id="collections">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Choose Your Style</h2>
          <p className="section-subtitle">Curated linen styles and artisanal essentials designed for every warm day.</p>
        </div>
        <div className="collections-grid">
          {CATEGORIES.map((cat) => (
            <div 
              key={cat.key} 
              className="collection-card" 
              onClick={() => handleClick(cat.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClick(cat.key);
                }
              }}
            >
              <div className="card-bg" style={{ backgroundImage: `url('${cat.image}')` }}></div>
              <div className="card-overlay"></div>
              <div className="card-info">
                <h3>{cat.title}</h3>
                <span style={{ 
                  fontSize: '0.75rem', 
                  opacity: 0.85, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em', 
                  display: 'block', 
                  marginTop: '-0.25rem', 
                  marginBottom: '0.5rem' 
                }}>
                  {cat.subtitle}
                </span>
                <span className="card-link">
                  View Collection <i className="fa-solid fa-arrow-right-long"></i>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
