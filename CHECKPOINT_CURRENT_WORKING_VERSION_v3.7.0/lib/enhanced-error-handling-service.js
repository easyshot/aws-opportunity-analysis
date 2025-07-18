/**
 * Enhanced Error Handling Service with Comprehensive AWS Integration
 * Implements Task 6 requirements: retry logic, CloudWatch metrics, logging, throttling, network handling, and monitoring dashboards
 */

const { ErrorHandlingService } = require('./error-handling-service');
const { CloudWatchClient, PutMetricDataCommand, PutDashboardCommand } = require('@aws-sdk/client-cloudwatch');
const { CloudWatchLogsClient, CreateLogGroupCommand, CreateLogStreamCommand, PutLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { errorHandlingConfig, getOperationConfig, isRetryableError, getRecoveryStrategy } = require('../config/error-handling-config');

class EnhancedErrorHandlingService extends ErrorHandlingService {
  constructor(config = {}) {
    super(config);
    
    this.cloudWatchLogsClient = new CloudWatchLogsClient({ region: this.region });
    this.snsClient = new SNSClient({ region: this.region });
    
    // Enhanced configuration
    this.enhancedConfig = {
      ...this.config,
      logGroupName: '/aws/opportunity-analysis/error-handling',
      alertTopicArn: process.env.ERROR_ALERT_TOPIC_ARN,
      dashboardName: 'OpportunityAnalysis-ErrorHandling',
      ...config
    };
    
    // Throttling and quota tracking
    this.throttlingTracker = new Map();
    this.quotaTracker = new Map();
    
    // Network issue tracking
    this.networkIssueTracker = {
      consecutiveFailures: 0,
      lastFailureTime: null,
      backoffMultiplier: 1
    };
    
    // Performance metrics
    this.performanceMetrics = {
      operationLatencies: new Map(),
      errorRates: new Map(),
      throughput: new Map()
    };
    
    console.log('🛡️ Enhanced Error Handling Service initialized');
    this.initializeLogGroup();
    this.createMonitoringDashboard();
  }

  /**
   * Initialize CloudWatch log group for error handling
   */
  async initializeLogGroup() {
    try {
      await this.cloudWatchLogsClient.send(new CreateLogGroupCommand({
        logGroupName: this.enhancedConfig.logGroupName
      }));
      console.log(`📝 Created log group: ${this.enhancedConfig.logGroupName}`);
    } catch (error) {
      if (error.name !== 'ResourceAlreadyExistsException') {
        console.warn('⚠️ Failed to create log group:', error.message);
      }
    }
  }

  /**
   * Enhanced execute with comprehensive error handling
   * Implements exponential backoff, throttling handling, network recovery
   */
  async executeWithEnhancedErrorHandling(operationName, operation, options = {}) {
    const startTime = Date.now();
    const operationConfig = getOperationConfig(operationName);
    let attempt = 0;
    let lastError = null;
    
    const {
      maxRetries = operationConfig.maxRetries,
      enableCircuitBreaker = operationConfig.circuitBreakerEnabled,
      enableDLQ = operationConfig.dlqEnabled,
      context = {},
      customRetryLogic = null
    } = options;

    // Check circuit breaker
    if (enableCircuitBreaker && this.isCircuitBreakerOpen(operationName)) {
      const error = new Error(`Circuit breaker is open for operation: ${operationName}`);
      await this.recordEnhancedError('circuit_breaker_open', error, { operationName, ...context });
      throw error;
    }

    // Check for throttling
    if (this.isOperationThrottled(operationName)) {
      const throttleDelay = this.getThrottleDelay(operationName);
      console.log(`⏳ Operation ${operationName} is throttled, waiting ${throttleDelay}ms`);
      await this.sleep(throttleDelay);
    }

    while (attempt <= maxRetries) {
      try {
        console.log(`🔄 Executing ${operationName} (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        // Record attempt metrics
        await this.recordOperationAttempt(operationName, attempt + 1);
        
        const result = await operation();
        
        // Record success metrics
        const duration = Date.now() - startTime;
        await this.recordEnhancedSuccess(operationName, duration, attempt + 1, context);
        
        // Reset circuit breaker and throttling on success
        if (enableCircuitBreaker) {
          this.resetCircuitBreaker(operationName);
        }
        this.resetThrottling(operationName);
        this.resetNetworkIssueTracker();
        
        return result;
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        console.error(`❌ ${operationName} failed (attempt ${attempt}):`, error.message);
        
        // Enhanced error classification and handling
        const errorClassification = this.classifyError(error);
        await this.recordEnhancedError('operation_failure', error, {
          operationName,
          attempt,
          duration: Date.now() - startTime,
          classification: errorClassification,
          ...context
        });
        
        // Handle specific error types
        await this.handleSpecificErrorType(error, operationName, attempt);
        
        // Update circuit breaker
        if (enableCircuitBreaker) {
          this.recordCircuitBreakerFailure(operationName);
        }
        
        // Check if error is retryable
        if (attempt > maxRetries || !this.shouldRetryError(error, operationName, attempt)) {
          if (enableDLQ) {
            await this.sendToDeadLetterQueue(operationName, error, {
              ...context,
              attempts: attempt,
              errorClassification
            });
          }
          
          // Trigger automated recovery
          await this.triggerAutomatedRecovery(operationName, error, context);
          break;
        }
        
        // Calculate enhanced backoff delay
        const delay = customRetryLogic ? 
          customRetryLogic(attempt, error) : 
          this.calculateEnhancedBackoffDelay(attempt, error, operationName);
        
        console.log(`⏳ Waiting ${delay}ms before retry (${errorClassification.type})...`);
        await this.sleep(delay);
      }
    }
    
    // Final error handling with comprehensive metrics
    await this.recordFinalFailure(operationName, lastError, attempt, Date.now() - startTime, context);
    
    // Send alert for critical failures
    await this.sendCriticalErrorAlert(operationName, lastError, context);
    
    throw lastError;
  }

  /**
   * Classify errors for better handling
   */
  classifyError(error) {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name || error.constructor.name;
    
    if (errorMessage.includes('throttl') || errorMessage.includes('rate limit')) {
      return { type: 'throttling', severity: 'medium', retryable: true };
    } else if (errorMessage.includes('timeout')) {
      return { type: 'timeout', severity: 'medium', retryable: true };
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return { type: 'network', severity: 'high', retryable: true };
    } else if (errorMessage.includes('credential') || errorMessage.includes('auth')) {
      return { type: 'authentication', severity: 'high', retryable: false };
    } else if (errorMessage.includes('quota') || errorMessage.includes('limit exceeded')) {
      return { type: 'quota', severity: 'high', retryable: false };
    } else if (errorName.includes('ValidationException')) {
      return { type: 'validation', severity: 'low', retryable: false };
    } else {
      return { type: 'unknown', severity: 'medium', retryable: true };
    }
  }

  /**
   * Handle specific error types with specialized logic
   */
  async handleSpecificErrorType(error, operationName, attempt) {
    const classification = this.classifyError(error);
    
    switch (classification.type) {
      case 'throttling':
        await this.handleThrottlingError(error, operationName, attempt);
        break;
      case 'network':
        await this.handleNetworkError(error, operationName, attempt);
        break;
      case 'quota':
        await this.handleQuotaError(error, operationName, attempt);
        break;
      case 'timeout':
        await this.handleTimeoutError(error, operationName, attempt);
        break;
      default:
        // Generic error handling
        break;
    }
  }

  /**
   * Handle throttling errors with intelligent backoff
   */
  async handleThrottlingError(error, operationName, attempt) {
    const throttleInfo = this.throttlingTracker.get(operationName) || {
      count: 0,
      firstOccurrence: Date.now(),
      backoffMultiplier: 1
    };
    
    throttleInfo.count++;
    throttleInfo.backoffMultiplier = Math.min(throttleInfo.backoffMultiplier * 2, 16);
    throttleInfo.lastOccurrence = Date.now();
    
    this.throttlingTracker.set(operationName, throttleInfo);
    
    // Record throttling metrics
    await this.recordMetric('ThrottlingErrors', 1, 'Count', [
      { Name: 'OperationName', Value: operationName },
      { Name: 'Attempt', Value: attempt.toString() }
    ]);
    
    console.warn(`🚦 Throttling detected for ${operationName} (count: ${throttleInfo.count})`);
  }

  /**
   * Handle network errors with connection recovery
   */
  async handleNetworkError(error, operationName, attempt) {
    this.networkIssueTracker.consecutiveFailures++;
    this.networkIssueTracker.lastFailureTime = Date.now();
    this.networkIssueTracker.backoffMultiplier = Math.min(
      this.networkIssueTracker.backoffMultiplier * 1.5, 
      8
    );
    
    // Record network error metrics
    await this.recordMetric('NetworkErrors', 1, 'Count', [
      { Name: 'OperationName', Value: operationName },
      { Name: 'ConsecutiveFailures', Value: this.networkIssueTracker.consecutiveFailures.toString() }
    ]);
    
    console.warn(`🌐 Network error for ${operationName} (consecutive: ${this.networkIssueTracker.consecutiveFailures})`);
    
    // Trigger network recovery if too many consecutive failures
    if (this.networkIssueTracker.consecutiveFailures >= 3) {
      await this.triggerNetworkRecovery(operationName, error);
    }
  }

  /**
   * Handle quota/service limit errors
   */
  async handleQuotaError(error, operationName, attempt) {
    const quotaInfo = this.quotaTracker.get(operationName) || {
      count: 0,
      firstOccurrence: Date.now()
    };
    
    quotaInfo.count++;
    quotaInfo.lastOccurrence = Date.now();
    
    this.quotaTracker.set(operationName, quotaInfo);
    
    // Record quota error metrics
    await this.recordMetric('QuotaErrors', 1, 'Count', [
      { Name: 'OperationName', Value: operationName }
    ]);
    
    console.error(`🚫 Quota/limit exceeded for ${operationName} (count: ${quotaInfo.count})`);
    
    // Send immediate alert for quota issues
    await this.sendQuotaAlert(operationName, error);
  }

  /**
   * Handle timeout errors with adaptive timeouts
   */
  async handleTimeoutError(error, operationName, attempt) {
    // Record timeout metrics
    await this.recordMetric('TimeoutErrors', 1, 'Count', [
      { Name: 'OperationName', Value: operationName },
      { Name: 'Attempt', Value: attempt.toString() }
    ]);
    
    console.warn(`⏰ Timeout error for ${operationName} (attempt: ${attempt})`);
  }

  /**
   * Calculate enhanced backoff delay with jitter and error-specific logic
   */
  calculateEnhancedBackoffDelay(attempt, error, operationName) {
    const classification = this.classifyError(error);
    let baseDelay = errorHandlingConfig.retry.baseDelay;
    let maxDelay = errorHandlingConfig.retry.maxDelay;
    
    // Adjust delays based on error type
    switch (classification.type) {
      case 'throttling':
        const throttleInfo = this.throttlingTracker.get(operationName);
        baseDelay *= (throttleInfo?.backoffMultiplier || 1);
        maxDelay *= 2; // Longer max delay for throttling
        break;
      case 'network':
        baseDelay *= this.networkIssueTracker.backoffMultiplier;
        break;
      case 'timeout':
        baseDelay *= 1.5; // Slightly longer delay for timeouts
        break;
    }
    
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt - 1),
      maxDelay
    );
    
    // Add jitter (±25% of the delay)
    const jitterFactor = errorHandlingConfig.retry.jitterFactor;
    const jitter = exponentialDelay * jitterFactor * (Math.random() * 2 - 1);
    
    return Math.max(100, Math.floor(exponentialDelay + jitter));
  }

  /**
   * Check if error should be retried based on enhanced logic
   */
  shouldRetryError(error, operationName, attempt) {
    const classification = this.classifyError(error);
    
    // Don't retry non-retryable errors
    if (!classification.retryable) {
      return false;
    }
    
    // Don't retry if circuit breaker should open
    if (this.shouldOpenCircuitBreaker(operationName, attempt)) {
      return false;
    }
    
    // Check operation-specific retry logic
    return isRetryableError(error);
  }

  /**
   * Check if operation is currently throttled
   */
  isOperationThrottled(operationName) {
    const throttleInfo = this.throttlingTracker.get(operationName);
    if (!throttleInfo) return false;
    
    const timeSinceLastThrottle = Date.now() - throttleInfo.lastOccurrence;
    const throttleWindow = 60000 * throttleInfo.backoffMultiplier; // 1 minute base window
    
    return timeSinceLastThrottle < throttleWindow;
  }

  /**
   * Get throttle delay for operation
   */
  getThrottleDelay(operationName) {
    const throttleInfo = this.throttlingTracker.get(operationName);
    if (!throttleInfo) return 0;
    
    return Math.min(5000 * throttleInfo.backoffMultiplier, 30000); // Max 30 seconds
  }

  /**
   * Reset throttling for operation
   */
  resetThrottling(operationName) {
    this.throttlingTracker.delete(operationName);
  }

  /**
   * Reset network issue tracker
   */
  resetNetworkIssueTracker() {
    this.networkIssueTracker.consecutiveFailures = 0;
    this.networkIssueTracker.backoffMultiplier = 1;
  }

  /**
   * Record enhanced success metrics
   */
  async recordEnhancedSuccess(operationName, duration, attempts, context) {
    await Promise.all([
      this.recordSuccess(operationName, duration, attempts - 1),
      this.recordMetric('OperationSuccessRate', 100, 'Percent', [
        { Name: 'OperationName', Value: operationName }
      ]),
      this.recordMetric('OperationLatencyP95', duration, 'Milliseconds', [
        { Name: 'OperationName', Value: operationName }
      ])
    ]);
    
    // Update performance metrics
    this.updatePerformanceMetrics(operationName, duration, true);
    
    // Log structured success
    await this.logStructuredEvent('operation_success', {
      operationName,
      duration,
      attempts,
      context
    });
  }

  /**
   * Record enhanced error metrics
   */
  async recordEnhancedError(errorType, error, context) {
    await Promise.all([
      this.recordError(errorType, error, context),
      this.recordMetric('ErrorsByClassification', 1, 'Count', [
        { Name: 'ErrorType', Value: errorType },
        { Name: 'Classification', Value: context.classification?.type || 'unknown' }
      ]),
      this.recordMetric('ErrorSeverity', this.getSeverityScore(context.classification), 'None', [
        { Name: 'OperationName', Value: context.operationName || 'unknown' }
      ])
    ]);
    
    // Update performance metrics
    this.updatePerformanceMetrics(context.operationName, 0, false);
    
    // Log structured error
    await this.logStructuredEvent('operation_error', {
      errorType,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      context
    });
  }

  /**
   * Get severity score for metrics
   */
  getSeverityScore(classification) {
    if (!classification) return 1;
    
    switch (classification.severity) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      case 'critical': return 4;
      default: return 2;
    }
  }

  /**
   * Update performance metrics tracking
   */
  updatePerformanceMetrics(operationName, duration, success) {
    if (!operationName) return;
    
    // Update latency tracking
    const latencies = this.performanceMetrics.operationLatencies.get(operationName) || [];
    if (success) {
      latencies.push(duration);
      // Keep only last 100 measurements
      if (latencies.length > 100) {
        latencies.shift();
      }
      this.performanceMetrics.operationLatencies.set(operationName, latencies);
    }
    
    // Update error rate tracking
    const errorRates = this.performanceMetrics.errorRates.get(operationName) || { total: 0, errors: 0 };
    errorRates.total++;
    if (!success) {
      errorRates.errors++;
    }
    this.performanceMetrics.errorRates.set(operationName, errorRates);
    
    // Update throughput tracking
    const throughput = this.performanceMetrics.throughput.get(operationName) || [];
    throughput.push({ timestamp: Date.now(), success });
    // Keep only last hour of data
    const oneHourAgo = Date.now() - 3600000;
    const recentThroughput = throughput.filter(t => t.timestamp > oneHourAgo);
    this.performanceMetrics.throughput.set(operationName, recentThroughput);
  }

  /**
   * Log structured events to CloudWatch Logs
   */
  async logStructuredEvent(eventType, data) {
    try {
      const logEvent = {
        timestamp: Date.now(),
        message: JSON.stringify({
          eventType,
          timestamp: new Date().toISOString(),
          service: 'opportunity-analysis',
          version: '1.0.0',
          ...data
        })
      };
      
      // Create log stream if needed
      const logStreamName = `error-handling-${new Date().toISOString().split('T')[0]}`;
      
      try {
        await this.cloudWatchLogsClient.send(new CreateLogStreamCommand({
          logGroupName: this.enhancedConfig.logGroupName,
          logStreamName
        }));
      } catch (error) {
        // Stream might already exist
      }
      
      await this.cloudWatchLogsClient.send(new PutLogEventsCommand({
        logGroupName: this.enhancedConfig.logGroupName,
        logStreamName,
        logEvents: [logEvent]
      }));
      
    } catch (error) {
      console.error('❌ Failed to log structured event:', error.message);
    }
  }

  /**
   * Send critical error alerts
   */
  async sendCriticalErrorAlert(operationName, error, context) {
    if (!this.enhancedConfig.alertTopicArn) return;
    
    const classification = this.classifyError(error);
    if (classification.severity !== 'high' && classification.severity !== 'critical') return;
    
    try {
      const alertMessage = {
        service: 'opportunity-analysis',
        operationName,
        error: {
          name: error.name,
          message: error.message
        },
        classification,
        context,
        timestamp: new Date().toISOString()
      };
      
      await this.snsClient.send(new PublishCommand({
        TopicArn: this.enhancedConfig.alertTopicArn,
        Subject: `Critical Error in Opportunity Analysis: ${operationName}`,
        Message: JSON.stringify(alertMessage, null, 2)
      }));
      
      console.log(`🚨 Critical error alert sent for ${operationName}`);
    } catch (alertError) {
      console.error('❌ Failed to send critical error alert:', alertError.message);
    }
  }

  /**
   * Send quota alert
   */
  async sendQuotaAlert(operationName, error) {
    if (!this.enhancedConfig.alertTopicArn) return;
    
    try {
      const alertMessage = {
        service: 'opportunity-analysis',
        alertType: 'quota_exceeded',
        operationName,
        error: {
          name: error.name,
          message: error.message
        },
        timestamp: new Date().toISOString(),
        action: 'immediate_attention_required'
      };
      
      await this.snsClient.send(new PublishCommand({
        TopicArn: this.enhancedConfig.alertTopicArn,
        Subject: `URGENT: Service Quota Exceeded - ${operationName}`,
        Message: JSON.stringify(alertMessage, null, 2)
      }));
      
      console.log(`🚨 Quota alert sent for ${operationName}`);
    } catch (alertError) {
      console.error('❌ Failed to send quota alert:', alertError.message);
    }
  }

  /**
   * Trigger network recovery procedures
   */
  async triggerNetworkRecovery(operationName, error) {
    console.log(`🌐 Triggering network recovery for ${operationName}`);
    
    // Record network recovery attempt
    await this.recordMetric('NetworkRecoveryAttempts', 1, 'Count', [
      { Name: 'OperationName', Value: operationName }
    ]);
    
    // Log network recovery event
    await this.logStructuredEvent('network_recovery_triggered', {
      operationName,
      consecutiveFailures: this.networkIssueTracker.consecutiveFailures,
      error: {
        name: error.name,
        message: error.message
      }
    });
  }

  /**
   * Record operation attempt metrics
   */
  async recordOperationAttempt(operationName, attemptNumber) {
    await this.recordMetric('OperationAttempts', 1, 'Count', [
      { Name: 'OperationName', Value: operationName },
      { Name: 'AttemptNumber', Value: attemptNumber.toString() }
    ]);
  }

  /**
   * Create comprehensive monitoring dashboard
   */
  async createMonitoringDashboard() {
    try {
      const dashboardBody = {
        widgets: [
          {
            type: "metric",
            properties: {
              metrics: [
                ["AWS/OpportunityAnalysis/ErrorHandling", "OperationSuccess", "OperationName", "bedrock-query-generation"],
                [".", "OperationErrors", ".", "."],
                [".", "OperationSuccess", ".", "lambda-data-retrieval"],
                [".", "OperationErrors", ".", "."],
                [".", "OperationSuccess", ".", "bedrock-analysis-standard"],
                [".", "OperationErrors", ".", "."]
              ],
              period: 300,
              stat: "Sum",
              region: this.region,
              title: "Operation Success vs Errors"
            }
          },
          {
            type: "metric",
            properties: {
              metrics: [
                ["AWS/OpportunityAnalysis/ErrorHandling", "OperationDuration", "OperationName", "bedrock-query-generation"],
                [".", ".", ".", "lambda-data-retrieval"],
                [".", ".", ".", "bedrock-analysis-standard"]
              ],
              period: 300,
              stat: "Average",
              region: this.region,
              title: "Average Operation Duration"
            }
          },
          {
            type: "metric",
            properties: {
              metrics: [
                ["AWS/OpportunityAnalysis/ErrorHandling", "CircuitBreakerOpened"],
                [".", "ThrottlingErrors"],
                [".", "NetworkErrors"],
                [".", "QuotaErrors"]
              ],
              period: 300,
              stat: "Sum",
              region: this.region,
              title: "Error Types"
            }
          },
          {
            type: "metric",
            properties: {
              metrics: [
                ["AWS/OpportunityAnalysis/ErrorHandling", "DLQMessagesSent"],
                [".", "DLQMessagesProcessed"],
                [".", "SuccessfulRecoveries"]
              ],
              period: 300,
              stat: "Sum",
              region: this.region,
              title: "Recovery Metrics"
            }
          }
        ]
      };
      
      await this.cloudWatchClient.send(new PutDashboardCommand({
        DashboardName: this.enhancedConfig.dashboardName,
        DashboardBody: JSON.stringify(dashboardBody)
      }));
      
      console.log(`📊 Created monitoring dashboard: ${this.enhancedConfig.dashboardName}`);
    } catch (error) {
      console.warn('⚠️ Failed to create monitoring dashboard:', error.message);
    }
  }

  /**
   * Get comprehensive error handling statistics
   */
  async getEnhancedErrorStatistics() {
    const baseStats = await this.getErrorStatistics();
    
    return {
      ...baseStats,
      throttling: Array.from(this.throttlingTracker.entries()).map(([op, info]) => ({
        operationName: op,
        throttleCount: info.count,
        backoffMultiplier: info.backoffMultiplier,
        lastOccurrence: info.lastOccurrence
      })),
      networkIssues: {
        consecutiveFailures: this.networkIssueTracker.consecutiveFailures,
        lastFailureTime: this.networkIssueTracker.lastFailureTime,
        backoffMultiplier: this.networkIssueTracker.backoffMultiplier
      },
      quotaIssues: Array.from(this.quotaTracker.entries()).map(([op, info]) => ({
        operationName: op,
        quotaErrorCount: info.count,
        firstOccurrence: info.firstOccurrence,
        lastOccurrence: info.lastOccurrence
      })),
      performanceMetrics: {
        operationLatencies: Object.fromEntries(this.performanceMetrics.operationLatencies),
        errorRates: Object.fromEntries(this.performanceMetrics.errorRates),
        throughput: Object.fromEntries(this.performanceMetrics.throughput)
      }
    };
  }

  /**
   * Health check with enhanced monitoring
   */
  async performEnhancedHealthCheck() {
    const baseHealth = await this.healthCheck();
    const stats = await this.getEnhancedErrorStatistics();
    
    const healthChecks = {
      ...baseHealth,
      throttling: {
        healthy: stats.throttling.length === 0,
        activeThrottles: stats.throttling.length,
        details: stats.throttling
      },
      networkHealth: {
        healthy: stats.networkIssues.consecutiveFailures < 3,
        consecutiveFailures: stats.networkIssues.consecutiveFailures,
        lastFailure: stats.networkIssues.lastFailureTime
      },
      quotaHealth: {
        healthy: stats.quotaIssues.length === 0,
        quotaIssues: stats.quotaIssues.length,
        details: stats.quotaIssues
      }
    };
    
    const overallHealthy = baseHealth.healthy && 
                          healthChecks.throttling.healthy && 
                          healthChecks.networkHealth.healthy && 
                          healthChecks.quotaHealth.healthy;
    
    return {
      ...healthChecks,
      healthy: overallHealthy,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { EnhancedErrorHandlingService };