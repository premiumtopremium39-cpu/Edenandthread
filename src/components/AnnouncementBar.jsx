import React from 'react';

export default function AnnouncementBar({ message }) {
  const defaultText = "FREE WORLDWIDE SHIPPING • 100% PURE ORGANIC LINEN • EASY 30-DAY RETURNS";
  return (
    <div className="announcement-bar">
      <p>{message || defaultText}</p>
    </div>
  );
}
