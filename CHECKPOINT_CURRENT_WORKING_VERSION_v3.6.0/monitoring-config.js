const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { CloudWatchLogsClient, CreateLogStreamCommand, DescribeLogStreamsCommand, PutLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const { XRayClient, PutTraceSegmentsCommand } = require('@aws-sdk/client-xray');
const { cloudWatch } = require('./aws-config-v3');

class MonitoringConfig {
  constructor() {
    this.cloudWatchClient = cloudWatch;
    this.cloudWatchLogsClient = new CloudWatchLogsClient({ region: process.env.AWS_REGION });
    this.xrayClient = new XRayClient({ region: process.env.AWS_REGION });
    this.namespace = 'AWS/OpportunityAnalysis';
    this.serviceName = 'opportunity-analysis';
    this.logGroupName = '/aws/opportunity-analysis/application';
    this.traceId = null;
    this.segmentId = null;
    this.logStreamName = null;
    this.currentTrace = null;
  }

  // Initialize X-Ray tracing for a request
  initializeTrace(requestId = null) {
    this.traceId = requestId || this.generateTraceId();
    this.segmentId = this.generateSegmentId();
    this.currentTrace = {
      traceId: this.traceId,
      segmentId: this.segmentId,
      startTime: Date.now() / 1000,
      subsegments: [],
    };
    
    console.log(`🔍 X-Ray trace initialized: ${this.traceId}`);
    return this.traceId;
  }

  // Generate X-Ray trace ID
  generateTraceId() {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const randomPart = Array.from({ length: 24 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return `1-${timestamp}-${randomPart}`;
  }

  // Generate X-Ray segment ID
  generateSegmentId() {
    return Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  // Create X-Ray subsegment
  async createSubsegment(name, callback, metadata = {}) {
    const subsegmentId = this.generateSegmentId();
    const startTime = Date.now() / 1000;
    
    try {
      console.log(`🔍 Starting subsegment: ${name}`);
      const result = await callback();
      const endTime = Date.now() / 1000;
      
      // Record successful subsegment
      if (this.currentTrace) {
        this.currentTrace.subsegments.push({
          id: subsegmentId,
          name,
          start_time: startTime,
          end_time: endTime,
          metadata,
          error: false,
        });
      }
      
      console.log(`✅ Subsegment completed: ${name} (${Math.round((endTime - startTime) * 1000)}ms)`);
      return result;
    } catch (error) {
      const endTime = Date.now() / 1000;
      
      // Record failed subsegment
      if (this.currentTrace) {
        this.currentTrace.subsegments.push({
          id: subsegmentId,
          name,
          start_time: startTime,
          end_time: endTime,
          metadata: { ...metadata, error: error.message },
          error: true,
          cause: {
            exceptions: [{
              message: error.message,
              type: error.name || 'Error',
            }],
          },
        });
      }
      
      console.log(`❌ Subsegment failed: ${name} (${Math.round((endTime - startTime) * 1000)}ms) - ${error.message}`);
      throw error;
    }
  }

  // Send X-Ray trace segments
  async sendTraceSegments() {
    if (!this.currentTrace) return;

    try {
      const endTime = Date.now() / 1000;
      const segment = {
        trace_id: this.currentTrace.traceId,
        id: this.currentTrace.segmentId,
        name: this.serviceName,
        start_time: this.currentTrace.startTime,
        end_time: endTime,
        service: {
          name: this.serviceName,
          version: '1.0.0',
        },
        subsegments: this.currentTrace.subsegments,
        annotations: {
          service: this.serviceName,
          version: '1.0.0',
        },
        metadata: {
          trace_summary: {
            total_subsegments: this.currentTrace.subsegments.length,
            failed_subsegments: this.currentTrace.subsegments.filter(s => s.error).length,
            total_duration: endTime - this.currentTrace.startTime,
          },
        },
      };

      const command = new PutTraceSegmentsCommand({
        TraceSegmentDocuments: [JSON.stringify(segment)],
      });

      await this.xrayClient.send(command);
      console.log(`🔍 X-Ray trace sent: ${this.currentTrace.traceId}`);
    } catch (error) {
      console.error('❌ Failed to send X-Ray trace:', error);
    }
  }

  async putMetric(metricName, value, unit = 'Count', dimensions = []) {
    try {
      const params = {
        Namespace: this.namespace,
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Timestamp: new Date(),
            Dimensions: [
              {
                Name: 'Service',
                Value: this.serviceName
              },
              ...dimensions
            ]
          }
        ]
      };

      const command = new PutMetricDataCommand(params);
      await this.cloudWatchClient.send(command);
      
      console.log(`📊 Metric sent: ${metricName} = ${value} ${unit}`);
    } catch (error) {
      console.error(`❌ Failed to send metric ${metricName}:`, error);
    }
  }

  // Business KPI tracking methods
  async recordAnalysisRequest(customerName, region, success = true, duration = null) {
    const dimensions = [
      { Name: 'Region', Value: region },
      { Name: 'Status', Value: success ? 'Success' : 'Error' }
    ];

    await this.putMetric('AnalysisRequests', 1, 'Count', dimensions);
    
    if (duration !== null) {
      await this.putMetric('AnalysisLatency', duration, 'Milliseconds', [
        { Name: 'Region', Value: region }
      ]);
    }
  }

  async recordBedrockInvocation(modelId, success = true, duration = null) {
    const dimensions = [
      { Name: 'ModelId', Value: modelId },
      { Name: 'Status', Value: success ? 'Success' : 'Error' }
    ];

    await this.putMetric('BedrockInvocations', 1, 'Count', dimensions);
    
    if (duration !== null) {
      await this.putMetric('BedrockLatency', duration, 'Milliseconds', [
        { Name: 'ModelId', Value: modelId }
      ]);
    }
  }

  async recordQueryExecution(queryType, executionTime, success = true) {
    const dimensions = [
      { Name: 'QueryType', Value: queryType },
      { Name: 'Status', Value: success ? 'Success' : 'Error' }
    ];

    await this.putMetric('QueryExecutions', 1, 'Count', dimensions);
    
    if (success) {
      await this.putMetric('QueryExecutionTime', executionTime, 'Milliseconds', [
        { Name: 'QueryType', Value: queryType }
      ]);
    }
  }

  async recordError(errorType, errorMessage, context = {}) {
    const dimensions = [
      { Name: 'ErrorType', Value: errorType }
    ];

    await this.putMetric('AnalysisErrors', 1, 'Count', dimensions);
  }

  // Enhanced logging with structured format
  logInfo(message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: this.serviceName,
      message,
      traceId: this.traceId,
      ...metadata
    };
    console.log(JSON.stringify(logEntry));
  }

  logError(message, error = null, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      service: this.serviceName,
      message,
      traceId: this.traceId,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      ...metadata
    };
    console.error(JSON.stringify(logEntry));
  }

  logWarning(message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      service: this.serviceName,
      message,
      traceId: this.traceId,
      ...metadata
    };
    console.warn(JSON.stringify(logEntry));
  }

  logDebug(message, metadata = {}) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        service: this.serviceName,
        message,
        traceId: this.traceId,
        ...metadata
      };
      console.debug(JSON.stringify(logEntry));
    }
  }

  // Cleanup method to send final traces
  async cleanup() {
    try {
      await this.sendTraceSegments();
      this.logInfo('Monitoring cleanup completed', {
        traceId: this.traceId,
        totalSubsegments: this.currentTrace?.subsegments?.length || 0,
      });
    } catch (error) {
      console.error('Error during monitoring cleanup:', error);
    }
  }
}

