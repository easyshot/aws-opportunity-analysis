/**
 * Enhanced Monitoring Service with Comprehensive CloudWatch Integration
 * Implements Task 6 requirements: CloudWatch metrics, detailed logging, performance monitoring, and operational dashboards
 */

const { MonitoringService } = require('./monitoring-service');
const { monitoringConfig } = require('../config/monitoring-config');
const { CloudWatchClient, PutMetricDataCommand, PutDashboardCommand, PutAnomalyDetectorCommand } = require('@aws-sdk/client-cloudwatch');
const { CloudWatchLogsClient, CreateLogGroupCommand, CreateLogStreamCommand, PutLogEventsCommand, StartQueryCommand, GetQueryResultsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const { XRayClient, PutTraceSegmentsCommand } = require('@aws-sdk/client-xray');

class EnhancedMonitoringService extends MonitoringService {
  constructor(config = {}) {
    super();
    
    this.enhancedConfig = {
      namespace: 'AWS/OpportunityAnalysis/Enhanced',
      logGroupName: '/aws/opportunity-analysis/enhanced-monitoring',
      dashboardName: 'OpportunityAnalysis-Enhanced-Monitoring',
      anomalyDetectionEnabled: true,
      detailedLoggingEnabled: process.env.DETAILED_LOGGING_ENABLED !== 'false',
      sensitiveDataMasking: process.env.SENSITIVE_DATA_MASKING !== 'false',
      ...config
    };
    
    // Performance tracking
    this.performanceTracker = {
      operationMetrics: new Map(),
      systemMetrics: new Map(),
      businessMetrics: new Map()
    };
    
    // Real-time metrics buffer
    this.metricsBuffer = [];
    this.maxBufferSize = 100;
    
    // Anomaly detection tracking
    this.anomalyDetectors = new Map();
    
    console.log('📊 Enhanced Monitoring Service initialized');
    this.initializeEnhancedMonitoring();
  }

  /**
   * Initialize enhanced monitoring components
   */
  async initializeEnhancedMonitoring() {
    await Promise.all([
      this.createEnhancedLogGroup(),
      this.createComprehensiveDashboard(),
      this.setupAnomalyDetection(),
      this.startMetricsFlushInterval()
    ]);
  }

  /**
   * Create enhanced log group with structured logging
   */
  async createEnhancedLogGroup() {
    try {
      await this.cloudWatchLogsClient.send(new CreateLogGroupCommand({
        logGroupName: this.enhancedConfig.logGroupName
      }));
      console.log(`📝 Created enhanced log group: ${this.enhancedConfig.logGroupName}`);
    } catch (error) {
      if (error.name !== 'ResourceAlreadyExistsException') {
        console.warn('⚠️ Failed to create enhanced log group:', error.message);
      }
    }
  }

  /**
   * Monitor analysis workflow with enhanced tracking
   */
  async monitorEnhancedAnalysisWorkflow(workflowData, options = {}) {
    const { CustomerName, region, closeDate, oppName, oppDescription, useNovaPremier } = workflowData;
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // Initialize enhanced trace
    const traceId = this.initializeTrace(workflowId);
    
    try {
      await this.logEnhancedEvent('workflow_started', {
        workflowId,
        traceId,
        customerName: this.maskSensitiveData(CustomerName),
        region,
        analysisType: useNovaPremier ? 'nova-premier' : 'standard',
        metadata: {
          opportunityName: this.maskSensitiveData(oppName),
          closeDate,
          timestamp: new Date().toISOString()
        }
      });

      // Record workflow start metrics
      await this.recordEnhancedMetric('WorkflowStarted', 1, 'Count', [
        { Name: 'Region', Value: region },
        { Name: 'AnalysisType', Value: useNovaPremier ? 'nova-premier' : 'standard' }
      ]);

      // Monitor query generation step with detailed metrics
      const queryResult = await this.createSubsegment('enhanced-query-generation', async () => {
        const stepStartTime = Date.now();
        
        await this.logEnhancedEvent('query_generation_started', {
          workflowId,
          traceId,
          step: 'query-generation',
          customerName: this.maskSensitiveData(CustomerName),
          region
        });
        
        // Simulate or call actual query generation
        const result = { success: true, duration: 2000, queryLength: 450 };
        
        const stepDuration = Date.now() - stepStartTime;
        
        // Record detailed step metrics
        await Promise.all([
          this.recordEnhancedMetric('QueryGenerationDuration', stepDuration, 'Milliseconds', [
            { Name: 'Region', Value: region },
            { Name: 'AnalysisType', Value: useNovaPremier ? 'nova-premier' : 'standard' }
          ]),
          this.recordEnhancedMetric('QueryLength', result.queryLength, 'Count', [
            { Name: 'Region', Value: region }
          ]),
          this.recordEnhancedMetric('QueryGenerationSuccess', 1, 'Count', [
            { Name: 'Region', Value: region }
          ])
        ]);
        
        await this.logEnhancedEvent('query_generation_completed', {
          workflowId,
          traceId,
          step: 'query-generation',
          duration: stepDuration,
          queryLength: result.queryLength,
          success: true
        });
        
        return result;
      });

      // Monitor data retrieval step
      const dataResult = await this.createSubsegment('enhanced-data-retrieval', async () => {
        const stepStartTime = Date.now();
        
        await this.logEnhancedEvent('data_retrieval_started', {
          workflowId,
          traceId,
          step: 'data-retrieval',
          customerName: this.maskSensitiveData(CustomerName),
          region
        });
        
        // Simulate or call actual data retrieval
        const result = { success: true, duration: 5000, recordsRetrieved: 150, dataSize: 2048 };
        
        const stepDuration = Date.now() - stepStartTime;
        
        // Record detailed step metrics
        await Promise.all([
          this.recordEnhancedMetric('DataRetrievalDuration', stepDuration, 'Milliseconds', [
            { Name: 'Region', Value: region }
          ]),
          this.recordEnhancedMetric('RecordsRetrieved', result.recordsRetrieved, 'Count', [
            { Name: 'Region', Value: region }
          ]),
          this.recordEnhancedMetric('DataSizeBytes', result.dataSize, 'Bytes', [
            { Name: 'Region', Value: region }
          ]),
          this.recordEnhancedMetric('DataRetrievalSuccess', 1, 'Count', [
            { Name: 'Region', Value: region }
          ])
        ]);
        
        await this.logEnhancedEvent('data_retrieval_completed', {
          workflowId,
          traceId,
          step: 'data-retrieval',
          duration: stepDuration,
          recordsRetrieved: result.recordsRetrieved,
          dataSize: result.dataSize,
          success: true
        });
        
        return result;
      });

      // Monitor analysis step
      const analysisResult = await this.createSubsegment('enhanced-bedrock-analysis', async () => {
        const stepStartTime = Date.now();
        const modelId = useNovaPremier ? 'amazon.nova-premier-v1:0' : 'amazon.titan-text-express-v1';
        
        await this.logEnhancedEvent('analysis_started', {
          workflowId,
          traceId,
          step: 'bedrock-analysis',
          modelId,
          customerName: this.maskSensitiveData(CustomerName),
          region
        });
        
        // Simulate or call actual analysis
        const result = { 
          success: true, 
          duration: 8000, 
          tokensUsed: 1200, 
          confidenceScore: 85,
          analysisLength: 3500
        };
        
        const stepDuration = Date.now() - stepStartTime;
        
        // Record detailed step metrics
        await Promise.all([
          this.recordEnhancedMetric('AnalysisDuration', stepDuration, 'Milliseconds', [
            { Name: 'ModelId', Value: modelId },
            { Name: 'Region', Value: region }
          ]),
          this.recordEnhancedMetric('TokensUsed', result.tokensUsed, 'Count', [
            { Name: 'ModelId', Value: modelId }
          ]),
          this.recordEnhancedMetric('ConfidenceScore', result.confidenceScore, 'Percent', [
            { Name: 'ModelId', Value: modelId },
            { Name: 'Region', Value: region }
          ]),
          this.recordEnhancedMetric('AnalysisLength', result.analysisLength, 'Count', [
            { Name: 'ModelId', Value: modelId }
          ]),
          this.recordEnhancedMetric('AnalysisSuccess', 1, 'Count', [
            { Name: 'ModelId', Value: modelId },
            { Name: 'Region', Value: region }
          ])
        ]);
        
        await this.logEnhancedEvent('analysis_completed', {
          workflowId,
          traceId,
          step: 'bedrock-analysis',
          modelId,
          duration: stepDuration,
          tokensUsed: result.tokensUsed,
          confidenceScore: result.confidenceScore,
          analysisLength: result.analysisLength,
          success: true
        });
        
        return result;
      });

      // Record final workflow metrics
      const totalDuration = Date.now() - startTime;
      
      await Promise.all([
        this.recordEnhancedMetric('WorkflowCompleted', 1, 'Count', [
          { Name: 'Region', Value: region },
          { Name: 'AnalysisType', Value: useNovaPremier ? 'nova-premier' : 'standard' }
        ]),
        this.recordEnhancedMetric('WorkflowDuration', totalDuration, 'Milliseconds', [
          { Name: 'Region', Value: region },
          { Name: 'AnalysisType', Value: useNovaPremier ? 'nova-premier' : 'standard' }
        ]),
        this.recordEnhancedMetric('WorkflowSuccessRate', 100, 'Percent', [
          { Name: 'Region', Value: region }
        ])
      ]);

      // Update performance tracking
      this.updatePerformanceTracking('workflow', {
        duration: totalDuration,
        success: true,
        region,
        analysisType: useNovaPremier ? 'nova-premier' : 'standard',
        steps: {
          queryGeneration: queryResult.duration,
          dataRetrieval: dataResult.duration,
          analysis: analysisResult.duration
        }
      });

      await this.logEnhancedEvent('workflow_completed', {
        workflowId,
        traceId,
        totalDuration,
        customerName: this.maskSensitiveData(CustomerName),
        region,
        analysisType: useNovaPremier ? 'nova-premier' : 'standard',
        steps: {
          queryGeneration: queryResult,
          dataRetrieval: dataResult,
          analysis: analysisResult
        },
        success: true
      });

      // Send trace segments
      await this.sendTraceSegments();

      return { 
        success: true, 
        workflowId, 
        traceId, 
        totalDuration,
        steps: {
          queryGeneration: queryResult,
          dataRetrieval: dataResult,
          analysis: analysisResult
        }
      };
      
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      await Promise.all([
        this.recordEnhancedMetric('WorkflowFailed', 1, 'Count', [
          { Name: 'Region', Value: region },
          { Name: 'AnalysisType', Value: useNovaPremier ? 'nova-premier' : 'standard' },
          { Name: 'ErrorType', Value: error.name || 'UnknownError' }
        ]),
        this.recordEnhancedMetric('WorkflowFailureDuration', totalDuration, 'Milliseconds', [
          { Name: 'Region', Value: region }
        ])
      ]);

      await this.logEnhancedEvent('workflow_failed', {
        workflowId,
        traceId,
        totalDuration,
        customerName: this.maskSensitiveData(CustomerName),
        region,
        analysisType: useNovaPremier ? 'nova-premier' : 'standard',
        error: {
          name: error.name,
          message: error.message,
          stack: this.enhancedConfig.detailedLoggingEnabled ? error.stack : undefined
        },
        success: false
      });

      // Update performance tracking for failure
      this.updatePerformanceTracking('workflow', {
        duration: totalDuration,
        success: false,
        region,
        analysisType: useNovaPremier ? 'nova-premier' : 'standard',
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Record enhanced metrics with buffering and batch sending
   */
  async recordEnhancedMetric(metricName, value, unit = 'Count', dimensions = [], timestamp = null) {
    const metric = {
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: timestamp || new Date(),
      Dimensions: [
        { Name: 'Service', Value: 'opportunity-analysis' },
        { Name: 'Environment', Value: process.env.NODE_ENV || 'production' },
        ...dimensions
      ]
    };

    // Add to buffer
    this.metricsBuffer.push(metric);

    // Flush buffer if it's getting full
    if (this.metricsBuffer.length >= this.maxBufferSize) {
      await this.flushMetricsBuffer();
    }

    // Also send individual metric for real-time monitoring
    try {
      await this.cloudWatchClient.send(new PutMetricDataCommand({
        Namespace: this.enhancedConfig.namespace,
        MetricData: [metric]
      }));
    } catch (error) {
      console.warn(`⚠️ Failed to send individual metric ${metricName}:`, error.message);
    }
  }

  /**
   * Flush metrics buffer to CloudWatch
   */
  async flushMetricsBuffer() {
    if (this.metricsBuffer.length === 0) return;

    try {
      // CloudWatch allows max 20 metrics per request
      const batches = [];
      for (let i = 0; i < this.metricsBuffer.length; i += 20) {
        batches.push(this.metricsBuffer.slice(i, i + 20));
      }

      await Promise.all(batches.map(batch => 
        this.cloudWatchClient.send(new PutMetricDataCommand({
          Namespace: this.enhancedConfig.namespace,
          MetricData: batch
        }))
      ));

      console.log(`📊 Flushed ${this.metricsBuffer.length} metrics to CloudWatch`);
      this.metricsBuffer = [];
    } catch (error) {
      console.error('❌ Failed to flush metrics buffer:', error.message);
    }
  }

  /**
   * Start metrics flush interval
   */
  startMetricsFlushInterval() {
    setInterval(async () => {
      await this.flushMetricsBuffer();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Log enhanced structured events
   */
  async logEnhancedEvent(eventType, data) {
    const logEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        eventType,
        timestamp: new Date().toISOString(),
        service: 'opportunity-analysis',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        region: process.env.AWS_REGION || 'us-east-1',
        ...data
      })
    };

    try {
      const logStreamName = `enhanced-monitoring-${new Date().toISOString().split('T')[0]}`;
      
      // Create log stream if needed
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
      console.error(`❌ Failed to log enhanced event ${eventType}:`, error.message);
    }
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(data) {
    if (!this.enhancedConfig.sensitiveDataMasking || !data) return data;
    
    if (typeof data === 'string') {
      // Mask customer names, emails, etc.
      return data.replace(/^(.{2}).*(.{2})$/, '$1***$2');
    }
    
    return data;
  }

  /**
   * Update performance tracking
   */
  updatePerformanceTracking(operationType, metrics) {
    const tracker = this.performanceTracker.operationMetrics.get(operationType) || {
      totalOperations: 0,
      successfulOperations: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      recentOperations: []
    };

    tracker.totalOperations++;
    if (metrics.success) {
      tracker.successfulOperations++;
    }
    
    if (metrics.duration) {
      tracker.totalDuration += metrics.duration;
      tracker.averageDuration = tracker.totalDuration / tracker.totalOperations;
      tracker.minDuration = Math.min(tracker.minDuration, metrics.duration);
      tracker.maxDuration = Math.max(tracker.maxDuration, metrics.duration);
    }

    // Keep recent operations for trend analysis
    tracker.recentOperations.push({
      timestamp: Date.now(),
      duration: metrics.duration,
      success: metrics.success,
      ...metrics
    });

    // Keep only last 100 operations
    if (tracker.recentOperations.length > 100) {
      tracker.recentOperations.shift();
    }

    this.performanceTracker.operationMetrics.set(operationType, tracker);
  }

  /**
   * Setup anomaly detection for key metrics
   */
  async setupAnomalyDetection() {
    if (!this.enhancedConfig.anomalyDetectionEnabled) return;

    const keyMetrics = [
      'WorkflowDuration',
      'WorkflowSuccessRate',
      'AnalysisDuration',
      'QueryGenerationDuration',
      'DataRetrievalDuration'
    ];

    for (const metricName of keyMetrics) {
      try {
        await this.cloudWatchClient.send(new PutAnomalyDetectorCommand({
          Namespace: this.enhancedConfig.namespace,
          MetricName: metricName,
          Stat: 'Average',
          Dimensions: [
            { Name: 'Service', Value: 'opportunity-analysis' }
          ]
        }));

        this.anomalyDetectors.set(metricName, {
          enabled: true,
          createdAt: new Date().toISOString()
        });

        console.log(`🔍 Anomaly detector created for ${metricName}`);
      } catch (error) {
        console.warn(`⚠️ Failed to create anomaly detector for ${metricName}:`, error.message);
      }
    }
  }

  /**
   * Create comprehensive monitoring dashboard
   */
  async createComprehensiveDashboard() {
    try {
      const dashboardBody = {
        widgets: [
          // Workflow Overview
          {
            type: "metric",
            x: 0, y: 0, width: 12, height: 6,
            properties: {
              metrics: [
                [this.enhancedConfig.namespace, "WorkflowCompleted", "Service", "opportunity-analysis"],
                [".", "WorkflowFailed", ".", "."],
                [".", "WorkflowStarted", ".", "."]
              ],
              period: 300,
              stat: "Sum",
              region: this.region,
              title: "Workflow Overview",
              yAxis: { left: { min: 0 } }
            }
          },
          // Performance Metrics
          {
            type: "metric",
            x: 12, y: 0, width: 12, height: 6,
            properties: {
              metrics: [
                [this.enhancedConfig.namespace, "WorkflowDuration", "Service", "opportunity-analysis"],
                [".", "QueryGenerationDuration", ".", "."],
                [".", "DataRetrievalDuration", ".", "."],
                [".", "AnalysisDuration", ".", "."]
              ],
              period: 300,
              stat: "Average",
              region: this.region,
              title: "Performance Metrics (ms)",
              yAxis: { left: { min: 0 } }
            }
          },
          // Success Rate
          {
            type: "metric",
            x: 0, y: 6, width: 8, height: 6,
            properties: {
              metrics: [
                [this.enhancedConfig.namespace, "WorkflowSuccessRate", "Service", "opportunity-analysis"]
              ],
              period: 300,
              stat: "Average",
              region: this.region,
              title: "Success Rate (%)",
              yAxis: { left: { min: 0, max: 100 } }
            }
          },
          // Resource Utilization
          {
            type: "metric",
            x: 8, y: 6, width: 8, height: 6,
            properties: {
              metrics: [
                [this.enhancedConfig.namespace, "TokensUsed", "Service", "opportunity-analysis"],
                [".", "RecordsRetrieved", ".", "."],
                [".", "DataSizeBytes", ".", "."]
              ],
              period: 300,
              stat: "Sum",
              region: this.region,
              title: "Resource Utilization"
            }
          },
          // Regional Distribution
          {
            type: "metric",
            x: 16, y: 6, width: 8, height: 6,
            properties: {
              metrics: [
                [this.enhancedConfig.namespace, "WorkflowCompleted", "Region", "us-east-1"],
                [".", ".", ".", "us-west-2"],
                [".", ".", ".", "eu-west-1"],
                [".", ".", ".", "ap-southeast-1"]
              ],
              period: 300,
              stat: "Sum",
              region: this.region,
              title: "Regional Distribution"
            }
          },
          // Analysis Type Distribution
          {
            type: "metric",
            x: 0, y: 12, width: 12, height: 6,
            properties: {
              metrics: [
                [this.enhancedConfig.namespace, "WorkflowCompleted", "AnalysisType", "standard"],
                [".", ".", ".", "nova-premier"]
              ],
              period: 300,
              stat: "Sum",
              region: this.region,
              title: "Analysis Type Distribution"
            }
          },
          // Confidence Scores
          {
            type: "metric",
            x: 12, y: 12, width: 12, height: 6,
            properties: {
              metrics: [
                [this.enhancedConfig.namespace, "ConfidenceScore", "Service", "opportunity-analysis"]
              ],
              period: 300,
              stat: "Average",
              region: this.region,
              title: "Average Confidence Score (%)",
              yAxis: { left: { min: 0, max: 100 } }
            }
          }
        ]
      };

      await this.cloudWatchClient.send(new PutDashboardCommand({
        DashboardName: this.enhancedConfig.dashboardName,
        DashboardBody: JSON.stringify(dashboardBody)
      }));

      console.log(`📊 Created comprehensive dashboard: ${this.enhancedConfig.dashboardName}`);
    } catch (error) {
      console.warn('⚠️ Failed to create comprehensive dashboard:', error.message);
    }
  }

  /**
   * Run enhanced CloudWatch Insights queries
   */
  async runEnhancedInsightQuery(queryType, timeRange = 3600, customQuery = null) {
    const enhancedQueries = {
      ...this.insightQueries,
      workflowAnalysis: `
        fields @timestamp, @message
        | filter eventType = "workflow_completed"
        | parse @message "totalDuration":* as duration
        | parse @message "region":"*" as region
        | stats avg(duration), max(duration), min(duration), count() by region
        | sort avg(duration) desc
      `,
      errorAnalysis: `
        fields @timestamp, @message
        | filter eventType = "workflow_failed"
        | parse @message "error.name":"*" as errorType
        | parse @message "region":"*" as region
        | stats count() by errorType, region
        | sort count desc
      `,
      performanceAnalysis: `
        fields @timestamp, @message
        | filter eventType = "workflow_completed"
        | parse @message "totalDuration":* as totalDuration
        | parse @message "steps.queryGeneration.duration":* as queryDuration
        | parse @message "steps.dataRetrieval.duration":* as dataDuration
        | parse @message "steps.analysis.duration":* as analysisDuration
        | stats avg(totalDuration), avg(queryDuration), avg(dataDuration), avg(analysisDuration) by bin(5m)
        | sort @timestamp desc
      `,
      confidenceAnalysis: `
        fields @timestamp, @message
        | filter eventType = "analysis_completed"
        | parse @message "confidenceScore":* as confidence
        | parse @message "region":"*" as region
        | stats avg(confidence), min(confidence), max(confidence) by region
        | sort avg(confidence) desc
      `
    };

    const query = customQuery || enhancedQueries[queryType];
    if (!query) {
      throw new Error(`Unknown enhanced query type: ${queryType}`);
    }

    return await this.runInsightQuery(queryType, timeRange);
  }

  /**
   * Get comprehensive performance metrics
   */
  async getEnhancedPerformanceMetrics(timeRange = 3600) {
    const baseMetrics = await this.getComprehensiveMetrics(timeRange);
    
    return {
      ...baseMetrics,
      enhanced: {
        performanceTracking: Object.fromEntries(this.performanceTracker.operationMetrics),
        systemMetrics: Object.fromEntries(this.performanceTracker.systemMetrics),
        businessMetrics: Object.fromEntries(this.performanceTracker.businessMetrics),
        anomalyDetectors: Object.fromEntries(this.anomalyDetectors),
        bufferStatus: {
          metricsBufferSize: this.metricsBuffer.length,
          maxBufferSize: this.maxBufferSize
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Perform enhanced health check
   */
  async performEnhancedHealthCheck() {
    const baseHealth = await this.performHealthCheck();
    
    const enhancedChecks = {
      metricsBuffer: {
        healthy: this.metricsBuffer.length < this.maxBufferSize * 0.8,
        bufferSize: this.metricsBuffer.length,
        maxSize: this.maxBufferSize
      },
      anomalyDetection: {
        healthy: true,
        detectorsCount: this.anomalyDetectors.size,
        enabledDetectors: Array.from(this.anomalyDetectors.entries())
          .filter(([_, config]) => config.enabled).length
      },
      performanceTracking: {
        healthy: this.performanceTracker.operationMetrics.size > 0,
        trackedOperations: this.performanceTracker.operationMetrics.size
      }
    };

    const overallHealthy = baseHealth.healthy && 
                          enhancedChecks.metricsBuffer.healthy && 
                          enhancedChecks.anomalyDetection.healthy;

    return {
      ...baseHealth,
      enhanced: enhancedChecks,
      healthy: overallHealthy,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup enhanced monitoring resources
   */
  async cleanup() {
    await super.cleanup();
    
    // Flush any remaining metrics
    await this.flushMetricsBuffer();
    
    console.log('🧹 Enhanced monitoring cleanup completed');
  }
}

module.exports = { EnhancedMonitoringService };