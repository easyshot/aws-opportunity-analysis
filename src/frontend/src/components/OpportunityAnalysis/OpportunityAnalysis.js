import React, { useState, useCallback } from 'react';
import { useMutation, useQuery } from 'react-query';
import { useNotification } from '../../providers/NotificationProvider';
import { useCache } from '../../providers/CacheProvider';
import { useAppSync } from '../../providers/AppSyncProvider';

// Components
import OpportunityForm from './OpportunityForm';
import AnalysisResults from './AnalysisResults';
import ProgressIndicator from '../UI/ProgressIndicator';
import LoadingSpinner from '../UI/LoadingSpinner';
import ErrorMessage from '../UI/ErrorMessage';

// Services
import { opportunityAnalysisService } from '../../services/opportunityAnalysisService';

// Styles
import './OpportunityAnalysis.css';

const OpportunityAnalysis = () => {
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const { addNotification } = useNotification();
  const { getCachedData, setCachedData } = useCache();
  const { subscribeToAnalysisUpdates } = useAppSync();

  // Subscribe to real-time analysis updates
  React.useEffect(() => {
    const subscription = subscribeToAnalysisUpdates((update) => {
      setAnalysisProgress(update);
      
      if (update.status === 'completed') {
        setAnalysisResults(update.results);
        addNotification({
          type: 'success',
          title: 'Analysis Complete',
          message: 'Your opportunity analysis has been completed successfully.'
        });
      } else if (update.status === 'failed') {
        addNotification({
          type: 'error',
          title: 'Analysis Failed',
          message: update.error || 'An error occurred during analysis.'
        });
      }
    });

    return () => {
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [subscribeToAnalysisUpdates, addNotification]);

  // Main analysis mutation
  const analysisMutation = useMutation(
    async ({ formData, analysisType }) => {
      // Check cache first
      const cacheKey = `analysis_${JSON.stringify(formData)}_${analysisType}`;
      const cachedResult = await getCachedData(cacheKey);
      
      if (cachedResult && !cachedResult.expired) {
        addNotification({
          type: 'info',
          title: 'Cached Result',
          message: 'Showing cached analysis results.'
        });
        return cachedResult.data;
      }

      // Perform new analysis
      const result = await opportunityAnalysisService.analyzeOpportunity(formData, analysisType);
      
      // Cache the result
      await setCachedData(cacheKey, result, 30 * 60 * 1000); // 30 minutes
      
      return result;
    },
    {
      onSuccess: (data) => {
        setAnalysisResults(data);
        setAnalysisProgress(null);
        addNotification({
          type: 'success',
          title: 'Analysis Complete',
          message: 'Your opportunity analysis has been completed successfully.'
        });
      },
      onError: (error) => {
        console.error('Analysis failed:', error);
        setAnalysisProgress(null);
        addNotification({
          type: 'error',
          title: 'Analysis Failed',
          message: error.message || 'An error occurred during analysis.'
        });
      }
    }
  );

  // Funding analysis mutation
  const fundingMutation = useMutation(
    async (formData) => {
      return await opportunityAnalysisService.analyzeFunding(formData, analysisResults);
    },
    {
      onSuccess: (data) => {
        setAnalysisResults(prev => ({
          ...prev,
          fundingAnalysis: data.fundingAnalysis
        }));
        addNotification({
          type: 'success',
          title: 'Funding Analysis Complete',
          message: 'Funding options analysis has been completed.'
        });
      },
      onError: (error) => {
        console.error('Funding analysis failed:', error);
        addNotification({
          type: 'error',
          title: 'Funding Analysis Failed',
          message: error.message || 'An error occurred during funding analysis.'
        });
      }
    }
  );

  // Follow-on opportunity mutation
  const followOnMutation = useMutation(
    async (formData) => {
      return await opportunityAnalysisService.analyzeFollowOnOpportunity(formData, analysisResults);
    },
    {
      onSuccess: (data) => {
        setAnalysisResults(prev => ({
          ...prev,
          followOnAnalysis: data.followOnAnalysis
        }));
        addNotification({
          type: 'success',
          title: 'Follow-on Analysis Complete',
          message: 'Next opportunity analysis has been completed.'
        });
      },
      onError: (error) => {
        console.error('Follow-on analysis failed:', error);
        addNotification({
          type: 'error',
          title: 'Follow-on Analysis Failed',
          message: error.message || 'An error occurred during follow-on analysis.'
        });
      }
    }
  );

  // Handle form submission
  const handleAnalyze = useCallback(async (formData, analysisType = 'standard') => {
    setAnalysisResults(null);
    setAnalysisProgress({ status: 'started', step: 'initializing' });
    
    try {
      await analysisMutation.mutateAsync({ formData, analysisType });
    } catch (error) {
      console.error('Analysis error:', error);
    }
  }, [analysisMutation]);

  // Handle funding analysis
  const handleFundingAnalysis = useCallback(async (formData) => {
    if (!analysisResults) {
      addNotification({
        type: 'warning',
        title: 'No Analysis Results',
        message: 'Please complete the main analysis first.'
      });
      return;
    }
    
    try {
      await fundingMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Funding analysis error:', error);
    }
  }, [fundingMutation, analysisResults, addNotification]);

  // Handle follow-on analysis
  const handleFollowOnAnalysis = useCallback(async (formData) => {
    if (!analysisResults) {
      addNotification({
        type: 'warning',
        title: 'No Analysis Results',
        message: 'Please complete the main analysis first.'
      });
      return;
    }
    
    try {
      await followOnMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Follow-on analysis error:', error);
    }
  }, [followOnMutation, analysisResults, addNotification]);

  // Handle reset
  const handleReset = useCallback(() => {
    setAnalysisResults(null);
    setAnalysisProgress(null);
    addNotification({
      type: 'info',
      title: 'Form Reset',
      message: 'All fields and results have been cleared.'
    });
  }, [addNotification]);

  const isLoading = analysisMutation.isLoading || fundingMutation.isLoading || followOnMutation.isLoading;

  return (
    <div className="opportunity-analysis">
      <div className="analysis-header">
        <h1>Opportunity Analysis</h1>
        <p>Analyze business opportunities using AWS Bedrock and historical project data</p>
      </div>

      {/* Progress Indicator */}
      {analysisProgress && (
        <ProgressIndicator 
          progress={analysisProgress}
          className="analysis-progress"
        />
      )}

      <div className="analysis-layout">
        {/* Left Panel - Input Form */}
        <div className="analysis-input">
          <OpportunityForm
            onAnalyze={handleAnalyze}
            onFundingAnalysis={handleFundingAnalysis}
            onFollowOnAnalysis={handleFollowOnAnalysis}
            onReset={handleReset}
            isLoading={isLoading}
            hasResults={!!analysisResults}
          />
        </div>

        {/* Right Panel - Results */}
        <div className="analysis-output">
          {isLoading && (
            <div className="loading-container">
              <LoadingSpinner size="large" />
              <p>Analyzing opportunity data...</p>
            </div>
          )}

          {analysisMutation.error && (
            <ErrorMessage 
              error={analysisMutation.error}
              onRetry={() => analysisMutation.reset()}
            />
          )}

          {analysisResults && !isLoading && (
            <AnalysisResults 
              results={analysisResults}
              onExport={() => {
                // TODO: Implement export functionality
                addNotification({
                  type: 'info',
                  title: 'Export Feature',
                  message: 'Export functionality coming soon.'
                });
              }}
            />
          )}

          {!analysisResults && !isLoading && !analysisMutation.error && (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <h3>Ready for Analysis</h3>
              <p>Fill out the opportunity details and click "Analyze" to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpportunityAnalysis;