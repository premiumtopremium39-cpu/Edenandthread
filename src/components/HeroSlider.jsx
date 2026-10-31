import React, { useState, useEffect, useCallback } from 'react';

const SLIDES = [
  {
    webpImage: "/assets/hero_lifestyle_collection.webp",
    jpgImage: "/assets/hero_lifestyle_collection.jpg",
    alt: "Explore Collections - Eden & Thread",
    linkHref: "#shop"
  },
  {
    webpImage: "/assets/hero_curated_essentials.webp",
    jpgImage: "/assets/hero_curated_essentials.jpg",
    alt: "Curated Everyday Essentials - Eden & Thread",
    linkHref: "#shop"
  }
];

export default function HeroSlider() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Autoplay
  useEffect(() => {
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  return (
    <section className="hero-section" id="hero">
      <div className="hero-slider" id="heroSlider">
        {SLIDES.map((slide, index) => (
          <a
            key={index}
            href={slide.linkHref}
            className={`hero-slide ${index === activeIndex ? 'active' : ''}`}
            aria-label={slide.alt}
            style={{ 
              backgroundImage: `image-set(url('${slide.webpImage}') type('image/webp'), url('${slide.jpgImage}') type('image/jpeg'))`,
              cursor: 'pointer',
              display: 'block',
              textDecoration: 'none'
            }}
          />
        ))}
      </div>

      {/* Slider Nav */}
      <div className="slider-controls">
        <button 
          className="control-btn prev-btn" 
          id="prevSlide" 
          aria-label="Previous slide" 
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <button 
          className="control-btn next-btn" 
          id="nextSlide" 
          aria-label="Next slide" 
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <div className="slider-dots" id="sliderDots">
        {SLIDES.map((_, index) => (
          <span 
            key={index}
            className={`dot ${index === activeIndex ? 'active' : ''}`} 
            data-index={index}
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(index);
            }}
          ></span>
        ))}
      </div>
    </section>
  );
}
