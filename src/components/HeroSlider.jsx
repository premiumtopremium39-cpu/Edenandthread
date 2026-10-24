import React, { useState, useEffect, useCallback } from 'react';

const SLIDES = [
  {
    subtitle: "Welcome to Eden & Thread",
    title: "Style Woven into Everyday Life.",
    desc: "At Eden & Thread, we believe that true fashion lives at the intersection of modern versatility, effortless comfort, and lasting quality.",
    bgImage: "/assets/hero_lifestyle_collection.jpg",
    linkText: "Explore Collections",
    linkHref: "#shop"
  },
  {
    subtitle: "Curated Everyday Essentials",
    title: "Crafted for Comfort. Designed for Your Life.",
    desc: "From crisp men’s shirts and tailored pants to everyday casual denim and dynamic women's wear—designed to fit your rhythm.",
    bgImage: "/assets/hero_curated_essentials.jpg",
    linkText: "Shop The Collection",
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
          <div 
            key={index}
            className={`hero-slide ${index === activeIndex ? 'active' : ''}`} 
            style={{ 
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.55)), url('${slide.bgImage}')` 
            }}
          >
            <div className="hero-content">
              <span className="subtitle">{slide.subtitle}</span>
              <h1 className="title">{slide.title}</h1>
              <p className="desc">{slide.desc}</p>
              <a href={slide.linkHref} className="btn btn-primary">{slide.linkText}</a>
            </div>
          </div>
        ))}
      </div>

      {/* Slider Nav */}
      <div className="slider-controls">
        <button className="control-btn prev-btn" id="prevSlide" aria-label="Previous slide" onClick={prevSlide}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <button className="control-btn next-btn" id="nextSlide" aria-label="Next slide" onClick={nextSlide}>
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <div className="slider-dots" id="sliderDots">
        {SLIDES.map((_, index) => (
          <span 
            key={index}
            className={`dot ${index === activeIndex ? 'active' : ''}`} 
            data-index={index}
            onClick={() => setActiveIndex(index)}
          ></span>
        ))}
      </div>
    </section>
  );
}
