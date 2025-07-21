import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Overview of your opportunity analysis history and metrics</p>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Total Analyses</h3>
            <div className="dashboard-metric">0</div>
            <p>Completed analyses</p>
          </div>

          <div className="dashboard-card">
            <h3>Average Confidence</h3>
            <div className="dashboard-metric">N/A</div>
            <p>Across all analyses</p>
          </div>

          <div className="dashboard-card">
            <h3>Top Region</h3>
            <div className="dashboard-metric">N/A</div>
            <p>Most analyzed region</p>
          </div>

          <div className="dashboard-card">
            <h3>Success Rate</h3>
            <div className="dashboard-metric">N/A</div>
            <p>Analysis completion rate</p>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Recent Analyses</h2>
          <div className="recent-analyses">
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No analyses yet</h3>
              <p>Start by analyzing your first opportunity to see data here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;