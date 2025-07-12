import React from 'react';
import './AnalysisResults.css';

const AnalysisResults = ({ results, onExport }) => {
  if (!results) {
    return (
      <div className="analysis-results">
        <div className="no-results">
          <p>No analysis results available</p>
        </div>
      </div>
    );
  }

  const { metrics, sections, fundingAnalysis, followOnAnalysis, debug } = results;

  return (
    <div className="analysis-results">
      <div className="results-header">
        <h2>Analysis Results</h2>
        <button className="export-button" onClick={onExport}>
          Export Results
        </button>
      </div>

      {/* Metrics Section */}
      <div className="metrics-section">
        <h3>Key Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Predicted ARR</div>
            <div className="metric-value">{metrics?.predictedArr || 'N/A'}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Predicted MRR</div>
            <div className="metric-value">{metrics?.predictedMrr || 'N/A'}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Launch Date</div>
            <div className="metric-value">{metrics?.launchDate || 'N/A'}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Time to Launch</div>
            <div className="metric-value">{metrics?.timeToLaunch || 'N/A'}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Confidence</div>
            <div className={`metric-value confidence-${metrics?.confidence?.toLowerCase() || 'unknown'}`}>
              {metrics?.confidence || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Top Services */}
      {metrics?.topServices && (
        <div className="services-section">
          <h3>Recommended AWS Services</h3>
          <div className="services-content">
            {typeof metrics.topServices === 'string' ? (
              <div dangerouslySetInnerHTML={{ __html: metrics.topServices }} />
            ) : (
              <pre>{JSON.stringify(metrics.topServices, null, 2)}</pre>
            )}
          </div>
        </div>
      )}

      {/* Analysis Sections */}
      {sections && (
        <div className="analysis-sections">
          {sections.analysisMethodology && (
            <div className="analysis-section">
              <h3>Methodology</h3>
              <div className="section-content">
                {sections.analysisMethodology}
              </div>
            </div>
          )}

          {sections.detailedFindings && (
            <div className="analysis-section">
              <h3>Detailed Findings</h3>
              <div className="section-content">
                {sections.detailedFindings}
              </div>
            </div>
          )}

          {sections.predictionRationale && (
            <div className="analysis-section">
              <h3>Prediction Rationale</h3>
              <div className="section-content">
                {sections.predictionRationale}
              </div>
            </div>
          )}

          {sections.riskFactors && (
            <div className="analysis-section">
              <h3>Risk Factors</h3>
              <div className="section-content">
                {sections.riskFactors}
              </div>
            </div>
          )}

          {sections.similarProjects && sections.similarProjects.length > 0 && (
            <div className="analysis-section">
              <h3>Similar Projects</h3>
              <div className="similar-projects">
                {sections.similarProjects.map((project, index) => (
                  <div key={index} className="project-card">
                    <h4>{project.projectName || project.opportunity_name || `Project ${index + 1}`}</h4>
                    <div className="project-details">
                      <div><strong>Customer:</strong> {project.customer || project.customer_name || 'N/A'}</div>
                      <div><strong>Region:</strong> {project.region || 'N/A'}</div>
                      <div><strong>ARR:</strong> {project.totalARR || project.total_arr || 'N/A'}</div>
                      <div><strong>Services:</strong> {project.topServices || project.top_services || 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Funding Analysis */}
      {fundingAnalysis && (
        <div className="funding-section">
          <h3>Funding Analysis</h3>
          <div className="section-content">
            {fundingAnalysis}
          </div>
        </div>
      )}

      {/* Follow-on Analysis */}
      {followOnAnalysis && (
        <div className="followon-section">
          <h3>Next Opportunity Analysis</h3>
          <div className="section-content">
            {followOnAnalysis}
          </div>
        </div>
      )}

      {/* Debug Section - Always show if debug object is present */}
      {debug && (
        <div className="debug-section">
          <h3>🔧 Debug Information</h3>
          <pre>{JSON.stringify(debug, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AnalysisResults;