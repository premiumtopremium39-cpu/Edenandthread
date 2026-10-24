import React from 'react';

const CATEGORIES = [
  {
    key: "spread-collar",
    title: "Italian Spread Collar",
    subtitle: "Sharp style for dinners & daily smart wear",
    image: "/assets/shirt_front.png"
  },
  {
    key: "band-collar",
    title: "Portofino Band Collar",
    subtitle: "Clean collarless look for relaxed weekends",
    image: "/assets/set1/front.png"
  },
  {
    key: "camp-collar",
    title: "Capri Camp Collar",
    subtitle: "Open relaxed collar for hot sunny days",
    image: "/assets/set2/front.png"
  },
  {
    key: "popover",
    title: "Riviera Popover",
    subtitle: "Easy slip-on style for beach & travel",
    image: "/assets/mens_linen_shirt.png"
  }
];

export default function CategoryGrid({ onCategorySelect }) {
  const handleClick = (categoryKey) => {
    onCategorySelect(categoryKey);
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
          <p className="section-subtitle">Four classic linen shirt styles designed for every warm day.</p>
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
