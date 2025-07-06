/**
 * EventBridge Client for Real-time Updates
 * Handles client-side event processing and real-time UI updates
 */

class EventBridgeClient {
  constructor() {
    this.eventSource = null;
    this.eventHandlers = new Map();
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    this.eventTypes = {
      ANALYSIS_STARTED: 'opportunity.analysis.started',
      ANALYSIS_COMPLETED: 'opportunity.analysis.completed',
      ANALYSIS_FAILED: 'opportunity.analysis.failed',
      QUERY_GENERATED: 'opportunity.query.generated',
      DATA_RETRIEVED: 'opportunity.data.retrieved',
      FUNDING_ANALYSIS_COMPLETED: 'opportunity.funding.completed',
      FOLLOWON_ANALYSIS_COMPLETED: 'opportunity.followon.completed',
      USER_NOTIFICATION: 'user.notification.required'
    };
  }

  /**
   * Initialize real-time event connection
   */
  initialize() {
    console.log('Initializing EventBridge client for real-time updates...');
    
    // For now, we'll simulate real-time updates using polling
    // In a production environment, this would connect to WebSocket or Server-Sent Events
    this.startPolling();
    
    // Set up default event handlers
    this.setupDefaultHandlers();
  }

  /**
   * Start polling for events (simulation of real-time updates)
   */
  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.pollingInterval = setInterval(() => {
      this.checkForEvents();
    }, 2000); // Poll every 2 seconds
    
