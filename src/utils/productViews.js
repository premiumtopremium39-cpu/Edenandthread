/**
 * productViews.js
 * 
 * Provides dynamic image view resolution (15 angles across colors per garment)
 * and per-color inventory resolution.
 */

export const AVAILABLE_IMAGE_SETS = [
  { id: "shirt", label: "Classic White Linen (5 Angles)", prefix: "shirt", front: "/assets/shirt_front.png", defaultHex: "#FFFFFF" },
  { id: "shirt_blue", label: "Sky Blue Linen (5 Angles)", prefix: "shirt_blue", front: "/assets/shirt_blue_front.png", defaultHex: "#B0C4DE" },
  { id: "shirt_navy", label: "Deep Mediterranean Navy (5 Angles)", prefix: "shirt_navy", front: "/assets/shirt_navy_front.png", defaultHex: "#1C2D48" },
  { id: "shirt_olive", label: "Olive Green Linen (5 Angles)", prefix: "shirt_olive", front: "/assets/shirt_olive_front.png", defaultHex: "#556B2F" },
  { id: "shirt_sage", label: "Riviera Sage Green (5 Angles)", prefix: "shirt_sage", front: "/assets/shirt_sage_front.png", defaultHex: "#768E70" },
  { id: "shirt_beige", label: "Sand Beige / Oatmeal Linen (5 Angles)", prefix: "shirt_beige", front: "/assets/shirt_beige_front.png", defaultHex: "#E5DCD0" },
  { id: "shirt_peach", label: "Sunset Peach / Terracotta (5 Angles)", prefix: "shirt_peach", front: "/assets/shirt_peach_front.png", defaultHex: "#F4A460" },
  { id: "shirt_charcoal", label: "Atelier Charcoal / Slate (5 Angles)", prefix: "shirt_charcoal", front: "/assets/shirt_charcoal_front.png", defaultHex: "#303438" },
  { id: "set1", label: "Portofino Band Collar Olive (5 Angles)", prefix: "set1", front: "/assets/set1/front.png", defaultHex: "#36454F" },
  { id: "set2", label: "Capri Camp Collar Natural (5 Angles)", prefix: "set2", front: "/assets/set2/front.png", defaultHex: "#F5F5DC" }
];

export function get5ViewsForSet(setId) {
  if (setId === 'set1' || setId === 'set2') {
    return [
      { name: "Front View", url: `/assets/${setId}/front.png` },
      { name: "Back Side", url: `/assets/${setId}/back.png` },
      { name: "Left Side View", url: `/assets/${setId}/side1.png` },
      { name: "Button View", url: `/assets/${setId}/button.png` },
      { name: "Right Side View", url: `/assets/${setId}/side2.png` }
    ];
  }
  let prefix = (setId || 'shirt').replace(/_(front|back|left|right|side1|side2|button)$/, '');
  if (!prefix || prefix === 'shirt') {
    return [
      { name: "Front View", url: "/assets/shirt_front.png" },
      { name: "Back Side", url: "/assets/shirt_back.png" },
      { name: "Left Side View", url: "/assets/shirt_left.png" },
      { name: "Button View", url: "/assets/shirt_button.png" },
      { name: "Right Side View", url: "/assets/shirt_right.png" }
    ];
  }
  return [
    { name: "Front View", url: `/assets/${prefix}_front.png` },
    { name: "Back Side", url: `/assets/${prefix}_back.png` },
    { name: "Left Side View", url: `/assets/${prefix}_left.png` },
    { name: "Button View", url: `/assets/${prefix}_button.png` },
    { name: "Right Side View", url: `/assets/${prefix}_right.png` }
  ];
}

export const DEFAULT_FALLBACK_IMAGE = "/assets/shirt_front.png";

/**
 * Safe Image Error Handler to prevent infinite onError loops and fallback cleanly
 */
export function handleImageError(e, fallbackUrl = DEFAULT_FALLBACK_IMAGE) {
  if (e && e.target && e.target.src !== fallbackUrl) {
    e.target.onerror = null; // Prevent infinite fallback loops
    e.target.src = fallbackUrl;
  }
}

