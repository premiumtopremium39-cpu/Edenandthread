import React, { useEffect } from 'react';
import ProductList from '../components/ProductList';
import { updatePageSeo } from '../utils/seoHelper';

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
  useEffect(() => {
    const categoryName = activeCategory === 'all' 
      ? 'Pure Organic Linen Collection' 
      : `${activeCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Linen`;
    
    updatePageSeo({
      title: `${categoryName} | Eden & Thread Menswear`,
      description: `Explore Eden & Thread's luxury handcrafted linen collection. Pure European flax, tailored spread collars, mandarin collars, and lightweight summer essentials.`,
      canonicalUrl: 'https://edenandthread.com/shop'
    });
  }, [activeCategory]);

  return (
    <div style={{ paddingTop: '110px', paddingBottom: '60px' }}>
      <div className="container" style={{ marginBottom: '1.25rem' }}>
        <nav style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          <a href="#" style={{ color: 'inherit' }}>Home</a>
          <span style={{ margin: '0 0.5rem' }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Shop Collection</span>
        </nav>
        <header style={{ marginTop: '0.75rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', color: 'var(--text-primary)', margin: 0 }}>
            {activeCategory === 'all' ? "The Pure Linen Atelier Collection" : `${activeCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Linen Shirts`}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '720px', marginTop: '0.5rem' }}>
            Tailored from 100% certified organic European flax. Engineered with mother-of-pearl buttons and reinforced French seams for enduring warm-weather luxury.
          </p>
        </header>
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
