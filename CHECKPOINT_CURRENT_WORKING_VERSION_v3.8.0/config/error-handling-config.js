/**
 * Error Handling Configuration
 * Centralized configuration for error handling patterns and thresholds
 */

const errorHandlingConfig = {
  // Circuit Breaker Configuration
  circuitBreaker: {
    // Number of failures before opening circuit breaker
    failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 5,
    
    // Time to wait before attempting to close circuit breaker (milliseconds)
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 60000,
    
    // Monitor window for failure counting (milliseconds)
    monitoringWindow: parseInt(process.env.CIRCUIT_BREAKER_WINDOW) || 300000,
    
    // Operations that should use circuit breaker
    enabledOperations: [
      'bedrock-query-generation',
      'bedrock-analysis-standard',
      'bedrock-analysis-nova-premier',
      'lambda-data-retrieval',
      'athena-query-execution'
    ]
  },

  // Retry Configuration
  retry: {
    // Maximum number of retry attempts
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS) || 5,
    
    // Base delay for exponential backoff (milliseconds)
    baseDelay: parseInt(process.env.RETRY_BASE_DELAY) || 1000,
    
    // Maximum delay between retries (milliseconds)
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY) || 30000,
    
    // Jitter percentage (0-1) to add randomness to delays
    jitterFactor: parseFloat(process.env.RETRY_JITTER_FACTOR) || 0.25,
    
    // Operations that should be retried
    retryableOperations: [
      'bedrock-query-generation',
      'bedrock-analysis-standard',
      'bedrock-analysis-nova-premier',
      'lambda-data-retrieval',
      'athena-query-execution',
      'dynamodb-operation',
      's3-operation'
    ],
    
    // Error types that should trigger retries
    retryableErrors: [
      'TimeoutError',
      'ThrottlingException',
      'ServiceUnavailableException',
      'InternalServerError',
      'NetworkError',
      'TemporaryFailure'
    ]
  },

  // Dead Letter Queue Configuration
  deadLetterQueue: {
    // URL of the dead letter queue
    url: process.env.ERROR_DLQ_URL,
    
    // Maximum number of messages to process at once
    maxBatchSize: parseInt(process.env.DLQ_MAX_BATCH_SIZE) || 10,
    
    // Visibility timeout for DLQ messages (seconds)
    visibilityTimeout: parseInt(process.env.DLQ_VISIBILITY_TIMEOUT) || 300,
    
    // Maximum number of recovery attempts per message
    maxRecoveryAttempts: parseInt(process.env.DLQ_MAX_RECOVERY_ATTEMPTS) || 3,
    
    // Operations that should use DLQ
    enabledOperations: [
      'bedrock-query-generation',
      'bedrock-analysis-standard',
      'bedrock-analysis-nova-premier',
      'lambda-data-retrieval',
      'complete-analysis-workflow'
    ]
  },

  // Recovery Configuration
  recovery: {
    // URL of the error recovery queue
    queueUrl: process.env.ERROR_RECOVERY_QUEUE_URL,
    
    // ARN of the error recovery Lambda function
    lambdaArn: process.env.ERROR_RECOVERY_LAMBDA,
    
    // ARN of the error recovery Step Functions state machine
    stateMachineArn: process.env.ERROR_RECOVERY_STATE_MACHINE,
    
    // Recovery strategies for different error types
    strategies: {
      'TimeoutError': 'retry_with_backoff',
      'ThrottlingException': 'retry_with_backoff',
      'CredentialsError': 'refresh_credentials',
      'NetworkError': 'network_recovery',
      'BedrockError': 'bedrock_fallback',
      'LambdaError': 'lambda_recovery',
      'UnknownError': 'generic_retry'
    },
    
    // Fallback models for Bedrock operations
    bedrockFallbacks: {
      'amazon.nova-premier-v1:0': 'amazon.titan-text-express-v1',
      'amazon.titan-text-express-v1': 'amazon.titan-text-lite-v1'
    }
  },

  // Incident Response Configuration
  incidentResponse: {
    // SSM document name for incident response
    documentName: process.env.INCIDENT_RESPONSE_DOCUMENT || 'OpportunityAnalysis-IncidentResponse',
    
    // SNS topic ARN for alerts
    alertTopicArn: process.env.ALERT_TOPIC_ARN,
    
    // Severity levels that trigger incident response
    triggerSeverities: ['HIGH', 'CRITICAL'],
    
    // Operations that trigger incident response on failure
    criticalOperations: [
      'complete-analysis-workflow',
      'bedrock-analysis-standard',
      'bedrock-analysis-nova-premier'
    ],
    
    // Escalation thresholds
    escalation: {
      // Number of failures in time window to trigger escalation
      failureThreshold: parseInt(process.env.INCIDENT_FAILURE_THRESHOLD) || 10,
      
      // Time window for counting failures (milliseconds)
      timeWindow: parseInt(process.env.INCIDENT_TIME_WINDOW) || 300000,
      
      // Cooldown period between incident responses (milliseconds)
      cooldownPeriod: parseInt(process.env.INCIDENT_COOLDOWN) || 600000
    }
  },

  // Monitoring Configuration
  monitoring: {
    // CloudWatch namespace for error handling metrics
    namespace: 'AWS/OpportunityAnalysis/ErrorHandling',
    
    // Metrics to track
    metrics: {
      operationSuccess: 'OperationSuccess',
      operationFailure: 'OperationErrors',
      operationDuration: 'OperationDuration',
      circuitBreakerOpen: 'CircuitBreakerOpened',
      dlqMessagesSent: 'DLQMessagesSent',
      dlqMessagesProcessed: 'DLQMessagesProcessed',
      recoveryAttempts: 'RecoveryAttempts',
      recoverySuccess: 'SuccessfulRecoveries',
      incidentResponse: 'IncidentResponseTriggered'
    },
    
    // Alarm thresholds
    alarms: {
      errorRate: {
        threshold: parseFloat(process.env.ERROR_RATE_THRESHOLD) || 0.1, // 10%
        evaluationPeriods: parseInt(process.env.ERROR_RATE_EVAL_PERIODS) || 2,
        period: parseInt(process.env.ERROR_RATE_PERIOD) || 300 // 5 minutes
      },
      circuitBreakerOpen: {
        threshold: 1,
        evaluationPeriods: 1,
        period: 60 // 1 minute
      },
      dlqMessages: {
        threshold: parseInt(process.env.DLQ_ALARM_THRESHOLD) || 5,
        evaluationPeriods: 2,
        period: 300 // 5 minutes
      }
    }
  },

  // Logging Configuration
  logging: {
    // Log level for error handling
    level: process.env.ERROR_HANDLING_LOG_LEVEL || 'INFO',
    
    // Whether to log detailed error context
    includeContext: process.env.ERROR_HANDLING_INCLUDE_CONTEXT !== 'false',
    
    // Whether to log stack traces
    includeStackTrace: process.env.ERROR_HANDLING_INCLUDE_STACK !== 'false',
    
    // CloudWatch log group for error handling
    logGroup: '/aws/opportunity-analysis/error-handling'
  },

  // Feature Flags
  features: {
    // Enable/disable circuit breaker
    circuitBreakerEnabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
    
    // Enable/disable dead letter queue
    dlqEnabled: process.env.DLQ_ENABLED !== 'false',
    
    // Enable/disable automated recovery
    recoveryEnabled: process.env.RECOVERY_ENABLED !== 'false',
    
    // Enable/disable incident response
    incidentResponseEnabled: process.env.INCIDENT_RESPONSE_ENABLED !== 'false',
    
    // Enable/disable enhanced error metrics
    enhancedMetricsEnabled: process.env.ENHANCED_METRICS_ENABLED !== 'false'
  }
};

