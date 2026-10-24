import React from 'react';

const ARTICLES = [
  {
    id: 1,
    title: "The Art of Linen Care: Washing, Drying, and Storing",
    category: "Atelier Care Guide",
    date: "August 4, 2026",
    summary: "Linen is one of the most durable natural fibers on earth. Woven from flax, it naturally softens and gains character over time when cared for properly. Discover the essential methods to washing, drying, and wrinkle management.",
    image: "/assets/mens_striped_linen_shirt.png",
    content: (
      <>
        <p>Linen is a noble material. Woven from traceably certified flax fibers, it naturally breathes, regulates temperature, and offers a comfortable texture. Unlike synthetic fibers, linen grows softer with every single wash cycle. However, preserving its structural form and rich organic dye density requires careful adherence to care guides.</p>
        
        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>1. Gentle Machine Washing</h4>
        <p>Always wash your linen shirts on a gentle or delicate cycle with cold water. Avoid hot wash cycles, which can cause organic linen fibers to shrink or weaken. Use mild, environment-friendly liquid detergents. Heavy bleaching detergents will break down the natural fibers and fade colors.</p>
        
        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>2. Air Drying</h4>
        <p>Tumble drying is highly stressful on linen and can lead to fabric jank and micro-tears. Instead, lay your garments flat on clean towels or hang them on wooden coat hangers to dry naturally in shade. Air drying preserves the weave density and helps reduce deep wrinkles.</p>
        
        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>3. Handling Wrinkles</h4>
        <p>Wrinkles are a natural characteristic of linen resort aesthetics and add to its relaxed charm. However, if you prefer a pressed classic look, iron your shirt while it is still damp using the medium-high steam setting on your iron. Ironing from the inside out will prevent fabric sheen.</p>
      </>
    )
  },
  {
    id: 2,
    title: "Capsule Wardrobes: The resort aesthetics of buying less but better",
    category: "Style Journal",
    date: "July 28, 2026",
    summary: "How to construct a minimalist resort capsule wardrobe that covers you for coastal holidays, weekend relaxation, and warm-weather business dinners. Eliminate the noise and build your linen uniform.",
    image: "/assets/mens_linen_sweater.png",
    content: (
      <>
        <p>Modern fashion encourages rapid turnover and impulse purchases, resulting in packed closets filled with synthetic garments that fail to survive a single season. A linen-based capsule wardrobe represents the perfect counter-culture: buying less, but selecting significantly better pieces.</p>
        
        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>1. The Foundation: Core Shirts</h4>
        <p>A minimalist collection starts with three key linen shirts: a pristine white Italian spread collar shirt for structured dining, a sky blue band collar shirt for casual leisure, and a neutral oatmeal Riviera popover shirt for resort comfort. These three items can be worn under structured suits or matched with shorts.</p>
        
        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>2. Versatile Trousers</h4>
        <p>Ditch heavy jeans and chinos during hot seasons. Structured linen trousers in olive green or charcoal offer the same level of sophistication as dress pants, but keep you cool. Match them with unstructured linen blazers for a smart-casual beach club aesthetic.</p>
        
        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>3. Mix and Match Coordination</h4>
        <p>By keeping a curated, earthy color palette (whites, oats, sky blues, olive greens, and charcoals), every item in your resort capsule can be matched with another. This makes dressing effortless and ensures your wardrobe captures the timeless elegance of visual excellence.</p>
      </>
    )
  },
  {
    id: 3,
    title: "Traceable Flax: From Normandy Fields to Milan Ateliers",
    category: "Atelier Heritage",
    date: "July 15, 2026",
    summary: "The journey of organic European flax. Why soil composition, coastal rainfall in northern France, and slow dew-retting create the world's strongest textile yarns.",
    image: "/assets/hero_banner.png",
    content: (
      <>
        <p>Textile quality begins in the soil. European flax requires zero artificial irrigation and minimal chemical treatments, relying instead on natural Atlantic rainfall and rich temperate loam along the Normandy coastline.</p>
        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>1. Dew Retting in Fields</h4>
        <p>Harvested flax stems are laid across fields where natural microorganisms separate long cellular bast fibers from woody cores. This ancient artisanal technique produces yarns with unmatched tensile strength.</p>
        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>2. Precision Milan Spinning</h4>
        <p>Our Milanese spinning partners transform raw fibers into uniform threads with high yarn density, giving EDEN & THREADS shirts their signature crisp drape and soft skin contact.</p>
      </>
    )
  },
  {
    id: 4,
    title: "Summer Uniforms: Transitioning From Coastal Days to Evenings",
    category: "Style Journal",
    date: "July 02, 2026",
    summary: "Styling advice on pairing camp collar linen shirts with tailored trousers and light outerwear for seamless Mediterranean sunset dining.",
    image: "/assets/mens_linen_blazer.png",
    content: (
      <>
        <p>Resort dressing demands effortless versatility. The same linen garment that keeps you cool during midday coastal walks should seamlessly carry you into evening candlelit terraces.</p>
        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>1. Layering with Texture</h4>
        <p>Layer an open camp collar shirt over an organic cotton tank, or slip on an unlined linen blazer over a band collar shirt as evening sea breezes pick up.</p>
        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--green-dark)' }}>2. Minimalist Footwear</h4>
        <p>Pair crisp linen trousers with suede espadrilles or leather loafers to complete a refined, understated summer silhouette.</p>
      </>
    )
  }
];

