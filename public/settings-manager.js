/**
 * Settings Manager
 * Handles application settings, persistence, and UI interactions
 */

class SettingsManager {
  constructor() {
    this.settings = this.getDefaultSettings();
    this.loadSettings();
    this.initializeEventListeners();
  }

  getDefaultSettings() {
    return {
      dataProcessing: {
        sqlQueryLimit: 200,
        queryResultsLimit: 1000000,
        enableTruncation: true,
        truncationLimit: 400000,
        truncationMethod: 'character'
      },
      performance: {
        analysisTimeout: 180,
        enableCaching: false
      },
      debug: {
        showDebugPanels: true,
        showQueryDetails: true,
        showDataMetrics: true,
        debugLogLevel: 'info'
      }
    };
  }

  loadSettings() {
    try {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        this.settings = { ...this.getDefaultSettings(), ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('appSettings', JSON.stringify(this.settings));
      this.showStatus('Settings saved successfully', 'success');
      this.applySettings();
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showStatus('Failed to save settings', 'error');
      return false;
    }
  }

  resetToDefaults() {
    this.settings = this.getDefaultSettings();
    this.updateUI();
    this.showStatus('Settings reset to defaults', 'info');
  }

  applySettings() {
    // Apply settings to the application
    this.applyDebugSettings();
    this.applyPerformanceSettings();
    
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('settingsChanged', {
      detail: this.settings
    }));
  }

  applyDebugSettings() {
    const debugSettings = this.settings.debug;
    
    // Show/hide debug panels
    const debugPanels = document.querySelectorAll('.debug-panel, .debug-info');
    debugPanels.forEach(panel => {
      panel.style.display = debugSettings.showDebugPanels ? 'block' : 'none';
    });

    // Apply debug log level
    if (window.console && debugSettings.debugLogLevel === 'error') {
      console.info = console.warn = console.debug = () => {};
    }
  }

  applyPerformanceSettings() {
    // Apply performance settings
    const performanceSettings = this.settings.performance;
    
    // Set global timeout for API calls
    window.APP_SETTINGS = window.APP_SETTINGS || {};
    window.APP_SETTINGS.analysisTimeout = performanceSettings.analysisTimeout * 1000;
  }

