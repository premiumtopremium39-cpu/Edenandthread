import React from 'react';

/**
 * BrandLogo - Uses the user's high-resolution brand logo with optional top-right capsule badge.
 * 
 * @param {Object} props
 * @param {'header'|'circle'|'oval'|'badge'|'footer'} [props.variant='header']
 * @param {number} [props.size]
 * @param {boolean} [props.withText=true]
 * @param {boolean} [props.withBadge=true] - Displays the luxury green 'EDEN & THREAD' pill badge at the top-right
 * @param {string} [props.className='']
 * @param {Object} [props.style={}]
 * @param {string} [props.textColor]
 */
export default function BrandLogo({
  variant = 'header',
  size,
  withText = true,
  withBadge = true,
  className = '',
  style = {},
  textColor
}) {
  const originalLogoSrc = '/assets/brand_logo.svg';
  const newLeafLogoSrc = '/assets/brand_logo_leaf_header_footer.png';
  const logoSrc = (variant === 'header' || variant === 'footer') ? newLeafLogoSrc : originalLogoSrc;

  // 1. FULL CIRCLE EMBLEM (Round emblem with optional top-right 'EDEN & THREAD' green capsule badge)
  if (variant === 'circle' || variant === 'oval') {
    const dim = size || 180;
    const badgeFontSize = Math.max(9, Math.round(dim * 0.055));
    const badgePadV = Math.max(5, Math.round(dim * 0.032));
    const badgePadH = Math.max(12, Math.round(dim * 0.088));
    const badgeTop = -Math.round(dim * 0.045);
    const badgeRight = -Math.round(dim * 0.04);

    return (
      <div
        className={`brand-logo-seal-circle ${className}`}
        style={{
          width: `${dim}px`,
          height: `${dim}px`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative',
          ...style
        }}
      >
        <img
          src={logoSrc}
          alt="EDEN & THREAD Brand Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
        />

        {withBadge && (
          <div
            style={{
              position: 'absolute',
              top: `${badgeTop}px`,
              right: `${badgeRight}px`,
              backgroundColor: '#0c2217',
              color: '#cca059',
              fontSize: `${badgeFontSize}px`,
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              padding: `${badgePadV}px ${badgePadH}px`,
              borderRadius: '999px',
              boxShadow: '0 6px 16px rgba(10, 28, 21, 0.32)',
              zIndex: 3,
              whiteSpace: 'nowrap',
              border: '1px solid rgba(204, 160, 89, 0.35)',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.2
            }}
          >
            EDEN &amp; THREAD
          </div>
        )}
      </div>
    );
  }

  // 2. HEADER VARIANT: Round unedited logo + elegant wordmark
  if (variant === 'header') {
    const iconSize = size || 40;
    return (
      <div
        className={`brand-logo-header ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          textDecoration: 'none',
          ...style
        }}
      >
        <div
          className="brand-logo-circle-icon"
          style={{
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={logoSrc}
            alt="EDEN & THREAD Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
        {withText && (
          <span
            className="brand-logo-text"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 600,
              letterSpacing: '0.24em',
              color: textColor || 'var(--text-primary)',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            EDEN <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, color: 'var(--gold)', margin: '0 0.1em' }}>&amp;</span> THREAD
          </span>
        )}
      </div>
    );
  }

  // 3. BADGE ONLY
  if (variant === 'badge') {
    const dim = size || 44;
    return (
      <div
        className={`brand-logo-badge ${className}`}
        style={{
          width: `${dim}px`,
          height: `${dim}px`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          ...style
        }}
      >
        <img
          src={logoSrc}
          alt="EDEN & THREAD Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>
    );
  }

  // 4. FOOTER VARIANT: Clean round emblem + white wordmark
  return (
    <div
      className={`brand-logo-footer ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '14px',
        ...style
      }}
    >
      <div
        style={{
          width: `${size || 46}px`,
          height: `${size || 46}px`,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img
          src={logoSrc}
          alt="EDEN & THREAD Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>
      {withText && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 600,
            letterSpacing: '0.22em',
            color: textColor || 'var(--white)',
            lineHeight: 1
          }}
        >
          EDEN <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, color: 'var(--gold)', margin: '0 0.1em' }}>&amp;</span> THREAD
        </span>
      )}
    </div>
  );
}