export default function JournalPage() {
  const [activeArticleId, setActiveArticleId] = React.useState(null);

  const handleReadClick = (id) => {
    setActiveArticleId(id);
    window.scrollTo(0, 0);
  };

  const activeArticle = ARTICLES.find(a => a.id === activeArticleId);

  return (
    <div style={{ paddingTop: '110px', paddingBottom: '60px' }} className="journal-page">
      <div className="container" style={{ maxWidth: activeArticle ? '800px' : '1000px' }}>
        
        {/* Detail View */}
        {activeArticle ? (
          <div>
            <button 
              onClick={() => setActiveArticleId(null)}
              style={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em', 
                color: 'var(--accent)', 
                borderBottom: '1px solid var(--accent)', 
                paddingBottom: '2px', 
                marginBottom: '2rem',
                cursor: 'pointer'
              }}
            >
              <i className="fa-solid fa-arrow-left-long" style={{ marginRight: '0.5rem' }}></i> Back to Journal
            </button>

            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
              {activeArticle.category} &bull; {activeArticle.date}
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--green-dark)', fontWeight: 400, marginBottom: '2rem', lineHeight: 1.2 }}>
              {activeArticle.title}
            </h1>

            <img 
              src={activeArticle.image} 
              alt={activeArticle.title} 
              style={{ width: '100%', height: '400px', objectFit: 'cover', border: '1px solid var(--border-light)', marginBottom: '3rem' }} 
            />

            <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '1rem' }} className="journal-article-body">
              {activeArticle.content}
            </div>
          </div>
        ) : (
          /* List View */
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.75rem' }}>
                Atelier Notes
              </span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 400, color: 'var(--green-dark)' }}>
                The Journal
              </h1>
              <div style={{ width: '40px', height: '1px', backgroundColor: 'var(--accent)', margin: '1.5rem auto' }}></div>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                Read about garment care, fabric design, and the aesthetics of reduction.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '3.5rem' }} className="journal-list">
              {ARTICLES.map((article) => (
                <article 
                  key={article.id} 
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '3rem', alignItems: 'center' }}
                  className="journal-item"
                >
                  <div style={{ height: '300px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                    <img 
                      src={article.image} 
                      alt={article.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.8s ease' }} 
                      className="journal-item-img"
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                      {article.category} &bull; {article.date}
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--green-dark)', fontWeight: 400, marginTop: '0.5rem', marginBottom: '1rem', lineHeight: 1.3 }}>
                      {article.title}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                      {article.summary}
                    </p>
                    <button 
                      onClick={() => handleReadClick(article.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}
                    >
                      Read Diary Entry
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
