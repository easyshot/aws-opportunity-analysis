import React from 'react';
import './AnalysisResults.css';

console.log("AnalysisResults component loaded (DEBUG)");

function DebugBanner() {
  return (
    <div style={{
      background: '#ffeb3b',
      color: '#222',
      padding: '0.5rem 1rem',
      textAlign: 'center',
      fontWeight: 'bold',
      borderBottom: '2px solid #fbc02d',
      marginBottom: '1rem',
      letterSpacing: '1px',
      fontSize: '1.1rem',
      zIndex: 1000
    }}>
      [DEBUG] New UI Components Active
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = true }) {
  return (
    <details open={defaultOpen} className="collapsible-section">
      <summary><strong>{title}</strong></summary>
      <div className="collapsible-content">{children}</div>
    </details>
  );
}

const AnalysisResults = ({ results, onExport }) => {
  if (!results) {
    return (
      <div className="analysis-results">
        <DebugBanner />
        <div className="no-results">
          <p>No analysis results available</p>
        </div>
      </div>
    );
  }

  const { metrics, sections, fundingAnalysis, followOnAnalysis, debug } = results;

  // Helper for badge color
  const confidenceClass = (conf) => {
    if (!conf) return 'badge badge-unknown';
    const c = conf.toLowerCase();
    if (c.includes('high')) return 'badge badge-success';
    if (c.includes('medium')) return 'badge badge-warning';
    if (c.includes('low')) return 'badge badge-danger';
    return 'badge badge-unknown';
  };

  return (
    <div className="analysis-results">
      <DebugBanner />
      <div className="results-header">
        <h2>Analysis Results</h2>
        <button className="export-button" onClick={onExport} aria-label="Export Results">
          Export Results
        </button>
      </div>

      {/* Metrics Section */}
      <div className="metrics-section" aria-label="Key Metrics">
        <h3>Key Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Predicted ARR</div>
            <div className="metric-value badge badge-success">{metrics?.predictedArr || <span className="placeholder">N/A</span>}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Predicted MRR</div>
            <div className="metric-value badge badge-info">{metrics?.predictedMrr || <span className="placeholder">N/A</span>}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Launch Date</div>
            <div className="metric-value badge badge-date">{metrics?.launchDate || <span className="placeholder">N/A</span>}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Time to Launch</div>
            <div className="metric-value badge badge-date">{metrics?.timeToLaunch || <span className="placeholder">N/A</span>}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Confidence</div>
            <div className={`metric-value badge ${confidenceClass(metrics?.confidence)}`}>{metrics?.confidence || <span className="placeholder">Unknown</span>}</div>
          </div>
        </div>
      </div>

      {/* Top Services */}
      {metrics?.topServices && (
        <CollapsibleSection title="Recommended AWS Services" defaultOpen={true}>
          <div className="services-content">
            {typeof metrics.topServices === 'string' ? (
              <div dangerouslySetInnerHTML={{ __html: metrics.topServices }} />
            ) : (
              <pre>{JSON.stringify(metrics.topServices, null, 2)}</pre>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Analysis Sections */}
      {sections && (
        <div className="analysis-sections">
          <CollapsibleSection title="Methodology" defaultOpen={true}>
            <div className="section-content">
              {sections.analysisMethodology || <span className="placeholder">No methodology available.</span>}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Detailed Findings" defaultOpen={true}>
            <div className="section-content">
              {sections.detailedFindings || <span className="placeholder">No findings available.</span>}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Prediction Rationale" defaultOpen={true}>
            <div className="section-content">
              {sections.predictionRationale || <span className="placeholder">No rationale available.</span>}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Risk Factors" defaultOpen={true}>
            <div className="section-content">
              {sections.riskFactors || <span className="placeholder">No risk factors identified.</span>}
            </div>
          </CollapsibleSection>

          {sections.similarProjects && sections.similarProjects.length > 0 ? (
            <CollapsibleSection title="Similar Projects" defaultOpen={true}>
              <div className="similar-projects-table-wrapper">
                <table className="similar-projects-table" aria-label="Similar Projects Table">
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Customer</th>
                      <th>Region</th>
                      <th>ARR</th>
                      <th>Top Services</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.similarProjects.map((project, idx) => (
                      <tr key={idx}>
                        <td>{project.projectName || project.opportunity_name || `Project ${idx + 1}`}</td>
                        <td>{project.customer || project.customer_name || 'N/A'}</td>
                        <td>{project.region || 'N/A'}</td>
                        <td>{project.totalARR || project.total_arr || 'N/A'}</td>
                        <td>{project.topServices || project.top_services || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          ) : (
            <CollapsibleSection title="Similar Projects" defaultOpen={true}>
              <span className="placeholder">No similar projects found.</span>
            </CollapsibleSection>
          )}
        </div>
      )}

      {/* Funding Analysis */}
      <CollapsibleSection title="Funding Analysis" defaultOpen={true}>
        <div className="section-content">
          {fundingAnalysis || <span className="placeholder">No funding analysis available.</span>}
        </div>
      </CollapsibleSection>

      {/* Follow-on Analysis */}
      <CollapsibleSection title="Next Opportunity Analysis" defaultOpen={true}>
        <div className="section-content">
          {followOnAnalysis || <span className="placeholder">No follow-on analysis available.</span>}
        </div>
      </CollapsibleSection>

      {/* Debug Section - Always show if debug object is present */}
      {debug && (
        <CollapsibleSection title="🔧 Debug Information" defaultOpen={true}>
          <pre>{JSON.stringify(debug, null, 2)}</pre>
        </CollapsibleSection>
      )}
    </div>
  );
};

export default AnalysisResults;