    this.connectionStatus = 'connected';
    console.log('EventBridge client polling started');
  }

  /**
   * Stop polling for events
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.connectionStatus = 'disconnected';
    console.log('EventBridge client polling stopped');
  }

  /**
   * Check for new events (placeholder implementation)
   */
  async checkForEvents() {
    try {
      // In a real implementation, this would check for new events
      // For now, we'll just maintain the connection status
      if (this.connectionStatus !== 'connected') {
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.notifyConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Error checking for events:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Handle connection errors and implement reconnection logic
   */
  handleConnectionError() {
    this.connectionStatus = 'error';
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.startPolling();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.connectionStatus = 'failed';
      this.notifyConnectionStatus('failed');
    }
  }

  /**
   * Set up default event handlers
   */
  setupDefaultHandlers() {
    // Analysis started handler
    this.on(this.eventTypes.ANALYSIS_STARTED, (eventData) => {
      this.showNotification('Analysis Started', `Analysis started for ${eventData.opportunityDetails?.oppName}`, 'info');
      this.updateAnalysisStatus('started');
    });

    // Analysis completed handler
    this.on(this.eventTypes.ANALYSIS_COMPLETED, (eventData) => {
      this.showNotification('Analysis Completed', `Analysis completed for ${eventData.opportunityDetails?.oppName}`, 'success');
      this.updateAnalysisStatus('completed');
      this.updateAnalysisResults(eventData.analysisResults);
    });

    // Analysis failed handler
    this.on(this.eventTypes.ANALYSIS_FAILED, (eventData) => {
      this.showNotification('Analysis Failed', `Analysis failed: ${eventData.error?.message}`, 'error');
      this.updateAnalysisStatus('failed');
    });

    // Query generated handler
    this.on(this.eventTypes.QUERY_GENERATED, (eventData) => {
      this.updateProgressStep('query-generated');
      this.showProgressMessage('SQL query generated successfully');
    });

    // Data retrieved handler
    this.on(this.eventTypes.DATA_RETRIEVED, (eventData) => {
      this.updateProgressStep('data-retrieved');
      this.showProgressMessage(`Retrieved ${eventData.dataResults?.recordCount || 0} historical records`);
    });

    // Funding analysis completed handler
    this.on(this.eventTypes.FUNDING_ANALYSIS_COMPLETED, (eventData) => {
      this.showNotification('Funding Analysis Completed', 'Funding analysis results are ready', 'success');
      this.updateFundingResults(eventData.fundingResults);
    });

    // Follow-on analysis completed handler
    this.on(this.eventTypes.FOLLOWON_ANALYSIS_COMPLETED, (eventData) => {
      this.showNotification('Follow-on Analysis Completed', 'Follow-on opportunity analysis is ready', 'success');
      this.updateFollowOnResults(eventData.followOnResults);
    });

    // User notification handler
    this.on(this.eventTypes.USER_NOTIFICATION, (eventData) => {
      this.showNotification(eventData.notificationType, eventData.message, 'info');
    });
  }

  /**
   * Register event handler
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  /**
   * Unregister event handler
   */
  off(eventType, handler) {
    if (this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to registered handlers
   */
  emit(eventType, eventData) {
    if (this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType);
      handlers.forEach(handler => {
        try {
          handler(eventData);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Simulate receiving an event (for testing)
   */
  simulateEvent(eventType, eventData) {
    console.log(`Simulating event: ${eventType}`, eventData);
    this.emit(eventType, eventData);
  }

  /**
   * Show notification to user
   */
  showNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <strong>${title}</strong>
        <p>${message}</p>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add to notification container
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }

    container.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);

    console.log(`Notification: ${title} - ${message}`);
  }

  /**
   * Update analysis status in UI
   */
  updateAnalysisStatus(status) {
    const statusElement = document.getElementById('analysis-status');
    if (statusElement) {
      statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      statusElement.className = `analysis-status status-${status}`;
    }

    // Update analyze button state
    const analyzeButton = document.getElementById('analyze-btn');
    if (analyzeButton) {
      if (status === 'started') {
        analyzeButton.disabled = true;
        analyzeButton.textContent = 'Analyzing...';
      } else {
        analyzeButton.disabled = false;
        analyzeButton.textContent = 'Analyze';
      }
    }
  }

  /**
   * Update progress step indicator
   */
  updateProgressStep(step) {
    const progressSteps = {
      'query-generated': 1,
      'data-retrieved': 2,
      'analysis-completed': 3
    };

    const stepNumber = progressSteps[step];
    if (stepNumber) {
      for (let i = 1; i <= stepNumber; i++) {
        const stepElement = document.getElementById(`progress-step-${i}`);
        if (stepElement) {
          stepElement.classList.add('completed');
        }
      }
    }
  }

  /**
   * Show progress message
   */
  showProgressMessage(message) {
    const progressElement = document.getElementById('progress-message');
    if (progressElement) {
      progressElement.textContent = message;
      progressElement.style.display = 'block';
    }
  }

  /**
   * Update analysis results in UI
   */
  updateAnalysisResults(results) {
    if (results && results.metrics) {
      // Update metrics
      const metricsElements = {
        'predicted-arr': results.metrics.predictedArr,
        'predicted-mrr': results.metrics.predictedMrr,
        'launch-date': results.metrics.launchDate,
        'time-to-launch': results.metrics.timeToLaunch,
        'confidence': results.metrics.confidence,
        'top-services': results.metrics.topServices
      };

      Object.entries(metricsElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value) {
          element.textContent = value;
        }
      });
    }
  }

  /**
   * Update funding results in UI
   */
  updateFundingResults(results) {
    const fundingElement = document.getElementById('funding-analysis-output');
    if (fundingElement && results) {
      fundingElement.textContent = typeof results === 'string' ? results : JSON.stringify(results, null, 2);
    }
  }

  /**
   * Update follow-on results in UI
   */
  updateFollowOnResults(results) {
    const followOnElement = document.getElementById('next-opportunity-output');
    if (followOnElement && results) {
      followOnElement.textContent = typeof results === 'string' ? results : JSON.stringify(results, null, 2);
    }
  }

  /**
   * Notify connection status change
   */
  notifyConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.textContent = status;
      statusElement.className = `connection-status status-${status}`;
    }

    // Show notification for connection changes
    if (status === 'connected') {
      this.showNotification('Connected', 'Real-time updates are active', 'success');
    } else if (status === 'failed') {
      this.showNotification('Connection Failed', 'Real-time updates are unavailable', 'error');
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopPolling();
    this.eventHandlers.clear();
  }
}

// Create global instance
window.eventBridgeClient = new EventBridgeClient();