/**
 * Get configuration for a specific operation
 */
function getOperationConfig(operationName) {
  return {
    circuitBreakerEnabled: errorHandlingConfig.features.circuitBreakerEnabled && 
                          errorHandlingConfig.circuitBreaker.enabledOperations.includes(operationName),
    
    retryEnabled: errorHandlingConfig.retry.retryableOperations.includes(operationName),
    
    dlqEnabled: errorHandlingConfig.features.dlqEnabled && 
                errorHandlingConfig.deadLetterQueue.enabledOperations.includes(operationName),
    
    incidentResponseEnabled: errorHandlingConfig.features.incidentResponseEnabled && 
                            errorHandlingConfig.incidentResponse.criticalOperations.includes(operationName),
    
    maxRetries: errorHandlingConfig.retry.maxAttempts,
    baseDelay: errorHandlingConfig.retry.baseDelay,
    maxDelay: errorHandlingConfig.retry.maxDelay,
    circuitBreakerThreshold: errorHandlingConfig.circuitBreaker.failureThreshold,
    circuitBreakerTimeout: errorHandlingConfig.circuitBreaker.timeout
  };
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error) {
  const errorName = error.name || error.constructor.name;
  const errorMessage = error.message || '';
  
  // Check by error name
  if (errorHandlingConfig.retry.retryableErrors.includes(errorName)) {
    return true;
  }
  
  // Check by error message patterns
  const retryablePatterns = [
    /timeout/i,
    /throttl/i,
    /rate.?limit/i,
    /service.?unavailable/i,
    /internal.?server.?error/i,
    /temporary/i,
    /network/i,
    /connection/i
  ];
  
  return retryablePatterns.some(pattern => pattern.test(errorMessage));
}

