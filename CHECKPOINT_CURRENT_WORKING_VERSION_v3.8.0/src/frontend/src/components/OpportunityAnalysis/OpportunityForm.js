import React, { useState, useCallback } from 'react';
import { useCache } from '../../providers/CacheProvider';
import { useNotification } from '../../providers/NotificationProvider';
import { opportunityAnalysisService } from '../../services/opportunityAnalysisService';
import './OpportunityForm.css';

const OpportunityForm = ({
  onAnalyze,
  onFundingAnalysis,
  onFollowOnAnalysis,
  onReset,
  isLoading,
  hasResults
}) => {
  const [formData, setFormData] = useState({
    CustomerName: '',
    region: '',
    closeDate: '',
    oppName: '',
    oppDescription: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [analysisType, setAnalysisType] = useState('standard');
  
  const { cacheFormData, getCachedFormData } = useCache();
  const { addNotification } = useNotification();

  // Load cached form data on component mount
  React.useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cached = await getCachedFormData('opportunity_form');
        if (cached && cached.data) {
          setFormData(cached.data);
          addNotification({
            type: 'info',
            title: 'Form Data Restored',
            message: 'Your previous form data has been restored.',
            duration: 3000
          });
        }
      } catch (error) {
        console.warn('Failed to load cached form data:', error);
      }
    };

    loadCachedData();
  }, [getCachedFormData, addNotification]);

  // Auto-save form data
  React.useEffect(() => {
    const saveFormData = async () => {
      if (Object.values(formData).some(value => value.trim() !== '')) {
        try {
          await cacheFormData('opportunity_form', formData);
        } catch (error) {
          console.warn('Failed to cache form data:', error);
        }
      }
    };

    const timeoutId = setTimeout(saveFormData, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData, cacheFormData]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  }, [validationErrors]);

  const validateForm = useCallback(() => {
    const validation = opportunityAnalysisService.validateOpportunityData(formData);
    
    if (!validation.isValid) {
      const errors = {};
      validation.errors.forEach(error => {
        const field = error.split(' ')[0];
        errors[field] = error;
      });
      setValidationErrors(errors);
      
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the form errors before submitting.',
        duration: 5000
      });
    }
    
    return validation.isValid;
  }, [formData, addNotification]);

  const handleAnalyze = useCallback(async (type = analysisType) => {
    if (!validateForm()) return;
    
    try {
      await onAnalyze(formData, type);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  }, [formData, analysisType, validateForm, onAnalyze]);

  const handleFundingAnalysis = useCallback(async () => {
    if (!validateForm()) return;
    
    try {
      await onFundingAnalysis(formData);
    } catch (error) {
      console.error('Funding analysis failed:', error);
    }
  }, [formData, validateForm, onFundingAnalysis]);

  const handleFollowOnAnalysis = useCallback(async () => {
    if (!validateForm()) return;
    
    try {
      await onFollowOnAnalysis(formData);
    } catch (error) {
      console.error('Follow-on analysis failed:', error);
    }
  }, [formData, validateForm, onFollowOnAnalysis]);

  const handleReset = useCallback(() => {
    setFormData({
      CustomerName: '',
      region: '',
      closeDate: '',
      oppName: '',
      oppDescription: ''
    });
    setValidationErrors({});
    setAnalysisType('standard');
    onReset();
  }, [onReset]);

  const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
    'ca-central-1', 'sa-east-1'
  ];

  return (
    <div className="opportunity-form">
      <div className="form-header">
        <h2>Opportunity Details</h2>
        <p>Enter the details of your business opportunity for analysis</p>
      </div>

      <form className="form-content" onSubmit={(e) => e.preventDefault()}>
        <div className="form-group">
          <label htmlFor="CustomerName" className="form-label">
            Customer Name *
          </label>
          <input
            type="text"
            id="CustomerName"
            name="CustomerName"
            value={formData.CustomerName}
            onChange={handleInputChange}
            className={`form-input ${validationErrors.CustomerName ? 'error' : ''}`}
            placeholder="Enter customer name"
            disabled={isLoading}
            required
          />
          {validationErrors.CustomerName && (
            <div className="form-error">{validationErrors.CustomerName}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="region" className="form-label">
            Region *
          </label>
          <select
            id="region"
            name="region"
            value={formData.region}
            onChange={handleInputChange}
            className={`form-select ${validationErrors.region ? 'error' : ''}`}
            disabled={isLoading}
            required
          >
            <option value="">Select a region</option>
            {regions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          {validationErrors.region && (
            <div className="form-error">{validationErrors.region}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="closeDate" className="form-label">
            Close Date *
          </label>
          <input
            type="text"
            id="closeDate"
            name="closeDate"
            value={formData.closeDate}
            onChange={handleInputChange}
            className={`form-input ${validationErrors.closeDate ? 'error' : ''}`}
            placeholder="MM/DD/YYYY (e.g., 6/15/2025)"
            disabled={isLoading}
            required
          />
          {validationErrors.closeDate && (
            <div className="form-error">{validationErrors.closeDate}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="oppName" className="form-label">
            Opportunity Name *
          </label>
          <input
            type="text"
            id="oppName"
            name="oppName"
            value={formData.oppName}
            onChange={handleInputChange}
            className={`form-input ${validationErrors.oppName ? 'error' : ''}`}
            placeholder="Enter opportunity name"
            disabled={isLoading}
            required
          />
          {validationErrors.oppName && (
            <div className="form-error">{validationErrors.oppName}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="oppDescription" className="form-label">
            Opportunity Description *
          </label>
          <textarea
            id="oppDescription"
            name="oppDescription"
            value={formData.oppDescription}
            onChange={handleInputChange}
            className={`form-textarea ${validationErrors.oppDescription ? 'error' : ''}`}
            placeholder="Describe the opportunity in detail..."
            rows={4}
            disabled={isLoading}
            required
          />
          {validationErrors.oppDescription && (
            <div className="form-error">{validationErrors.oppDescription}</div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Analysis Type</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="analysisType"
                value="standard"
                checked={analysisType === 'standard'}
                onChange={(e) => setAnalysisType(e.target.value)}
                disabled={isLoading}
              />
              <span className="radio-text">Standard Analysis</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="analysisType"
                value="nova-premier"
                checked={analysisType === 'nova-premier'}
                onChange={(e) => setAnalysisType(e.target.value)}
                disabled={isLoading}
              />
              <span className="radio-text">Nova Premier Analysis</span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <div className="primary-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleAnalyze()}
              disabled={isLoading}
            >
              {isLoading ? 'Analyzing...' : 'Analyze Opportunity'}
            </button>
            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={isLoading}
            >
              Reset Form
            </button>
          </div>

          {hasResults && (
            <div className="secondary-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleFundingAnalysis}
                disabled={isLoading}
              >
                Funding Options
              </button>
              
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleFollowOnAnalysis}
                disabled={isLoading}
              >
                Next Opportunity
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default OpportunityForm;