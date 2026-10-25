import React from 'react';

const DEFAULT_ROWS = [
  { size: 'S', chest: '38" - 40"', shoulder: '17.5"', sleeve: '33.5"', length: '29.0"' },
  { size: 'M', chest: '41" - 43"', shoulder: '18.2"', sleeve: '34.5"', length: '29.5"' },
  { size: 'L', chest: '44" - 46"', shoulder: '19.0"', sleeve: '35.5"', length: '30.2"' },
  { size: 'XL', chest: '47" - 49"', shoulder: '19.8"', sleeve: '36.5"', length: '31.0"' }
];

export default function SizeChartModal({ isOpen, onClose, guideData }) {
  if (!isOpen) return null;

  const title = guideData?.title || 'Linen Shirt Size Guide';
  const subtitle = guideData?.subtitle || 'Measurements are shown in inches. Fits may vary slightly depending on shirt style.';
  const rows = (guideData?.rows && guideData.rows.length > 0) ? guideData.rows : DEFAULT_ROWS;
  const fitNote = guideData?.fitNote || 'If you are between sizes, we recommend sizing up for a relaxed resort fit or choosing your normal size for a structured classic look.';

  return (
    <div className="modal-overlay active" id="sizeChartOverlay" onClick={(e) => {
      if (e.target.id === 'sizeChartOverlay') onClose();
    }}>
      <div className="modal-container" style={{ maxWidth: '520px' }} role="dialog" aria-modal="true" aria-labelledby="sizeChartTitle">
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
            marginBottom: '1rem', 
            textAlign: 'center', 
            color: 'var(--green-dark)' 
          }}>
            {title}
          </h3>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)', 
            marginBottom: '2rem', 
            textAlign: 'center', 
            lineHeight: 1.5 
          }}>
            {subtitle}
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
              {rows.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{r.size}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{r.chest || '-'}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{r.shoulder || '-'}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{r.sleeve || '-'}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{r.length || '-'}</td>
                </tr>
              ))}
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
            <strong>Fit Recommendation:</strong> {fitNote}
          </div>
        </div>
      </div>
    </div>
  );
}
