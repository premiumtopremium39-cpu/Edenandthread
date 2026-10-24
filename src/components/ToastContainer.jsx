import React from 'react';

export default function ToastContainer({ toasts, onRemoveToast }) {
  return (
    <div className="toast-container" id="toastContainer">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast ${toast.isRemoving ? 'removing' : ''}`}
          onAnimationEnd={(e) => {
            // Only trigger removal when the fade-out/removing animation finishes
            if (toast.isRemoving && e.animationName.includes('fadeOut') || toast.isRemoving) {
              onRemoveToast(toast.id);
            }
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: toast.message }}></span>
        </div>
      ))}
    </div>
  );
}
