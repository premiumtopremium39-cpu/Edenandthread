import React from 'react';
import HeroSlider from '../components/HeroSlider';
import BrandIntro from '../components/BrandIntro';
import CategoryGrid from '../components/CategoryGrid';
import ProductList from '../components/ProductList';
import BrandValues from '../components/BrandValues';
import NewsletterSignup from '../components/NewsletterSignup';

export default function HomePage({ 
  products = [],
  activeCategory,
  onCategoryChange,
  sortOption,
  onSortChange,
  searchQuery,
  onQuickView,
  onQuickAdd,
  wishlist = [],
  onToggleWishlist,
  onSubscribe 
}) {
  return (
    <>
      <HeroSlider />
      <CategoryGrid onCategorySelect={(cat) => {
        if (onCategoryChange) onCategoryChange(cat);
        const shopSection = document.getElementById('shop');
        if (shopSection) {
          shopSection.scrollIntoView({ behavior: 'smooth' });
        }
      }} />
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
      <BrandIntro />
      <BrandValues />
      <NewsletterSignup onSubscribe={onSubscribe} />
    </>
  );
}
