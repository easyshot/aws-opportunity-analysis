import React, { useState } from 'react';
import { useNotification } from '../../providers/NotificationProvider';
import { useCache } from '../../providers/CacheProvider';
import './Settings.css';

const Settings = () => {
  const [preferences, setPreferences] = useState({
    defaultAnalysisType: 'standard',
    notifications: {
      email: true,
      push: true,
      inApp: true
    },
    dashboard: {
      defaultView: 'overview',
      refreshInterval: 30
    },
    analysis: {
      autoSave: true,
      cacheResults: true,
      showAdvancedOptions: false
    }
  });

  const { addNotification } = useNotification();
  const { clearCache, cacheStats } = useCache();

  const handlePreferenceChange = (section, key, value) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    // TODO: Save preferences to backend
    addNotification({
      type: 'success',
      title: 'Settings Saved',
      message: 'Your preferences have been saved successfully.'
    });
  };

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear all cached data?')) {
      await clearCache();
      addNotification({
        type: 'success',
        title: 'Cache Cleared',
        message: 'All cached data has been cleared successfully.'
      });
    }
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Customize your AWS Opportunity Analysis experience</p>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2>Analysis Preferences</h2>
          <div className="setting-group">
            <label className="setting-label">Default Analysis Type</label>
            <select
              value={preferences.defaultAnalysisType}
              onChange={(e) => setPreferences(prev => ({ ...prev, defaultAnalysisType: e.target.value }))}
              className="setting-select"
            >
              <option value="standard">Standard Analysis</option>
              <option value="nova-premier">Nova Premier Analysis</option>
            </select>
          </div>

          <div className="setting-group">
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={preferences.analysis.autoSave}
                onChange={(e) => handlePreferenceChange('analysis', 'autoSave', e.target.checked)}
              />
              <span>Auto-save form data</span>
            </label>
          </div>

          <div className="setting-group">
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={preferences.analysis.cacheResults}
                onChange={(e) => handlePreferenceChange('analysis', 'cacheResults', e.target.checked)}
              />
              <span>Cache analysis results</span>
            </label>
          </div>

          <div className="setting-group">
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={preferences.analysis.showAdvancedOptions}
                onChange={(e) => handlePreferenceChange('analysis', 'showAdvancedOptions', e.target.checked)}
              />
              <span>Show advanced options</span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h2>Notifications</h2>
          <div className="setting-group">
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={preferences.notifications.email}
                onChange={(e) => handlePreferenceChange('notifications', 'email', e.target.checked)}
              />
              <span>Email notifications</span>
            </label>
          </div>

          <div className="setting-group">
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={preferences.notifications.push}
                onChange={(e) => handlePreferenceChange('notifications', 'push', e.target.checked)}
              />
              <span>Push notifications</span>
            </label>
          </div>

          <div className="setting-group">
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={preferences.notifications.inApp}
                onChange={(e) => handlePreferenceChange('notifications', 'inApp', e.target.checked)}
              />
              <span>In-app notifications</span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h2>Dashboard</h2>
          <div className="setting-group">
            <label className="setting-label">Default View</label>
            <select
              value={preferences.dashboard.defaultView}
              onChange={(e) => handlePreferenceChange('dashboard', 'defaultView', e.target.value)}
              className="setting-select"
            >
              <option value="overview">Overview</option>
              <option value="recent">Recent Analyses</option>
              <option value="metrics">Metrics</option>
            </select>
          </div>

          <div className="setting-group">
            <label className="setting-label">Refresh Interval (seconds)</label>
            <input
              type="number"
              min="10"
              max="300"
              value={preferences.dashboard.refreshInterval}
              onChange={(e) => handlePreferenceChange('dashboard', 'refreshInterval', parseInt(e.target.value))}
              className="setting-input"
            />
          </div>
        </div>

        <div className="settings-section">
          <h2>Cache Management</h2>
          <div className="cache-info">
            <div className="cache-stat">
              <span>Cached Items:</span>
              <span>{cacheStats.itemCount}</span>
            </div>
            <div className="cache-stat">
              <span>Cache Size:</span>
              <span>{(cacheStats.size / 1024).toFixed(1)}KB</span>
            </div>
            <div className="cache-stat">
              <span>Hit Rate:</span>
              <span>{(cacheStats.hitRate * 100).toFixed(1)}%</span>
            </div>
          </div>
          <button
            className="btn btn-danger"
            onClick={handleClearCache}
          >
            Clear Cache
          </button>
        </div>

        <div className="settings-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;