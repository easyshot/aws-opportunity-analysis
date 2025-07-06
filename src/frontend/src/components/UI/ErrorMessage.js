import React from 'react';
import './ErrorMessage.css';

const ErrorMessage = ({ 
  error, 
  title = 'An Error Occurred',
  onRetry = null,
  onDismiss = null,
  className = '',
  showDetails = false
}) => {
  const [detailsVisible, setDetailsVisible] = React.useState(showDetails);

  const getErrorMessage = () => {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error?.message) {
      return error.error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  };

  const getErrorDetails = () => {
    if (typeof error === 'object' && error !== null) {
      return {
        stack: error.stack,
        code: error.code,
        status: error.status,
        timestamp: error.timestamp || new Date().toISOString(),
        ...error
      };
    }
    return null;
  };

  const errorDetails = getErrorDetails();

  return (
    <div className={`error-message ${className}`} role="alert">
      <div className="error-header">
        <div className="error-icon">⚠️</div>
        <div className="error-content">
          <h3 className="error-title">{title}</h3>
          <p className="error-text">{getErrorMessage()}</p>
        </div>
        {onDismiss && (
          <button 
            className="error-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>

      {errorDetails && (
        <div className="error-details-section">
          <button
            className="error-details-toggle"
            onClick={() => setDetailsVisible(!detailsVisible)}
            aria-expanded={detailsVisible}
          >
            {detailsVisible ? 'Hide Details' : 'Show Details'}
          </button>
          
          {detailsVisible && (
            <div className="error-details">
              <div className="error-details-content">
                {errorDetails.code && (
                  <div className="error-detail-item">
                    <strong>Error Code:</strong> {errorDetails.code}
                  </div>
                )}
                {errorDetails.status && (
                  <div className="error-detail-item">
                    <strong>Status:</strong> {errorDetails.status}
                  </div>
                )}
                {errorDetails.timestamp && (
                  <div className="error-detail-item">
                    <strong>Timestamp:</strong> {new Date(errorDetails.timestamp).toLocaleString()}
                  </div>
                )}
                {errorDetails.stack && (
                  <div className="error-detail-item">
                    <strong>Stack Trace:</strong>
                    <pre className="error-stack">{errorDetails.stack}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {onRetry && (
        <div className="error-actions">
          <button 
            className="error-retry-button"
            onClick={onRetry}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorMessage;