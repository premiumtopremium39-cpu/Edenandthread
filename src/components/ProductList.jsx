import React from 'react';
import ProductCard from './ProductCard';

const FILTER_TABS = [
  { label: "All Linen", value: "all" },
  { label: "Spread Collar", value: "spread-collar" },
  { label: "Band Collar", value: "band-collar" },
  { label: "Camp Collar", value: "camp-collar" },
  { label: "Popover", value: "popover" },
  { label: "Tailored Fit", value: "tailored-fit" }
];

export default function ProductList({ 
  products, 
  activeCategory, 
  onCategoryChange, 
  sortOption, 
  onSortChange, 
  searchQuery, 
  onQuickView, 
  onQuickAdd,
  wishlist = [],
  onToggleWishlist
}) {
  // 1. Filter products
  const filteredProducts = products.filter(p => {
    // Category filter
    let matchesCategory = false;
    if (activeCategory === 'all' || !activeCategory) {
      matchesCategory = true;
    } else {
      matchesCategory = p.category === activeCategory;
    }

    // Search filter
    const matchesSearch = !searchQuery || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // 2. Sort products
  const sortedProducts = [...filteredProducts];
  if (sortOption === "price-low") {
    sortedProducts.sort((a, b) => a.price - b.price);
  } else if (sortOption === "price-high") {
    sortedProducts.sort((a, b) => b.price - a.price);
  }

  const activeTabValue = activeCategory || 'all';

  return (
    <section className="shop-section container" id="shop">
      <div className="section-header flex-header">
        <div>
          <h2 className="section-title">The Collection</h2>
          <p className="section-subtitle">Meticulously constructed pieces to form your uniform.</p>
        </div>
        
        {/* Filters and Sort */}
        <div className="shop-controls">
          <div className="filter-tabs">
            {FILTER_TABS.map(tab => (
              <button 
                key={tab.value}
                className={`filter-btn ${activeTabValue === tab.value ? 'active' : ''}`}
                onClick={() => onCategoryChange(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="sort-dropdown">
            <label htmlFor="sortSelect" className="sr-only">Sort products</label>
            <select 
              id="sortSelect" 
              aria-label="Sort products"
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value)}
            >
              <option value="default">Sort by: Default</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <i className="fa-solid fa-chevron-down dropdown-icon"></i>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="product-grid" id="productGrid">
        {sortedProducts.length === 0 ? (
          <div className="no-products">
            <p>No items match your criteria. Let's try another search or filter.</p>
          </div>
        ) : (
          sortedProducts.map(product => (
            <ProductCard 
              key={product.id}
              product={product}
              onQuickView={onQuickView}
              onQuickAdd={onQuickAdd}
              isWishlisted={wishlist.includes(product.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))
        )}
      </div>
    </section>
  );
}
