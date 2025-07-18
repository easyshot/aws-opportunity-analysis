/**
 * Enhanced Error Handling and Monitoring Configuration
 * Centralized configuration for Task 6 implementation
 */

const { errorHandlingConfig } = require('./error-handling-config');

const enhancedErrorMonitoringConfig = {
  // Enhanced Error Handling Configuration
  errorHandling: {
    ...errorHandlingConfig,
    
    // Enhanced retry configuration
    enhancedRetry: {
      // Adaptive retry delays based on error type
      adaptiveDelays: {
        throttling: {
          baseDelay: 2000,
          maxDelay: 60000,
          multiplier: 2.0
        },
        network: {
          baseDelay: 1500,
          maxDelay: 45000,
          multiplier: 1.5
        },
        timeout: {
          baseDelay: 1000,
          maxDelay: 30000,
          multiplier: 2.0
        },
        quota: {
          baseDelay: 5000,
          maxDelay: 120000,
          multiplier: 3.0
        }
      },
      
      // Custom retry logic per operation
      operationSpecificRetry: {
        'bedrock-query-generation': {
          maxRetries: 5,
          customBackoff: true,
          timeoutMultiplier: 1.2
        },
        'lambda-data-retrieval': {
          maxRetries: 7,
          customBackoff: true,
          timeoutMultiplier: 1.5
        },
        'bedrock-analysis-standard': {
          maxRetries: 3,
          customBackoff: true,
          timeoutMultiplier: 1.0
        },
        'bedrock-analysis-nova-premier': {
          maxRetries: 3,
          customBackoff: true,
          timeoutMultiplier: 1.3
        }
      }
    },
    
    // Enhanced circuit breaker configuration
    enhancedCircuitBreaker: {
      // Different thresholds per operation type
      operationThresholds: {
        'bedrock-query-generation': 3,
        'lambda-data-retrieval': 5,
        'bedrock-analysis-standard': 3,
        'bedrock-analysis-nova-premier': 2
      },
      
      // Adaptive timeout based on recent performance
      adaptiveTimeout: true,
      
      // Half-open state testing
      halfOpenTestRequests: 3,
      
      // Circuit breaker recovery strategies
      recoveryStrategies: {
        'bedrock-query-generation': 'gradual_recovery',
        'lambda-data-retrieval': 'immediate_recovery',
        'bedrock-analysis-standard': 'gradual_recovery',
        'bedrock-analysis-nova-premier': 'cautious_recovery'
      }
    },
    
    // Throttling and quota management
    throttlingManagement: {
      // Intelligent throttling detection
      detectionPatterns: [
        /throttl/i,
        /rate.?limit/i,
        /too.?many.?requests/i,
        /quota.?exceeded/i,
        /limit.?exceeded/i
      ],
      
      // Adaptive backoff for different services
      serviceBackoffs: {
        bedrock: {
          initialDelay: 2000,
          maxDelay: 60000,
          multiplier: 2.5
        },
        lambda: {
          initialDelay: 1000,
          maxDelay: 30000,
          multiplier: 2.0
        },
        athena: {
          initialDelay: 5000,
          maxDelay: 120000,
          multiplier: 3.0
        }
      },
      
      // Quota monitoring thresholds
      quotaThresholds: {
        bedrock: {
          warningThreshold: 0.8,
          criticalThreshold: 0.95
        },
        lambda: {
          warningThreshold: 0.85,
          criticalThreshold: 0.95
        }
      }
    },
    
    // Network error handling
    networkErrorHandling: {
      // Network issue detection patterns
      networkPatterns: [
        /network/i,
        /connection/i,
        /timeout/i,
        /unreachable/i,
        /dns/i,
        /socket/i
      ],
      
      // Progressive backoff for network issues
      progressiveBackoff: {
        initialDelay: 1000,
        maxDelay: 60000,
        progressionFactor: 1.5,
        maxConsecutiveFailures: 5
      },
      
      // Network recovery strategies
      recoveryStrategies: {
        dns_resolution: 'retry_with_delay',
        connection_timeout: 'exponential_backoff',
        socket_error: 'circuit_breaker',
        network_unreachable: 'extended_backoff'
      }
    }
  },
  
  // Enhanced Monitoring Configuration
  monitoring: {
    // CloudWatch metrics configuration
    cloudWatch: {
      namespace: 'AWS/OpportunityAnalysis/Enhanced',
      region: process.env.AWS_REGION || 'us-east-1',
      
      // Metric categories
      metricCategories: {
        performance: {
          enabled: true,
          metrics: [
            'OperationDuration',
            'OperationLatencyP50',
            'OperationLatencyP95',
            'OperationLatencyP99',
            'ThroughputPerSecond'
          ]
        },
        reliability: {
          enabled: true,
          metrics: [
            'OperationSuccessRate',
            'ErrorRate',
            'CircuitBreakerState',
            'RetryAttempts',
            'RecoverySuccess'
          ]
        },
        business: {
          enabled: true,
          metrics: [
            'AnalysisRequests',
            'CustomerRegionDistribution',
            'AnalysisTypeUsage',
            'ConfidenceScores',
            'PredictionAccuracy'
          ]
        },
        resource: {
          enabled: true,
          metrics: [
            'TokensUsed',
            'DataProcessed',
            'CacheHitRate',
            'ResourceUtilization',
            'CostPerAnalysis'
          ]
        }
      },
      
      // Metric aggregation settings
      aggregation: {
        defaultPeriod: 300, // 5 minutes
        detailedPeriod: 60,  // 1 minute for detailed metrics
        summaryPeriod: 3600, // 1 hour for summary metrics
        
        // Statistics to collect
        statistics: ['Average', 'Maximum', 'Minimum', 'Sum', 'SampleCount']
      },
      
      // Anomaly detection configuration
      anomalyDetection: {
        enabled: process.env.ANOMALY_DETECTION_ENABLED !== 'false',
        
        // Metrics to monitor for anomalies
        monitoredMetrics: [
          'OperationDuration',
          'ErrorRate',
          'ThroughputPerSecond',
          'ConfidenceScores'
        ],
        
        // Anomaly detection sensitivity
        sensitivity: {
          high: ['ErrorRate', 'CircuitBreakerState'],
          medium: ['OperationDuration', 'ThroughputPerSecond'],
          low: ['ConfidenceScores', 'ResourceUtilization']
        }
      }
    },
    
    // Structured logging configuration
    logging: {
      logGroups: {
        application: '/aws/opportunity-analysis/application',
        errorHandling: '/aws/opportunity-analysis/error-handling',
        monitoring: '/aws/opportunity-analysis/enhanced-monitoring',
        performance: '/aws/opportunity-analysis/performance'
      },
      
      // Log levels and filtering
      levels: {
        error: { enabled: true, retention: 30 },
        warn: { enabled: true, retention: 14 },
        info: { enabled: true, retention: 7 },
        debug: { enabled: process.env.NODE_ENV === 'development', retention: 3 }
      },
      
      // Structured logging format
      format: {
        timestamp: true,
        traceId: true,
        requestId: true,
        service: 'opportunity-analysis',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production'
      },
      
      // Sensitive data masking
      sensitiveDataMasking: {
        enabled: process.env.SENSITIVE_DATA_MASKING !== 'false',
        patterns: [
          { field: 'customerName', mask: '***' },
          { field: 'email', mask: 'email@***.com' },
          { field: 'phone', mask: '***-***-****' },
          { field: 'address', mask: '*** *** ***' }
        ]
      }
    },
    
    // Dashboard configuration
    dashboards: {
      // Main operational dashboard
      operational: {
        name: 'OpportunityAnalysis-Operational',
        widgets: [
          'workflow_overview',
          'performance_metrics',
          'error_rates',
          'regional_distribution',
          'analysis_types',
          'confidence_scores'
        ],
        refreshInterval: 300 // 5 minutes
      },
      
      // Error handling dashboard
      errorHandling: {
        name: 'OpportunityAnalysis-ErrorHandling',
        widgets: [
          'error_overview',
          'circuit_breaker_status',
          'retry_patterns',
          'throttling_metrics',
          'network_issues',
          'recovery_success'
        ],
        refreshInterval: 60 // 1 minute
      },
      
      // Performance dashboard
      performance: {
        name: 'OpportunityAnalysis-Performance',
        widgets: [
          'latency_percentiles',
          'throughput_trends',
          'resource_utilization',
          'cost_analysis',
          'capacity_planning',
          'sla_compliance'
        ],
        refreshInterval: 300 // 5 minutes
      },
      
      // Business metrics dashboard
      business: {
        name: 'OpportunityAnalysis-Business',
        widgets: [
          'analysis_volume',
          'customer_segments',
          'prediction_accuracy',
          'model_performance',
          'roi_metrics',
          'usage_patterns'
        ],
        refreshInterval: 3600 // 1 hour
      }
    },
    
    // Alerting configuration
    alerting: {
      // SNS topics for different alert types
      topics: {
        critical: process.env.CRITICAL_ALERT_TOPIC_ARN,
        warning: process.env.WARNING_ALERT_TOPIC_ARN,
        info: process.env.INFO_ALERT_TOPIC_ARN
      },
      
      // Alert thresholds
      thresholds: {
        errorRate: {
          warning: 5.0,  // 5%
          critical: 10.0 // 10%
        },
        latency: {
          warning: 30000,  // 30 seconds
          critical: 60000  // 60 seconds
        },
        throughput: {
          warning: 10,  // requests per minute
          critical: 5   // requests per minute
        },
        circuitBreaker: {
          warning: 1,  // any circuit breaker open
          critical: 3  // multiple circuit breakers open
        }
      },
      
      // Alert suppression to prevent spam
      suppression: {
        enabled: true,
        cooldownPeriod: 300, // 5 minutes
        maxAlertsPerHour: 10
      }
    }
  },
  
  // Health check configuration
  healthChecks: {
    // Health check intervals
    intervals: {
      basic: 30000,     // 30 seconds
      detailed: 300000, // 5 minutes
      comprehensive: 900000 // 15 minutes
    },
    
    // Health check endpoints
    endpoints: {
      errorHandling: '/health/error-handling',
      monitoring: '/health/monitoring',
      performance: '/health/performance',
      overall: '/health'
    },
    
    // Health check criteria
    criteria: {
      errorHandling: {
        maxOpenCircuitBreakers: 2,
        maxConsecutiveNetworkFailures: 3,
        maxThrottledOperations: 5
      },
      monitoring: {
        maxMetricsBufferSize: 80, // 80% of max buffer
        minAnomalyDetectors: 3,
        maxLogIngestionDelay: 60000 // 1 minute
      },
      performance: {
        maxAverageLatency: 30000, // 30 seconds
        minSuccessRate: 95.0,     // 95%
        maxErrorRate: 5.0         // 5%
      }
    }
  },
  
  // Integration settings
  integration: {
    // Feature flags for gradual rollout
    featureFlags: {
      enhancedErrorHandling: process.env.ENHANCED_ERROR_HANDLING_ENABLED !== 'false',
      enhancedMonitoring: process.env.ENHANCED_MONITORING_ENABLED !== 'false',
      anomalyDetection: process.env.ANOMALY_DETECTION_ENABLED !== 'false',
      detailedLogging: process.env.DETAILED_LOGGING_ENABLED !== 'false',
      realTimeAlerting: process.env.REAL_TIME_ALERTING_ENABLED !== 'false'
    },
    
    // Backward compatibility
    backwardCompatibility: {
      enabled: true,
      fallbackToBasicErrorHandling: true,
      fallbackToBasicMonitoring: true
    },
    
    // Performance optimization
    optimization: {
      metricsBuffering: true,
      batchMetricsSending: true,
      asyncLogging: true,
      cacheHealthChecks: true
    }
  }
};

