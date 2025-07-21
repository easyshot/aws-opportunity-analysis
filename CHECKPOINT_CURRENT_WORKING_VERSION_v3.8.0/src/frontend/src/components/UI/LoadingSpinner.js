import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  text = null,
  className = '',
  inline = false 
}) => {
  const sizeClass = `spinner-${size}`;
  const colorClass = `spinner-${color}`;
  const containerClass = inline ? 'spinner-inline' : 'spinner-container';

  return (
    <div className={`${containerClass} ${className}`}>
      <div className={`spinner ${sizeClass} ${colorClass}`} role="status" aria-label="Loading">
        <span className="sr-only">Loading...</span>
      </div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;