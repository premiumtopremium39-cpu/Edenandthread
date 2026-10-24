import React from 'react';
import ProductList from '../components/ProductList';

export default function ShopPage({ 
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
  return (
    <div style={{ paddingTop: '110px', paddingBottom: '60px' }}>
      <div className="container" style={{ marginBottom: '1.25rem' }}>
        <nav style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          <a href="#" style={{ color: 'inherit' }}>Home</a>
          <span style={{ margin: '0 0.5rem' }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Shop Collection</span>
        </nav>
      </div>
      <ProductList 
        products={products}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
        sortOption={sortOption}
        onSortChange={onSortChange}
        searchQuery={searchQuery}
        onQuickView={onQuickView}
        onQuickAdd={onQuickAdd}
        wishlist={wishlist}
        onToggleWishlist={onToggleWishlist}
      />
    </div>
  );
}
