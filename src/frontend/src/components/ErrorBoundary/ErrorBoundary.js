import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      eventId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Generate a unique event ID for tracking
    const eventId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error,
      errorInfo,
      eventId
    });

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo, eventId);
  }

  reportError = (error, errorInfo, eventId) => {
    try {
      // This would typically send to a monitoring service like Sentry, CloudWatch, etc.
      const errorReport = {
        eventId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.props.userId || 'anonymous'
      };

      console.error('Error Report:', errorReport);
      
      // TODO: Send to actual monitoring service
      // Example: Sentry.captureException(error, { extra: errorReport });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      eventId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-container">
            <div className="error-boundary-content">
              <div className="error-icon">💥</div>
              
              <h1 className="error-title">
                Oops! Something went wrong
              </h1>
              
              <p className="error-description">
                We're sorry, but something unexpected happened. The error has been logged 
                and our team has been notified.
              </p>

              {this.state.eventId && (
                <div className="error-id">
                  <strong>Error ID:</strong> {this.state.eventId}
                </div>
              )}

              <div className="error-actions">
                <button 
                  className="error-button error-button-primary"
                  onClick={this.handleRetry}
                >
                  Try Again
                </button>
                
                <button 
                  className="error-button error-button-secondary"
                  onClick={this.handleReload}
                >
                  Reload Page
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="error-details">
                  <summary className="error-details-summary">
                    Technical Details (Development Mode)
                  </summary>
                  
                  <div className="error-details-content">
                    <div className="error-section">
                      <h3>Error Message:</h3>
                      <pre className="error-pre">
                        {this.state.error && this.state.error.toString()}
                      </pre>
                    </div>

                    <div className="error-section">
                      <h3>Stack Trace:</h3>
                      <pre className="error-pre">
                        {this.state.error && this.state.error.stack}
                      </pre>
                    </div>

                    <div className="error-section">
                      <h3>Component Stack:</h3>
                      <pre className="error-pre">
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}

              <div className="error-help">
                <p>If this problem persists, please contact support with the Error ID above.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;