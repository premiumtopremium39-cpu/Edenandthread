/**
 * SEO & Structured Data (JSON-LD) Helper for Eden & Thread
 * Generates dynamic page titles, meta descriptions, Open Graph, and Schema.org tags
 */

export const updatePageSeo = ({
  title,
  description,
  canonicalUrl = 'https://edenandthread.com/',
  ogImage = 'https://edenandthread.com/assets/mens_linen_editorial.png',
  schemaData = null
}) => {
  if (typeof document === 'undefined') return;

  // 1. Update Title
  if (title) {
    document.title = title;
  }

  // 2. Update Meta Description
  if (description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;
  }

  // 3. Update Canonical Tag
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.rel = 'canonical';
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.href = canonicalUrl;

  // 4. Update Open Graph Tags
  const setMetaTag = (property, content) => {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.content = content;
  };

  if (title) setMetaTag('og:title', title);
  if (description) setMetaTag('og:description', description);
  if (canonicalUrl) setMetaTag('og:url', canonicalUrl);
  if (ogImage) setMetaTag('og:image', ogImage);

  // 5. Update Dynamic Schema JSON-LD
  const existingDynamicSchema = document.getElementById('eden-dynamic-schema');
  if (existingDynamicSchema) {
    existingDynamicSchema.remove();
  }

  if (schemaData) {
    const script = document.createElement('script');
    script.id = 'eden-dynamic-schema';
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify(schemaData);
    document.head.appendChild(script);
  }
};

/**
 * Generate Schema.org Product JSON-LD
 */
export const generateProductSchema = (product) => {
  if (!product) return null;

  const productUrl = `https://edenandthread.com/products/${product.id}`;
  const imageUrl = product.image?.startsWith('http') 
    ? product.image 
    : `https://edenandthread.com${product.image || '/assets/shirt_front.png'}`;

  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "image": [imageUrl],
    "description": product.description || "100% Pure Organic European Linen Shirt by Eden & Thread.",
    "sku": `ET-LNN-${String(product.id).padStart(3, '0')}`,
    "brand": {
      "@type": "Brand",
      "name": "Eden & Thread"
    },
    "category": product.category || "Apparel & Accessories > Clothing > Shirts",
    "offers": {
      "@type": "Offer",
      "url": productUrl,
      "priceCurrency": "INR",
      "price": String(product.price || 18500),
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": (product.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Eden & Thread"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5.0",
      "reviewCount": "2"
    }
  };
};