// Singleton instance
const monitoringConfig = new MonitoringConfig();

module.exports = { MonitoringConfig, monitoringConfig };// Qu
// QuickSight Analytics Extensions
MonitoringConfig.prototype.recordDashboardView = async function(dashboardId, userId, sessionDuration = null) {
  const dimensions = [
    { Name: 'DashboardId', Value: dashboardId },
    { Name: 'UserId', Value: userId }
  ];

  await this.putMetric('QuickSight.Dashboard.Views', 1, 'Count', dimensions);
  
  if (sessionDuration !== null) {
    await this.putMetric('QuickSight.Dashboard.SessionDuration', sessionDuration, 'Seconds', [
      { Name: 'DashboardId', Value: dashboardId }
    ]);
  }
};

MonitoringConfig.prototype.recordAnalysisQuery = async function(analysisId, queryType, executionTime, success = true) {
  const dimensions = [
    { Name: 'AnalysisId', Value: analysisId },
    { Name: 'QueryType', Value: queryType },
    { Name: 'Status', Value: success ? 'Success' : 'Error' }
  ];

  await this.putMetric('QuickSight.Analysis.Queries', 1, 'Count', dimensions);
  
  if (success) {
    await this.putMetric('QuickSight.Analysis.QueryLatency', executionTime, 'Milliseconds', [
      { Name: 'AnalysisId', Value: analysisId }
    ]);
  }
};

MonitoringConfig.prototype.recordMLInsight = async function(insightType, confidence, accuracy = null) {
  const dimensions = [
    { Name: 'InsightType', Value: insightType }
  ];

  await this.putMetric('QuickSight.ML.Insights', 1, 'Count', dimensions);
  await this.putMetric('QuickSight.ML.Confidence', confidence, 'Percent', dimensions);
  
  if (accuracy !== null) {
    await this.putMetric('QuickSight.ML.Accuracy', accuracy, 'Percent', dimensions);
  }
};

