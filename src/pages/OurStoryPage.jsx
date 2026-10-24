import React from 'react';
import BrandLogo from '../components/BrandLogo';

export default function OurStoryPage() {
  return (
    <div style={{ paddingTop: '110px', paddingBottom: '60px' }} className="our-story-page">
      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-block', marginBottom: '1.25rem' }}>
            <BrandLogo variant="circle" size={145} />
          </div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.75rem' }}>
            About Us
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 400, color: 'var(--green-dark)' }}>
            Crafted for Comfort. Designed for Your Life.
          </h1>
          <div style={{ width: '40px', height: '1px', backgroundColor: 'var(--accent)', margin: '1.5rem auto' }}></div>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6, fontWeight: 400 }}>
            "Style Woven into Everyday Life."
          </p>
        </div>

        {/* Editorial Visual Section */}
        <div style={{ position: 'relative', height: '450px', backgroundImage: "url('/assets/brand_values.png')", backgroundSize: 'cover', backgroundPosition: 'center', marginBottom: '4rem', border: '1px solid var(--border-light)' }}>
          <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', backgroundColor: 'var(--glass-bg)', padding: '1.5rem 2rem', backdropFilter: 'blur(10px)', border: '1px solid var(--border-light)', maxWidth: '420px' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Welcome to Eden &amp; Thread</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.5rem', lineHeight: 1.5, fontWeight: 500 }}>
              True fashion lives at the intersection of modern versatility, effortless comfort, and lasting quality.
            </p>
          </div>
        </div>

        {/* Content Paragraphs */}
        <div style={{ display: 'grid', gap: '3rem', lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--green-dark)', fontWeight: 400, marginBottom: '1rem', textTransform: 'none' }}>
              Welcome to Eden &amp; Thread
            </h2>
            <p>
              Every great style journey begins with a vision. At Eden &amp; Thread, we believe that true fashion lives at the intersection of modern versatility, effortless comfort, and lasting quality.
            </p>
            <p style={{ marginTop: '1rem' }}>
              Our story started with a simple passion: to curate a clothing destination where updating your everyday wardrobe feels natural, inspiring, and accessible. Whether you are looking for crisp men’s shirts, perfectly tailored pants, everyday casual denim, or dynamic women’s wear—from effortless kurtis and essential leggings to modern track pants—Eden &amp; Thread is designed to fit your rhythm.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', paddingTop: '2.5rem', paddingBottom: '2.5rem' }} className="story-stats-grid">
            <div>
              <div style={{ color: 'var(--gold-dark)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-scissors"></i>
              </div>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Craftsmanship
              </h3>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                Quality fabrics and careful stitching in every piece. Every seam, stitch, and thread is chosen with comfort and longevity in mind.
              </p>
            </div>
            <div>
              <div style={{ color: 'var(--gold-dark)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-compass"></i>
              </div>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Everyday Style
              </h3>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                Versatile designs crafted for modern living. Effortlessly transition from work to relaxed weekends without missing a beat.
              </p>
            </div>
            <div>
              <div style={{ color: 'var(--gold-dark)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-truck-fast"></i>
              </div>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Customer First
              </h3>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                A curated selection brought straight to your doorstep with confidence, ease, and simplicity.
              </p>
            </div>
          </div>

          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--green-dark)', fontWeight: 400, marginBottom: '1rem', textTransform: 'none' }}>
              Express Who You Are
            </h2>
            <p>
              Eden &amp; Thread isn't just about clothes; it’s about expressing who you are with confidence, ease, and simplicity.
            </p>
            <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--green-dark)', fontWeight: 600 }}>
              Welcome to our new home online. Welcome to Eden &amp; Thread.
            </p>
          </div>
        </div>

        {/* Studio Locations */}
        <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border-light)', paddingTop: '3.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Flagship Studios
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--green-dark)', fontWeight: 400, marginBottom: '2.5rem' }}>
            Global Atelier Locations
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }} className="story-locations-grid">
            {[
              { city: "Chennai (HQ)", address: "No. 7, Pasumpon Nagar, Vedagiri St, Pammal, Chennai - 600075", phone: "+91 96771 27882", image: "/assets/brand_values.png", desc: "Flagship Studio & Headquarters" },
              { city: "Milan", address: "Corso Como 10", image: "/assets/outerwear_blazer.png", desc: "Design Atelier & Salon" },
              { city: "Paris", address: "Rue de Charonne", image: "/assets/mens_linen_editorial.png", desc: "Textile Archive" },
              { city: "Tokyo", address: "Aoyama Minami-cho", image: "/assets/hero_banner_2.png", desc: "Concept Space" }
            ].map((loc) => (
              <div key={loc.city} style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', overflow: 'hidden', textAlign: 'left', transition: 'var(--transition-fast)' }} className="location-card">
                <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
                  <img src={loc.image} alt={`${loc.city} Atelier`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', backgroundColor: 'var(--glass-bg)', padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', backdropFilter: 'blur(8px)', border: '1px solid var(--border-light)' }}>
                    {loc.city}
                  </span>
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--green-dark)', marginBottom: '0.25rem' }}>{loc.city}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{loc.address}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{loc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