export function getProductColorViews(product, colorName) {
  if (!product) return [{ name: "Front View", url: DEFAULT_FALLBACK_IMAGE }];

  // 1. Check if color has explicit 5 views configured
  if (product.colors && product.colors.length > 0) {
    const selectedColorObj = product.colors.find(c => 
      c.name?.toLowerCase() === colorName?.toLowerCase()
    ) || product.colors[0];

    if (selectedColorObj?.views && Array.isArray(selectedColorObj.views) && selectedColorObj.views.length > 0) {
      // If color or product has a custom uploaded front image, ensure primary view uses it
      const primaryCustom = selectedColorObj.customImage || (selectedColorObj.image && !selectedColorObj.image.startsWith('/assets/shirt')) ? selectedColorObj.image : null;
      if (primaryCustom && selectedColorObj.views[0]?.url !== primaryCustom) {
        return [
          { name: selectedColorObj.views[0]?.name || "Front View", url: primaryCustom },
          ...selectedColorObj.views.slice(1)
        ];
      }
      return selectedColorObj.views;
    }

    // If color has an explicit image assigned, detect set prefix
    if (selectedColorObj?.image) {
      const img = selectedColorObj.image;
      const baseMatch = img.match(/(shirt_[a-z]+|shirt|set1|set2)/);
      if (baseMatch) {
        return get5ViewsForSet(baseMatch[1]);
      } else if (img.startsWith('data:') || img.startsWith('/') || img.startsWith('http')) {
        // Custom upload image as single front view + default angles
        return [
          { name: "Front View", url: img },
          ...get5ViewsForSet('shirt').slice(1)
        ];
      }
    }

    // 2. Intelligent keyword resolution for color names
    const cName = (colorName || selectedColorObj?.name || '').toLowerCase();
    if (cName.includes('navy')) {
      return get5ViewsForSet('shirt_navy');
    } else if (cName.includes('blue')) {
      return get5ViewsForSet('shirt_blue');
    } else if (cName.includes('sage')) {
      return get5ViewsForSet('shirt_sage');
    } else if (cName.includes('olive') || cName.includes('green')) {
      return get5ViewsForSet('shirt_olive');
    } else if (cName.includes('beige') || cName.includes('oatmeal') || cName.includes('sand')) {
      return get5ViewsForSet('shirt_beige');
    } else if (cName.includes('peach') || cName.includes('sunset') || cName.includes('terracotta')) {
      return get5ViewsForSet('shirt_peach');
    } else if (cName.includes('charcoal') || cName.includes('grey') || cName.includes('gray') || cName.includes('slate')) {
      return get5ViewsForSet('shirt_charcoal');
    } else {
      return get5ViewsForSet('shirt');
    }
  }

  // If product has custom top-level image
  if (product.image) {
    const baseMatch = product.image.match(/(shirt_[a-z]+|shirt|set1|set2)/);
    if (baseMatch) {
      return get5ViewsForSet(baseMatch[1]);
    } else {
      return [
        { name: "Front View", url: product.image },
        ...get5ViewsForSet('shirt').slice(1)
      ];
    }
  }

  // Fallback by product category
  if (product.category === "band-collar") {
    return get5ViewsForSet('set1');
  } else if (product.category === "camp-collar") {
    return get5ViewsForSet('set2');
  } else if (product.category === "popover") {
    return get5ViewsForSet('shirt_peach');
  } else if (product.category === "tailored-fit") {
    return get5ViewsForSet('shirt_beige');
  }

  return get5ViewsForSet('shirt');
}

/**
 * Returns available stock for a specific garment color
 */
export function getProductColorStock(product, colorName) {
  if (!product) return 0;
  if (product.colors && product.colors.length > 0) {
    const matched = product.colors.find(c => 
      c.name?.toLowerCase() === colorName?.toLowerCase()
    ) || product.colors[0];

    if (typeof matched?.stock === 'number') {
      return matched.stock;
    }
    if (matched?.stock !== undefined && matched?.stock !== null && !isNaN(Number(matched.stock))) {
      return Number(matched.stock);
    }
  }
  return typeof product.stock === 'number' ? product.stock : 10;
}

/**
 * Returns the primary front view image for a given product and color
 */
export function getProductColorImage(product, colorName) {
  if (!product) return DEFAULT_FALLBACK_IMAGE;
  const views = getProductColorViews(product, colorName);
  if (views && views.length > 0 && views[0]?.url) {
    return views[0].url;
  }
  return product.image || DEFAULT_FALLBACK_IMAGE;
}

