/**
 * Performance Monitoring and Alerting Service
 * Implements Task 7.6: Set up performance monitoring and alerting
 */

const { CloudWatchClient, PutMetricDataCommand, PutAnomalyDetectorCommand, PutDashboardCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { EnhancedMonitoringService } = require('./enhanced-monitoring-service');

class PerformanceMonitoringService extends EnhancedMonitoringService {
  constructor(options = {}) {
    super(options);
    
    this.performanceConfig = {
      // Performance thresholds for alerting
      thresholds: {
        responseTime: {
          warning: 20000,    // 20 seconds
          critical: 30000    // 30 seconds
        },
        throughput: {
          warning: 10,       // requests per minute
          critical: 5        // requests per minute
        },
        errorRate: {
          warning: 5,        // 5%
          critical: 10       // 10%
        },
        cacheHitRate: {
          warning: 70,       // 70%
          critical: 50       // 50%
        },
        memoryUsage: {
          warning: 80,       // 80%
          critical: 90       // 90%
        },
        connectionPoolUtilization: {
          warning: 80,       // 80%
          critical: 95       // 95%
        }
      },
      
      // Alerting configuration
      alerting: {
        snsTopicArn: process.env.PERFORMANCE_ALERTS_TOPIC_ARN,
        emailEndpoint: process.env.PERFORMANCE_ALERTS_EMAIL,
        slackWebhook: process.env.PERFORMANCE_ALERTS_SLACK_WEBHOOK
      },
      
      // Dashboard configuration
      dashboard: {
        name: 'AWS-OpportunityAnalysis-Performance-Dashboard',
        refreshInterval: 300, // 5 minutes
        widgets: []
      },
      
      ...options
    };
    
    // Performance metrics tracking
    this.performanceMetrics = {
      responseTimeHistory: [],
      throughputHistory: [],
      errorRateHistory: [],
      cacheMetrics: new Map(),
      systemMetrics: new Map()
    };
    
    // Alert state tracking
    this.alertStates = new Map();
    
    // SNS client for alerts
    this.snsClient = new SNSClient({ region: process.env.AWS_REGION });
    
    console.log('📊 Performance Monitoring Service initialized');
  }

  /**
   * Initialize performance monitoring and alerting
   */
  async initializePerformanceMonitoring() {
    try {
      console.log('🔧 Initializing performance monitoring...');
      
      // Create performance dashboard
      await this.createPerformanceDashboard();
      
      // Setup anomaly detection
      await this.setupPerformanceAnomalyDetection();
      
      // Start monitoring loops
      this.startPerformanceMonitoring();
      
      // Setup alerting
      await this.setupPerformanceAlerting();
      
      console.log('✅ Performance monitoring fully initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize performance monitoring:', error);
      throw error;
    }
  }

  /**
   * Monitor analysis performance in real-time
   */
  async monitorAnalysisPerformance(analysisData) {
    const {
      requestId,
      startTime,
      endTime,
      steps,
      success,
      errorType,
      cacheHit,
      region,
      analysisType
    } = analysisData;
    
    const totalDuration = endTime - startTime;
    
    try {
      // Record core performance metrics
      await this.recordPerformanceMetrics({
        requestId,
        totalDuration,
        steps,
        success,
        errorType,
        cacheHit,
        region,
        analysisType
      });
      
      // Check performance thresholds
      await this.checkPerformanceThresholds({
        totalDuration,
        success,
        region,
        analysisType
      });
      
      // Update performance history
      this.updatePerformanceHistory({
        timestamp: endTime,
        duration: totalDuration,
        success,
        cacheHit,
        region
      });
      
      // Trigger alerts if needed
      await this.evaluatePerformanceAlerts();
      
    } catch (error) {
      console.error('❌ Performance monitoring error:', error);
    }
  }

  /**
   * Record comprehensive performance metrics
   */
  async recordPerformanceMetrics(data) {
    const {
      requestId,
      totalDuration,
      steps,
      success,
      errorType,
      cacheHit,
      region,
      analysisType
    } = data;
    
    const timestamp = new Date();
    const dimensions = [
      { Name: 'Region', Value: region },
      { Name: 'AnalysisType', Value: analysisType },
      { Name: 'Service', Value: 'opportunity-analysis' }
    ];
    
    try {
      // Core performance metrics
      const metrics = [
        {
          MetricName: 'AnalysisResponseTime',
          Value: totalDuration,
          Unit: 'Milliseconds',
          Timestamp: timestamp,
          Dimensions: dimensions
        },
        {
          MetricName: 'AnalysisSuccess',
          Value: success ? 1 : 0,
          Unit: 'Count',
          Timestamp: timestamp,
          Dimensions: dimensions
        },
        {
          MetricName: 'CacheHitRate',
          Value: cacheHit ? 100 : 0,
          Unit: 'Percent',
          Timestamp: timestamp,
          Dimensions: dimensions
        }
      ];
      
      // Step-specific metrics
      if (steps && Array.isArray(steps)) {
        for (const step of steps) {
          metrics.push({
            MetricName: `${step.step}Duration`,
            Value: step.duration || 0,
            Unit: 'Milliseconds',
            Timestamp: timestamp,
            Dimensions: [
              ...dimensions,
              { Name: 'Step', Value: step.step }
            ]
          });
          
          metrics.push({
            MetricName: `${step.step}Success`,
            Value: step.success ? 1 : 0,
            Unit: 'Count',
            Timestamp: timestamp,
            Dimensions: [
              ...dimensions,
              { Name: 'Step', Value: step.step }
            ]
          });
        }
      }
      
      // Error metrics
      if (!success && errorType) {
        metrics.push({
          MetricName: 'AnalysisErrors',
          Value: 1,
          Unit: 'Count',
          Timestamp: timestamp,
          Dimensions: [
            ...dimensions,
            { Name: 'ErrorType', Value: errorType }
          ]
        });
      }
      
      // Send metrics to CloudWatch
      await this.sendMetricsToCloudWatch(metrics);
      
      console.log(`📊 Recorded ${metrics.length} performance metrics for request ${requestId}`);
      
    } catch (error) {
      console.error('❌ Failed to record performance metrics:', error);
    }
  }

  /**
   * Send metrics to CloudWatch in batches
   */
  async sendMetricsToCloudWatch(metrics) {
    const batchSize = 20; // CloudWatch limit
    
    for (let i = 0; i < metrics.length; i += batchSize) {
      const batch = metrics.slice(i, i + batchSize);
      
      try {
        await this.cloudWatchClient.send(new PutMetricDataCommand({
          Namespace: 'AWS/OpportunityAnalysis/Performance',
          MetricData: batch
        }));
      } catch (error) {
        console.error(`❌ Failed to send metrics batch ${i / batchSize + 1}:`, error);
      }
    }
  }

  /**
   * Check performance thresholds and trigger alerts
   */
  async checkPerformanceThresholds(data) {
    const { totalDuration, success, region, analysisType } = data;
    const thresholds = this.performanceConfig.thresholds;
    
    // Check response time thresholds
    if (totalDuration > thresholds.responseTime.critical) {
      await this.triggerAlert('CRITICAL', 'ResponseTime', {
        message: `Critical response time: ${totalDuration}ms exceeds ${thresholds.responseTime.critical}ms`,
        region,
        analysisType,
        actualValue: totalDuration,
        threshold: thresholds.responseTime.critical
      });
    } else if (totalDuration > thresholds.responseTime.warning) {
      await this.triggerAlert('WARNING', 'ResponseTime', {
        message: `Warning response time: ${totalDuration}ms exceeds ${thresholds.responseTime.warning}ms`,
        region,
        analysisType,
        actualValue: totalDuration,
        threshold: thresholds.responseTime.warning
      });
    }
    
    // Check error rate (calculated from recent history)
    const recentErrors = this.calculateRecentErrorRate();
    if (recentErrors > thresholds.errorRate.critical) {
      await this.triggerAlert('CRITICAL', 'ErrorRate', {
        message: `Critical error rate: ${recentErrors}% exceeds ${thresholds.errorRate.critical}%`,
        region,
        analysisType,
        actualValue: recentErrors,
        threshold: thresholds.errorRate.critical
      });
    } else if (recentErrors > thresholds.errorRate.warning) {
      await this.triggerAlert('WARNING', 'ErrorRate', {
        message: `Warning error rate: ${recentErrors}% exceeds ${thresholds.errorRate.warning}%`,
        region,
        analysisType,
        actualValue: recentErrors,
        threshold: thresholds.errorRate.warning
      });
    }
  }

  /**
   * Monitor system performance metrics
   */
  async monitorSystemPerformance() {
    try {
      // Memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      
      // Record system metrics
      await this.recordEnhancedMetric('SystemMemoryUsage', memoryUsagePercent, 'Percent');
      await this.recordEnhancedMetric('SystemHeapUsed', memoryUsage.heapUsed / 1024 / 1024, 'Megabytes');
      await this.recordEnhancedMetric('SystemHeapTotal', memoryUsage.heapTotal / 1024 / 1024, 'Megabytes');
      
      // Check system thresholds
      if (memoryUsagePercent > this.performanceConfig.thresholds.memoryUsage.critical) {
        await this.triggerAlert('CRITICAL', 'SystemMemory', {
          message: `Critical memory usage: ${memoryUsagePercent.toFixed(2)}%`,
          actualValue: memoryUsagePercent,
          threshold: this.performanceConfig.thresholds.memoryUsage.critical
        });
      } else if (memoryUsagePercent > this.performanceConfig.thresholds.memoryUsage.warning) {
        await this.triggerAlert('WARNING', 'SystemMemory', {
          message: `Warning memory usage: ${memoryUsagePercent.toFixed(2)}%`,
          actualValue: memoryUsagePercent,
          threshold: this.performanceConfig.thresholds.memoryUsage.warning
        });
      }
      
    } catch (error) {
      console.error('❌ System performance monitoring error:', error);
    }
  }

  /**
   * Monitor cache performance
   */
  async monitorCachePerformance(cacheService) {
    if (!cacheService) return;
    
    try {
      // Get cache statistics
      const stats = await cacheService.getEnhancedStats();
      
      if (stats.performance) {
        const hitRate = parseFloat(stats.performance.hitRate);
        const memoryUsage = stats.performance.memoryUsage;
        const maxMemory = stats.performance.maxMemory;
        
        // Record cache metrics
        await this.recordEnhancedMetric('CacheHitRate', hitRate, 'Percent');
        await this.recordEnhancedMetric('CacheMemoryUsage', memoryUsage, 'Bytes');
        
        if (maxMemory > 0) {
          const memoryUtilization = (memoryUsage / maxMemory) * 100;
          await this.recordEnhancedMetric('CacheMemoryUtilization', memoryUtilization, 'Percent');
        }
        
        // Check cache performance thresholds
        if (hitRate < this.performanceConfig.thresholds.cacheHitRate.critical) {
          await this.triggerAlert('CRITICAL', 'CacheHitRate', {
            message: `Critical cache hit rate: ${hitRate}%`,
            actualValue: hitRate,
            threshold: this.performanceConfig.thresholds.cacheHitRate.critical
          });
        } else if (hitRate < this.performanceConfig.thresholds.cacheHitRate.warning) {
          await this.triggerAlert('WARNING', 'CacheHitRate', {
            message: `Warning cache hit rate: ${hitRate}%`,
            actualValue: hitRate,
            threshold: this.performanceConfig.thresholds.cacheHitRate.warning
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Cache performance monitoring error:', error);
    }
  }

  /**
   * Monitor connection pool performance
   */
  async monitorConnectionPoolPerformance(connectionPools) {
    if (!connectionPools || connectionPools.size === 0) return;
    
    try {
      for (const [poolType, pool] of connectionPools) {
        const utilization = (pool.activeConnections / pool.maxConnections) * 100;
        const successRate = pool.stats.totalRequests > 0 ? 
          (pool.stats.successfulRequests / pool.stats.totalRequests) * 100 : 100;
        
        // Record connection pool metrics
        await this.recordEnhancedMetric('ConnectionPoolUtilization', utilization, 'Percent', [
          { Name: 'PoolType', Value: poolType }
        ]);
        
        await this.recordEnhancedMetric('ConnectionPoolSuccessRate', successRate, 'Percent', [
          { Name: 'PoolType', Value: poolType }
        ]);
        
        await this.recordEnhancedMetric('ConnectionPoolActiveConnections', pool.activeConnections, 'Count', [
          { Name: 'PoolType', Value: poolType }
        ]);
        
        await this.recordEnhancedMetric('ConnectionPoolPendingRequests', pool.pendingRequests.length, 'Count', [
          { Name: 'PoolType', Value: poolType }
        ]);
        
        // Check connection pool thresholds
        if (utilization > this.performanceConfig.thresholds.connectionPoolUtilization.critical) {
          await this.triggerAlert('CRITICAL', 'ConnectionPool', {
            message: `Critical connection pool utilization: ${utilization.toFixed(2)}% for ${poolType}`,
            poolType,
            actualValue: utilization,
            threshold: this.performanceConfig.thresholds.connectionPoolUtilization.critical
          });
        } else if (utilization > this.performanceConfig.thresholds.connectionPoolUtilization.warning) {
          await this.triggerAlert('WARNING', 'ConnectionPool', {
            message: `Warning connection pool utilization: ${utilization.toFixed(2)}% for ${poolType}`,
            poolType,
            actualValue: utilization,
            threshold: this.performanceConfig.thresholds.connectionPoolUtilization.warning
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Connection pool performance monitoring error:', error);
    }
  }

  /**
   * Trigger performance alert
   */
  async triggerAlert(severity, alertType, details) {
    const alertKey = `${alertType}-${severity}`;
    const now = Date.now();
    
    // Check if we've already sent this alert recently (avoid spam)
    const lastAlert = this.alertStates.get(alertKey);
    if (lastAlert && (now - lastAlert) < 300000) { // 5 minutes cooldown
      return;
    }
    
    this.alertStates.set(alertKey, now);
    
    const alertMessage = {
      severity,
      alertType,
      timestamp: new Date().toISOString(),
      service: 'AWS Opportunity Analysis',
      environment: process.env.NODE_ENV || 'production',
      region: process.env.AWS_REGION || 'us-east-1',
      ...details
    };
    
    try {
      // Send to SNS if configured
      if (this.performanceConfig.alerting.snsTopicArn) {
        await this.snsClient.send(new PublishCommand({
          TopicArn: this.performanceConfig.alerting.snsTopicArn,
          Subject: `${severity} Performance Alert: ${alertType}`,
          Message: JSON.stringify(alertMessage, null, 2)
        }));
      }
      
      // Send to Slack if configured
      if (this.performanceConfig.alerting.slackWebhook) {
        await this.sendSlackAlert(alertMessage);
      }
      
      // Log the alert
      console.log(`🚨 ${severity} Alert triggered:`, alertMessage);
      
      // Record alert metric
      await this.recordEnhancedMetric('PerformanceAlert', 1, 'Count', [
        { Name: 'Severity', Value: severity },
        { Name: 'AlertType', Value: alertType }
      ]);
      
    } catch (error) {
      console.error('❌ Failed to send performance alert:', error);
    }
  }

  /**
   * Send alert to Slack
   */
  async sendSlackAlert(alertMessage) {
    if (!this.performanceConfig.alerting.slackWebhook) return;
    
    try {
      const color = alertMessage.severity === 'CRITICAL' ? 'danger' : 'warning';
      const emoji = alertMessage.severity === 'CRITICAL' ? '🚨' : '⚠️';
      
      const slackPayload = {
        attachments: [{
          color,
          title: `${emoji} ${alertMessage.severity} Performance Alert`,
          fields: [
            {
              title: 'Alert Type',
              value: alertMessage.alertType,
              short: true
            },
            {
              title: 'Service',
              value: alertMessage.service,
              short: true
            },
            {
              title: 'Message',
              value: alertMessage.message,
              short: false
            },
            {
              title: 'Timestamp',
              value: alertMessage.timestamp,
              short: true
            }
          ]
        }]
      };
      
      const response = await fetch(this.performanceConfig.alerting.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload)
      });
      
      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to send Slack alert:', error);
    }
  }

  /**
   * Create comprehensive performance dashboard
   */
  async createPerformanceDashboard() {
    try {
      const dashboardBody = {
        widgets: [
          // Response Time Metrics
          {
            type: "metric",
            x: 0, y: 0, width: 12, height: 6,
            properties: {
              metrics: [
                ["AWS/OpportunityAnalysis/Performance", "AnalysisResponseTime", "Service", "opportunity-analysis"],
                [".", "queryGenerationDuration", ".", "."],
                [".", "dataRetrievalDuration", ".", "."],
                [".", "analysisDuration", ".", "."]
              ],
              period: 300,
              stat: "Average",
              region: process.env.AWS_REGION,
              title: "Response Time Metrics (ms)",
              yAxis: { left: { min: 0 } }
            }
          },
          
          // Success Rate and Error Rate
          {
            type: "metric",
            x: 12, y: 0, width: 12, height: 6,
            properties: {
              metrics: [
                ["AWS/OpportunityAnalysis/Performance", "AnalysisSuccess", "Service", "opportunity-analysis"],
                [".", "AnalysisErrors", ".", "."]
              ],
              period: 300,
              stat: "Sum",
              region: process.env.AWS_REGION,
              title: "Success vs Error Count"
            }
          },
          
          // Cache Performance
          {
            type: "metric",
            x: 0, y: 6, width: 8, height: 6,
            properties: {
              metrics: [
                ["AWS/OpportunityAnalysis/Performance", "CacheHitRate", "Service", "opportunity-analysis"],
                [".", "CacheMemoryUtilization", ".", "."]
              ],
              period: 300,
              stat: "Average",
              region: process.env.AWS_REGION,
              title: "Cache Performance (%)"
            }
          },
          
          // System Performance
          {
            type: "metric",
            x: 8, y: 6, width: 8, height: 6,
            properties: {
              metrics: [
                ["AWS/OpportunityAnalysis/Performance", "SystemMemoryUsage", "Service", "opportunity-analysis"],
                [".", "SystemHeapUsed", ".", "."]
              ],
              period: 300,
              stat: "Average",
              region: process.env.AWS_REGION,
              title: "System Performance"
            }
          },
          
          // Connection Pool Utilization
          {
            type: "metric",
            x: 16, y: 6, width: 8, height: 6,
            properties: {
              metrics: [
                ["AWS/OpportunityAnalysis/Performance", "ConnectionPoolUtilization", "PoolType", "bedrock"],
                [".", ".", ".", "lambda"],
                [".", ".", ".", "athena"]
              ],
              period: 300,
              stat: "Average",
              region: process.env.AWS_REGION,
              title: "Connection Pool Utilization (%)"
            }
          },
          
          // Regional Performance
          {
            type: "metric",
            x: 0, y: 12, width: 12, height: 6,
            properties: {
              metrics: [
                ["AWS/OpportunityAnalysis/Performance", "AnalysisResponseTime", "Region", "us-east-1"],
                [".", ".", ".", "us-west-2"],
                [".", ".", ".", "eu-west-1"],
                [".", ".", ".", "ap-southeast-1"]
              ],
              period: 300,
              stat: "Average",
              region: process.env.AWS_REGION,
              title: "Regional Performance (ms)"
            }
          },
          
          // Performance Alerts
          {
            type: "metric",
            x: 12, y: 12, width: 12, height: 6,
            properties: {
              metrics: [
                ["AWS/OpportunityAnalysis/Performance", "PerformanceAlert", "Severity", "CRITICAL"],
                [".", ".", ".", "WARNING"]
              ],
              period: 300,
              stat: "Sum",
              region: process.env.AWS_REGION,
              title: "Performance Alerts"
            }
          }
        ]
      };

      await this.cloudWatchClient.send(new PutDashboardCommand({
        DashboardName: this.performanceConfig.dashboard.name,
        DashboardBody: JSON.stringify(dashboardBody)
      }));

      console.log(`📊 Created performance dashboard: ${this.performanceConfig.dashboard.name}`);
      
    } catch (error) {
      console.warn('⚠️ Failed to create performance dashboard:', error.message);
    }
  }

  /**
   * Setup performance anomaly detection
   */
  async setupPerformanceAnomalyDetection() {
    const keyMetrics = [
      'AnalysisResponseTime',
      'AnalysisSuccess',
      'CacheHitRate',
      'SystemMemoryUsage',
      'ConnectionPoolUtilization'
    ];

    for (const metricName of keyMetrics) {
      try {
        await this.cloudWatchClient.send(new PutAnomalyDetectorCommand({
          Namespace: 'AWS/OpportunityAnalysis/Performance',
          MetricName: metricName,
          Stat: 'Average',
          Dimensions: [
            { Name: 'Service', Value: 'opportunity-analysis' }
          ]
        }));

        console.log(`🔍 Anomaly detector created for ${metricName}`);
      } catch (error) {
        console.warn(`⚠️ Failed to create anomaly detector for ${metricName}:`, error.message);
      }
    }
  }

  /**
   * Start performance monitoring loops
   */
  startPerformanceMonitoring() {
    // Monitor system performance every 30 seconds
    setInterval(async () => {
      await this.monitorSystemPerformance();
    }, 30000);
    
    // Evaluate alerts every minute
    setInterval(async () => {
      await this.evaluatePerformanceAlerts();
    }, 60000);
    
    console.log('📊 Performance monitoring loops started');
  }

  /**
   * Setup performance alerting
   */
  async setupPerformanceAlerting() {
    // Create SNS topic if needed
    if (!this.performanceConfig.alerting.snsTopicArn && this.performanceConfig.alerting.emailEndpoint) {
      console.log('📧 SNS topic not configured, alerts will be logged only');
    }
    
    console.log('🚨 Performance alerting configured');
  }

  /**
   * Calculate recent error rate from history
   */
  calculateRecentErrorRate() {
    const recentHistory = this.performanceMetrics.responseTimeHistory.slice(-20); // Last 20 requests
    if (recentHistory.length === 0) return 0;
    
    const errors = recentHistory.filter(entry => !entry.success).length;
    return (errors / recentHistory.length) * 100;
  }

  /**
   * Update performance history
   */
  updatePerformanceHistory(data) {
    this.performanceMetrics.responseTimeHistory.push(data);
    
    // Keep only last 100 entries
    if (this.performanceMetrics.responseTimeHistory.length > 100) {
      this.performanceMetrics.responseTimeHistory.shift();
    }
  }

  /**
   * Evaluate performance alerts
   */
  async evaluatePerformanceAlerts() {
    // This method can be extended to evaluate complex alert conditions
    // based on historical data and trends
  }

  /**
   * Get performance monitoring status
   */
  async getPerformanceMonitoringStatus() {
    return {
      monitoring: {
        enabled: true,
        dashboardName: this.performanceConfig.dashboard.name,
        alerting: {
          snsConfigured: !!this.performanceConfig.alerting.snsTopicArn,
          slackConfigured: !!this.performanceConfig.alerting.slackWebhook,
          emailConfigured: !!this.performanceConfig.alerting.emailEndpoint
        }
      },
      thresholds: this.performanceConfig.thresholds,
      metrics: {
        responseTimeHistorySize: this.performanceMetrics.responseTimeHistory.length,
        activeAlerts: this.alertStates.size
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { PerformanceMonitoringService };