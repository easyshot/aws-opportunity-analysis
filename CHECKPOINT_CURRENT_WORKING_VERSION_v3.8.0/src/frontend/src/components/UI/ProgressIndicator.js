import React from 'react';
import './ProgressIndicator.css';

const ProgressIndicator = ({ 
  progress, 
  className = '',
  showSteps = true,
  showMessage = true 
}) => {
  const steps = [
    { key: 'initializing', label: 'Initializing', icon: '🔄' },
    { key: 'query_generation', label: 'Query Generation', icon: '🔍' },
    { key: 'data_retrieval', label: 'Data Retrieval', icon: '📊' },
    { key: 'analysis', label: 'Analysis', icon: '🧠' },
    { key: 'completed', label: 'Completed', icon: '✅' }
  ];

  const getCurrentStepIndex = () => {
    if (!progress?.step) return 0;
    return steps.findIndex(step => step.key === progress.step);
  };

  const currentStepIndex = getCurrentStepIndex();
  const progressPercentage = progress?.progress || (currentStepIndex / (steps.length - 1)) * 100;

  return (
    <div className={`progress-indicator ${className}`}>
      {showSteps && (
        <div className="progress-steps">
          <div 
            className="progress-bar-background"
            style={{ '--progress-width': `${progressPercentage}%` }}
          >
            <div className="progress-bar-fill"></div>
          </div>
          
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={`progress-step ${
                index <= currentStepIndex ? 'completed' : ''
              } ${
                index === currentStepIndex ? 'active' : ''
              }`}
            >
              <div className="step-icon">
                {index < currentStepIndex ? '✅' : 
                 index === currentStepIndex ? step.icon : 
                 '⭕'}
              </div>
              <div className="step-label">{step.label}</div>
            </div>
          ))}
        </div>
      )}

      {showMessage && progress?.message && (
        <div className="progress-message">
          <div className="message-content">
            {progress.message}
          </div>
          {progress.status === 'failed' && (
            <div className="message-error">
              {progress.error || 'An error occurred during processing'}
            </div>
          )}
        </div>
      )}

      {progress?.showProgress && (
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-bar-fill"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="progress-percentage">
            {Math.round(progressPercentage)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;