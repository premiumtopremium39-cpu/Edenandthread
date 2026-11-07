import React, { useEffect } from 'react';
import HeroSlider from '../components/HeroSlider';
import BrandIntro from '../components/BrandIntro';
import CategoryGrid from '../components/CategoryGrid';
import ProductList from '../components/ProductList';
import BrandValues from '../components/BrandValues';
import NewsletterSignup from '../components/NewsletterSignup';
import { updatePageSeo } from '../utils/seoHelper';

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
  useEffect(() => {
    updatePageSeo({
      title: 'Eden & Thread | Luxury Pure Organic Linen Apparel & Essentials',
      description: 'Discover Eden & Thread. Modern luxury menswear crafted from 100% pure organic European flax. Explore classic spread collar and band collar linen shirts with free delivery in India.',
      canonicalUrl: 'https://edenandthread.com/'
    });
  }, []);
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