/**
 * Get recovery strategy for an error
 */
function getRecoveryStrategy(error, operationName) {
  const errorName = error.name || error.constructor.name;
  
  // Check specific error type strategies
  if (errorHandlingConfig.recovery.strategies[errorName]) {
    return errorHandlingConfig.recovery.strategies[errorName];
  }
  
  // Check operation-specific strategies
  if (operationName.includes('bedrock')) {
    return 'bedrock_fallback';
  } else if (operationName.includes('lambda')) {
    return 'lambda_recovery';
  } else if (operationName.includes('network') || error.message.toLowerCase().includes('network')) {
    return 'network_recovery';
  } else if (error.message.toLowerCase().includes('timeout') || error.message.toLowerCase().includes('throttl')) {
    return 'retry_with_backoff';
  }
  
  return 'generic_retry';
}

/**
 * Validate error handling configuration
 */
function validateConfig() {
  const errors = [];
  
  if (errorHandlingConfig.features.dlqEnabled && !errorHandlingConfig.deadLetterQueue.url) {
    errors.push('DLQ is enabled but ERROR_DLQ_URL is not configured');
  }
  
  if (errorHandlingConfig.features.recoveryEnabled && !errorHandlingConfig.recovery.lambdaArn) {
    errors.push('Recovery is enabled but ERROR_RECOVERY_LAMBDA is not configured');
  }
  
  if (errorHandlingConfig.features.incidentResponseEnabled && !errorHandlingConfig.incidentResponse.documentName) {
    errors.push('Incident response is enabled but INCIDENT_RESPONSE_DOCUMENT is not configured');
  }
  
  if (errorHandlingConfig.circuitBreaker.failureThreshold <= 0) {
    errors.push('Circuit breaker failure threshold must be greater than 0');
  }
  
  if (errorHandlingConfig.retry.maxAttempts <= 0) {
    errors.push('Max retry attempts must be greater than 0');
  }
  
  return errors;
}

module.exports = {
  errorHandlingConfig,
  getOperationConfig,
  isRetryableError,
  getRecoveryStrategy,
  validateConfig
};