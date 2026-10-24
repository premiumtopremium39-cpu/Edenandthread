import React from 'react';

export default function SizeChartModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" id="sizeChartOverlay" onClick={(e) => {
      if (e.target.id === 'sizeChartOverlay') onClose();
    }}>
      <div className="modal-container" style={{ maxWidth: '500px' }} role="dialog" aria-modal="true" aria-labelledby="sizeChartTitle">
        <button 
          className="close-modal-btn" 
          id="closeSizeChartBtn" 
          aria-label="Close size chart"
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        <div style={{ padding: '3rem 2.5rem' }}>
          <h3 id="sizeChartTitle" style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '1.75rem', 
            fontWeight: 400, 
            marginBottom: '1.5rem', 
            textAlign: 'center', 
            color: 'var(--green-dark)' 
          }}>
            Linen Shirt Size Guide
          </h3>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)', 
            marginBottom: '2rem', 
            textAlign: 'center', 
            lineHeight: 1.5 
          }}>
            Measurements are shown in inches. Fits may vary slightly depending on shirt style.
          </p>
          
          <table className="size-chart-table" style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            marginBottom: '2rem', 
            fontSize: '0.85rem', 
            textAlign: 'left' 
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--green-dark)', fontWeight: 600, color: 'var(--green-dark)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Size</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Chest</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Shoulder</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Sleeve</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Length</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>S</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>38" - 40"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>17.5"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>33.5"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>29.0"</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>M</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>41" - 43"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>18.2"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>34.5"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>29.5"</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>L</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>44" - 46"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>19.0"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>35.5"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>30.2"</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>XL</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>47" - 49"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>19.8"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>36.5"</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>31.0"</td>
              </tr>
            </tbody>
          </table>
          
          <div style={{ 
            backgroundColor: 'var(--gold-light)', 
            padding: '1rem', 
            borderLeft: '3px solid var(--accent)', 
            fontSize: '0.75rem', 
            color: 'var(--text-secondary)', 
            lineHeight: 1.5 
          }}>
            <strong>Fit Recommendation:</strong> If you are between sizes, we recommend sizing up for a relaxed resort fit or choosing your normal size for a structured classic look.
          </div>
        </div>
      </div>
    </div>
  );
}
