import React from 'react';

const CATEGORIES = [
  {
    key: "with-pocket",
    title: "With Pocket",
    subtitle: "Classic functional pocket & tailored spread collar",
    image: "https://fkkfzmydaascwthtonsi.supabase.co/storage/v1/object/public/garment-photos/categories/with_collar.avif",
    position: "center 12%"
  },
  {
    key: "without-pocket",
    title: "Without Pocket",
    subtitle: "Clean seamless chest & refined minimalist drape",
    image: "https://fkkfzmydaascwthtonsi.supabase.co/storage/v1/object/public/garment-photos/categories/without_collar.avif",
    position: "center 12%"
  },
  {
    key: "accessories",
    title: "Accessories",
    subtitle: "Handcrafted linen essentials, stoles & accessories",
    image: "https://fkkfzmydaascwthtonsi.supabase.co/storage/v1/object/public/garment-photos/categories/accessories_luxury_essentials.avif",
    position: "center center"
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
              <div 
                className="card-bg" 
                style={{ 
                  backgroundImage: `url('${cat.image}')`,
                  backgroundPosition: cat.position || 'center top'
                }}
              ></div>
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