MonitoringConfig.prototype.recordBusinessMetric = async function(metricName, value, unit = 'Count', category = 'General') {
  const dimensions = [
    { Name: 'Category', Value: category }
  ];

  await this.putMetric(`Business.${metricName}`, value, unit, dimensions);
};

MonitoringConfig.prototype.recordDataRefresh = async function(datasetId, refreshTime, success = true, recordCount = null) {
  const dimensions = [
    { Name: 'DatasetId', Value: datasetId },
    { Name: 'Status', Value: success ? 'Success' : 'Error' }
  ];

  await this.putMetric('QuickSight.Data.Refreshes', 1, 'Count', dimensions);
  
  if (success) {
    await this.putMetric('QuickSight.Data.RefreshTime', refreshTime, 'Seconds', [
      { Name: 'DatasetId', Value: datasetId }
    ]);
    
    if (recordCount !== null) {
      await this.putMetric('QuickSight.Data.RecordCount', recordCount, 'Count', [
        { Name: 'DatasetId', Value: datasetId }
      ]);
    }
  }
};

MonitoringConfig.prototype.recordOpportunityAnalysis = async function(region, dealSize, predictedArr, confidence) {
  const dimensions = [
    { Name: 'Region', Value: region },
    { Name: 'DealSizeCategory', Value: this.categorizeDealSize(dealSize) }
  ];

  await this.putMetric('Business.Opportunities.Analyzed', 1, 'Count', dimensions);
  await this.putMetric('Business.Opportunities.PredictedARR', predictedArr, 'None', dimensions);
  await this.putMetric('Business.Opportunities.PredictionConfidence', confidence, 'Percent', dimensions);
};

MonitoringConfig.prototype.categorizeDealSize = function(arr) {
  if (arr < 100000) return 'Small';
  if (arr < 500000) return 'Medium';
  if (arr < 1000000) return 'Large';
  return 'Enterprise';
};// CI/CD
// CI/CD Pipeline Monitoring Extensions
MonitoringConfig.prototype.recordPipelineExecution = async function(pipelineName, stage, success = true, duration = null) {
  const dimensions = [
    { Name: 'PipelineName', Value: pipelineName },
    { Name: 'Stage', Value: stage },
    { Name: 'Status', Value: success ? 'Success' : 'Failed' }
  ];

  await this.putMetric('CICD.Pipeline.Executions', 1, 'Count', dimensions);
  
  if (duration !== null) {
    await this.putMetric('CICD.Pipeline.Duration', duration, 'Seconds', [
      { Name: 'PipelineName', Value: pipelineName },
      { Name: 'Stage', Value: stage }
    ]);
  }
};

MonitoringConfig.prototype.recordBuildMetrics = async function(projectName, success = true, duration = null, testCoverage = null) {
  const dimensions = [
    { Name: 'ProjectName', Value: projectName },
    { Name: 'Status', Value: success ? 'Success' : 'Failed' }
  ];

  await this.putMetric('CICD.Build.Executions', 1, 'Count', dimensions);
  
  if (duration !== null) {
    await this.putMetric('CICD.Build.Duration', duration, 'Seconds', [
      { Name: 'ProjectName', Value: projectName }
    ]);
  }
  
  if (testCoverage !== null) {
    await this.putMetric('CICD.Build.TestCoverage', testCoverage, 'Percent', [
      { Name: 'ProjectName', Value: projectName }
    ]);
  }
};

MonitoringConfig.prototype.recordDeploymentMetrics = async function(environment, success = true, duration = null, rollback = false) {
  const dimensions = [
    { Name: 'Environment', Value: environment },
    { Name: 'Status', Value: success ? 'Success' : 'Failed' }
  ];

  await this.putMetric('CICD.Deployment.Executions', 1, 'Count', dimensions);
  
  if (duration !== null) {
    await this.putMetric('CICD.Deployment.Duration', duration, 'Seconds', [
      { Name: 'Environment', Value: environment }
    ]);
  }
  
  if (rollback) {
    await this.putMetric('CICD.Deployment.Rollbacks', 1, 'Count', [
      { Name: 'Environment', Value: environment }
    ]);
  }
};

MonitoringConfig.prototype.recordSecurityScanResults = async function(scanType, vulnerabilities = 0, severity = 'Low') {
  const dimensions = [
    { Name: 'ScanType', Value: scanType },
    { Name: 'Severity', Value: severity }
  ];

  await this.putMetric('CICD.Security.Scans', 1, 'Count', [
    { Name: 'ScanType', Value: scanType }
  ]);
  
  if (vulnerabilities > 0) {
    await this.putMetric('CICD.Security.Vulnerabilities', vulnerabilities, 'Count', dimensions);
  }
};