/**
 * Get configuration for specific component
 */
function getComponentConfig(component) {
  return enhancedErrorMonitoringConfig[component] || {};
}

/**
 * Get operation-specific configuration
 */
function getOperationSpecificConfig(operationName, component = 'errorHandling') {
  const config = enhancedErrorMonitoringConfig[component];
  
  if (component === 'errorHandling') {
    return {
      retry: config.enhancedRetry?.operationSpecificRetry?.[operationName] || config.retry,
      circuitBreaker: {
        threshold: config.enhancedCircuitBreaker?.operationThresholds?.[operationName] || config.circuitBreaker.failureThreshold,
        timeout: config.circuitBreaker.timeout,
        recoveryStrategy: config.enhancedCircuitBreaker?.recoveryStrategies?.[operationName] || 'gradual_recovery'
      },
      throttling: config.throttlingManagement
    };
  }
  
  return config;
}

/**
 * Validate configuration
 */
function validateEnhancedConfig() {
  const errors = [];
  
  // Validate error handling configuration
  if (!enhancedErrorMonitoringConfig.errorHandling) {
    errors.push('Error handling configuration is missing');
  }
  
  // Validate monitoring configuration
  if (!enhancedErrorMonitoringConfig.monitoring) {
    errors.push('Monitoring configuration is missing');
  }
  
  // Validate required environment variables
  const requiredEnvVars = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
  ];
  
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      errors.push(`Required environment variable ${envVar} is not set`);
    }
  });
  
  // Validate optional but recommended environment variables
  const recommendedEnvVars = [
    'ERROR_DLQ_URL',
    'ERROR_ALERT_TOPIC_ARN',
    'CRITICAL_ALERT_TOPIC_ARN'
  ];
  
  recommendedEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      console.warn(`⚠️ Recommended environment variable ${envVar} is not set`);
    }
  });
  
  return errors;
}

/**
 * Get environment-specific configuration
 */
function getEnvironmentConfig() {
  const environment = process.env.NODE_ENV || 'production';
  
  const environmentConfigs = {
    development: {
      logging: { levels: { debug: { enabled: true } } },
      monitoring: { cloudWatch: { aggregation: { detailedPeriod: 60 } } },
      alerting: { suppression: { enabled: false } }
    },
    staging: {
      logging: { levels: { debug: { enabled: false } } },
      monitoring: { cloudWatch: { aggregation: { detailedPeriod: 300 } } },
      alerting: { suppression: { enabled: true } }
    },
    production: {
      logging: { levels: { debug: { enabled: false } } },
      monitoring: { cloudWatch: { aggregation: { detailedPeriod: 300 } } },
      alerting: { suppression: { enabled: true } }
    }
  };
  
  return environmentConfigs[environment] || environmentConfigs.production;
}

module.exports = {
  enhancedErrorMonitoringConfig,
  getComponentConfig,
  getOperationSpecificConfig,
  validateEnhancedConfig,
  getEnvironmentConfig
};