  initializeEventListeners() {
    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('settings-tab')) {
        this.switchTab(e.target.dataset.tab);
      }
    });

    // Form input changes
    document.addEventListener('change', (e) => {
      if (e.target.closest('.settings-modal')) {
        this.handleInputChange(e.target);
      }
    });

    // Enable/disable truncation settings
    document.addEventListener('change', (e) => {
      if (e.target.id === 'enableTruncation') {
        this.toggleTruncationSettings(e.target.checked);
      }
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content panels
    document.querySelectorAll('.settings-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  handleInputChange(input) {
    const { id, type, checked, value } = input;
    
    // Map input IDs to settings paths
    const settingsMap = {
      // Data Processing
      sqlQueryLimit: 'dataProcessing.sqlQueryLimit',
      queryResultsLimit: 'dataProcessing.queryResultsLimit',
      enableTruncation: 'dataProcessing.enableTruncation',
      truncationLimit: 'dataProcessing.truncationLimit',
      truncationMethod: 'dataProcessing.truncationMethod',
      
      // Performance
      analysisTimeout: 'performance.analysisTimeout',
      enableCaching: 'performance.enableCaching',
      
      // Debug
      showDebugPanels: 'debug.showDebugPanels',
      showQueryDetails: 'debug.showQueryDetails',
      showDataMetrics: 'debug.showDataMetrics',
      debugLogLevel: 'debug.debugLogLevel'
    };

    const settingPath = settingsMap[id];
    if (settingPath) {
      const keys = settingPath.split('.');
      let current = this.settings;
      
      // Navigate to the correct nested object
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      // Set the value
      const finalKey = keys[keys.length - 1];
      if (type === 'checkbox') {
        current[finalKey] = checked;
      } else if (type === 'number') {
        current[finalKey] = parseInt(value, 10);
      } else {
        current[finalKey] = value;
      }

      // Show unsaved changes indicator
      this.showStatus('Unsaved changes', 'warning');
    }
  }

  toggleTruncationSettings(enabled) {
    const truncationSettings = document.getElementById('truncationSettings');
    const inputs = truncationSettings.querySelectorAll('input, select');
    
    inputs.forEach(input => {
      input.disabled = !enabled;
    });
    
    truncationSettings.style.opacity = enabled ? '1' : '0.6';
  }

  updateUI() {
    // Update all form inputs with current settings
    this.updateInput('sqlQueryLimit', this.settings.dataProcessing.sqlQueryLimit);
    this.updateInput('queryResultsLimit', this.settings.dataProcessing.queryResultsLimit);
    this.updateInput('enableTruncation', this.settings.dataProcessing.enableTruncation);
    this.updateInput('truncationLimit', this.settings.dataProcessing.truncationLimit);
    this.updateInput('truncationMethod', this.settings.dataProcessing.truncationMethod);
    
    this.updateInput('analysisTimeout', this.settings.performance.analysisTimeout);
    this.updateInput('enableCaching', this.settings.performance.enableCaching);
    
    this.updateInput('showDebugPanels', this.settings.debug.showDebugPanels);
    this.updateInput('showQueryDetails', this.settings.debug.showQueryDetails);
    this.updateInput('showDataMetrics', this.settings.debug.showDataMetrics);
    this.updateInput('debugLogLevel', this.settings.debug.debugLogLevel);

    // Update truncation settings visibility
    this.toggleTruncationSettings(this.settings.dataProcessing.enableTruncation);

    // Update current usage displays
    this.updateCurrentUsage();
  }

  updateInput(id, value) {
    const input = document.getElementById(id);
    if (input) {
      if (input.type === 'checkbox') {
        input.checked = value;
      } else {
        input.value = value;
      }
    }
  }

  updateCurrentUsage() {
    // Update current query results size
    const currentSize = this.getCurrentQueryResultsSize();
    const sizeElement = document.getElementById('currentQueryResultsSize');
    if (sizeElement) {
      sizeElement.textContent = this.formatBytes(currentSize);
    }

    // Update current truncation usage
    const truncationUsage = this.getCurrentTruncationUsage();
    const usageElement = document.getElementById('currentTruncationUsage');
    if (usageElement) {
      usageElement.textContent = `${truncationUsage.percentage}% (${this.formatBytes(truncationUsage.size)})`;
    }

    // Update performance metrics
    this.updatePerformanceMetrics();
  }

  getCurrentQueryResultsSize() {
    // Get from global debug info if available
    if (window.debugInfo && window.debugInfo.queryResults) {
      return window.debugInfo.queryResults.length;
    }
    return 0;
  }

  getCurrentTruncationUsage() {
    const limit = this.settings.dataProcessing.truncationLimit;
    const currentSize = this.getCurrentQueryResultsSize();
    const actualSize = Math.min(currentSize, limit);
    
    return {
      size: actualSize,
      percentage: Math.round((actualSize / limit) * 100)
    };
  }

  updatePerformanceMetrics() {
    // These would be populated from actual application metrics
    const metrics = this.getPerformanceMetrics();
    
    const avgTimeElement = document.getElementById('avgAnalysisTime');
    if (avgTimeElement) {
      avgTimeElement.textContent = metrics.avgAnalysisTime;
    }

    const dataRateElement = document.getElementById('dataProcessingRate');
    if (dataRateElement) {
      dataRateElement.textContent = metrics.dataProcessingRate;
    }

    const successRateElement = document.getElementById('successRate');
    if (successRateElement) {
      successRateElement.textContent = metrics.successRate;
    }
  }

  getPerformanceMetrics() {
    // Mock metrics - in real implementation, these would come from actual usage data
    return {
      avgAnalysisTime: '45s',
      dataProcessingRate: '2.1 MB/s',
      successRate: '98.5%'
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('settingsStatus');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `settings-status ${type}`;
      
      // Clear status after 3 seconds
      setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = 'settings-status';
      }, 3000);
    }
  }

  // Public API methods
  getSetting(path) {
    const keys = path.split('.');
    let current = this.settings;
    for (const key of keys) {
      current = current[key];
      if (current === undefined) return undefined;
    }
    return current;
  }

  setSetting(path, value) {
    const keys = path.split('.');
    let current = this.settings;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  getSettings() {
    return { ...this.settings };
  }
}

// Global settings manager instance
let settingsManager;

// Initialize settings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  settingsManager = new SettingsManager();
  console.log('✅ Settings manager initialized on page load');
});

// Settings modal functions
function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.style.display = 'flex';
    
    // Initialize settings manager if not already done
    if (!settingsManager) {
      settingsManager = new SettingsManager();
    }
    
    // Update UI with current settings
    settingsManager.updateUI();
    
    // Focus trap for accessibility
    const firstFocusable = modal.querySelector('button, input, select');
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function saveSettings() {
  if (settingsManager) {
    if (settingsManager.saveSettings()) {
      // Optional: close modal after successful save
      // closeSettingsModal();
    }
  }
}

function resetSettingsToDefault() {
  if (settingsManager) {
    if (confirm('Are you sure you want to reset all settings to their default values?')) {
      settingsManager.resetToDefaults();
    }
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Escape key to close modal
  if (e.key === 'Escape') {
    const modal = document.getElementById('settingsModal');
    if (modal && modal.style.display === 'flex') {
      closeSettingsModal();
    }
  }
  
  // Ctrl/Cmd + S to save settings
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    const modal = document.getElementById('settingsModal');
    if (modal && modal.style.display === 'flex') {
      e.preventDefault();
      saveSettings();
    }
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsManager, openSettingsModal, closeSettingsModal, saveSettings, resetSettingsToDefault };
}