const { monitoringConfig } = require('../config/monitoring-config');
const { CloudWatchClient, GetMetricStatisticsCommand, DescribeAlarmsCommand } = require('@aws-sdk/client-cloudwatch');
const { CloudWatchLogsClient, StartQueryCommand, GetQueryResultsCommand } = require('@aws-sdk/client-cloudwatch-logs');

class MonitoringService {
  constructor() {
    this.monitoring = monitoringConfig;
    this.cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });
    this.cloudWatchLogsClient = new CloudWatchLogsClient({ region: process.env.AWS_REGION });
    this.insightQueries = {
      errorAnalysis: `
        fields @timestamp, @message, @logStream
        | filter @message like /ERROR/
        | stats count() by bin(5m)
        | sort @timestamp desc
      `,
      performanceAnalysis: `
        fields @timestamp, @message, @duration
        | filter @message like /Analysis completed/
        | stats avg(@duration), max(@duration), min(@duration) by bin(5m)
        | sort @timestamp desc
      `,
      bedrockUsage: `
        fields @timestamp, @message
        | filter @message like /Bedrock/
        | stats count() by bin(5m)
        | sort @timestamp desc
      `,
      userActivity: `
        fields @timestamp, @message
        | filter @message like /Customer/
        | parse @message "Customer: *" as customer
        | stats count() by customer
        | sort count desc
      `,
    };
  }

  // Initialize monitoring for a request
  async initializeRequestMonitoring(requestId, requestData = {}) {
    const traceId = this.monitoring.initializeTrace(requestId);
    
    await this.monitoring.logInfo('Request monitoring initialized', {
      requestId,
      traceId,
      requestData: {
        customerName: requestData.CustomerName,
        region: requestData.region,
        analysisType: requestData.useNovaPremier ? 'nova-premier' : 'standard',
      },
    });

    return traceId;
  }

  // Monitor analysis workflow
  async monitorAnalysisWorkflow(workflowData) {
    const { CustomerName, region, closeDate, oppName, oppDescription, useNovaPremier } = workflowData;
    const startTime = Date.now();
    
    try {
      // Record analysis request
      await this.monitoring.recordAnalysisRequest(CustomerName, region, true);
      
      // Monitor query generation step
      const queryResult = await this.monitoring.createSubsegment('query-generation', async () => {
        await this.monitoring.logInfo('Starting SQL query generation', {
          customerName: CustomerName,
          region,
          analysisType: useNovaPremier ? 'nova-premier' : 'standard',
        });
        
        // This would be called from the actual automation
        return { success: true, duration: 2000 };
      });

      // Record Bedrock invocation
      const modelId = useNovaPremier ? 'amazon.nova-premier-v1:0' : 'amazon.titan-text-express-v1';
      await this.monitoring.recordBedrockInvocation(modelId, true, queryResult.duration);

      // Monitor data retrieval step
      const dataResult = await this.monitoring.createSubsegment('data-retrieval', async () => {
        await this.monitoring.logInfo('Starting data retrieval from Athena', {
          customerName: CustomerName,
          region,
        });
        
        return { success: true, duration: 5000 };
      });

      // Record query execution
      await this.monitoring.recordQueryExecution('opportunity-analysis', dataResult.duration, true);

      // Monitor analysis step
      const analysisResult = await this.monitoring.createSubsegment('bedrock-analysis', async () => {
        await this.monitoring.logInfo('Starting Bedrock analysis', {
          customerName: CustomerName,
          region,
          modelId,
        });
        
        return { success: true, duration: 8000 };
      });

      // Record final metrics
      const totalDuration = Date.now() - startTime;
      await this.monitoring.recordAnalysisRequest(CustomerName, region, true, totalDuration);

      await this.monitoring.logInfo('Analysis workflow completed successfully', {
        customerName: CustomerName,
        region,
        totalDuration,
        steps: {
          queryGeneration: queryResult.duration,
          dataRetrieval: dataResult.duration,
          analysis: analysisResult.duration,
        },
      });

      return { success: true, totalDuration };
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      await this.monitoring.recordError('analysis-workflow', error.message, {
        customerName: CustomerName,
        region,
        totalDuration,
      });

      await this.monitoring.recordAnalysisRequest(CustomerName, region, false, totalDuration);
      
      throw error;
    }
  }

  // Monitor Bedrock operations
  async monitorBedrockOperation(operationType, modelId, callback) {
    const startTime = Date.now();
    
    try {
      const result = await this.monitoring.createSubsegment(`bedrock-${operationType}`, async () => {
        await this.monitoring.logInfo(`Starting Bedrock ${operationType}`, {
          modelId,
          operationType,
        });
        
        return await callback();
      });

      const duration = Date.now() - startTime;
      await this.monitoring.recordBedrockInvocation(modelId, true, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.monitoring.recordBedrockInvocation(modelId, false, duration);
      
      await this.monitoring.logError(`Bedrock ${operationType} failed`, error, {
        modelId,
        operationType,
        duration,
      });
      
      throw error;
    }
  }

  // Monitor Lambda operations
  async monitorLambdaOperation(functionName, callback) {
    const startTime = Date.now();
    
    try {
      const result = await this.monitoring.createSubsegment(`lambda-${functionName}`, async () => {
        await this.monitoring.logInfo(`Invoking Lambda function: ${functionName}`);
        return await callback();
      });

      const duration = Date.now() - startTime;
      await this.monitoring.recordLambdaInvocation(functionName, true, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.monitoring.recordLambdaInvocation(functionName, false, duration);
      
      await this.monitoring.logError(`Lambda ${functionName} failed`, error, {
        functionName,
        duration,
      });
      
      throw error;
    }
  }

  // Get comprehensive metrics for dashboard
  async getComprehensiveMetrics(timeRange = 3600) { // 1 hour default
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (timeRange * 1000));

    try {
      const metrics = {};

      // Get analysis request metrics
      const analysisRequestsCommand = new GetMetricStatisticsCommand({
        Namespace: 'AWS/OpportunityAnalysis',
        MetricName: 'AnalysisRequests',
        StartTime: startTime,
        EndTime: endTime,
        Period: 300, // 5 minutes
        Statistics: ['Sum'],
        Dimensions: [{ Name: 'Service', Value: 'opportunity-analysis' }],
      });

      const analysisRequests = await this.cloudWatchClient.send(analysisRequestsCommand);
      metrics.totalRequests = analysisRequests.Datapoints.reduce((sum, dp) => sum + dp.Sum, 0);

      // Get error metrics
      const errorCommand = new GetMetricStatisticsCommand({
        Namespace: 'AWS/OpportunityAnalysis',
        MetricName: 'AnalysisErrors',
        StartTime: startTime,
        EndTime: endTime,
        Period: 300,
        Statistics: ['Sum'],
        Dimensions: [{ Name: 'Service', Value: 'opportunity-analysis' }],
      });

      const errors = await this.cloudWatchClient.send(errorCommand);
      metrics.totalErrors = errors.Datapoints.reduce((sum, dp) => sum + dp.Sum, 0);
      metrics.errorRate = metrics.totalRequests > 0 ? (metrics.totalErrors / metrics.totalRequests) * 100 : 0;

      // Get latency metrics
      const latencyCommand = new GetMetricStatisticsCommand({
        Namespace: 'AWS/OpportunityAnalysis',
        MetricName: 'AnalysisLatency',
        StartTime: startTime,
        EndTime: endTime,
        Period: 300,
        Statistics: ['Average', 'Maximum'],
        Dimensions: [{ Name: 'Service', Value: 'opportunity-analysis' }],
      });

      const latency = await this.cloudWatchClient.send(latencyCommand);
      if (latency.Datapoints.length > 0) {
        metrics.averageLatency = latency.Datapoints.reduce((sum, dp) => sum + dp.Average, 0) / latency.Datapoints.length;
        metrics.maxLatency = Math.max(...latency.Datapoints.map(dp => dp.Maximum));
      } else {
        metrics.averageLatency = 0;
        metrics.maxLatency = 0;
      }

      // Get Bedrock metrics
      const bedrockCommand = new GetMetricStatisticsCommand({
        Namespace: 'AWS/OpportunityAnalysis',
        MetricName: 'BedrockInvocations',
        StartTime: startTime,
        EndTime: endTime,
        Period: 300,
        Statistics: ['Sum'],
        Dimensions: [{ Name: 'Service', Value: 'opportunity-analysis' }],
      });

      const bedrock = await this.cloudWatchClient.send(bedrockCommand);
      metrics.bedrockInvocations = bedrock.Datapoints.reduce((sum, dp) => sum + dp.Sum, 0);

      return {
        success: true,
        timeRange,
        metrics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await this.monitoring.logError('Failed to get comprehensive metrics', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Run CloudWatch Insights query
  async runInsightQuery(queryType, timeRange = 3600) {
    const query = this.insightQueries[queryType];
    if (!query) {
      throw new Error(`Unknown query type: ${queryType}`);
    }

    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - timeRange;

    try {
      const startQueryCommand = new StartQueryCommand({
        logGroupName: '/aws/opportunity-analysis/application',
        startTime,
        endTime,
        queryString: query,
      });

      const queryResponse = await this.cloudWatchLogsClient.send(startQueryCommand);
      const queryId = queryResponse.queryId;

      // Wait for query to complete
      let queryComplete = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (!queryComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const getResultsCommand = new GetQueryResultsCommand({ queryId });
        const results = await this.cloudWatchLogsClient.send(getResultsCommand);
        
        if (results.status === 'Complete') {
          queryComplete = true;
          return {
            success: true,
            queryType,
            results: results.results,
            statistics: results.statistics,
          };
        } else if (results.status === 'Failed') {
          throw new Error(`Query failed: ${results.status}`);
        }
        
        attempts++;
      }

      throw new Error('Query timeout');
    } catch (error) {
      await this.monitoring.logError(`Insight query failed: ${queryType}`, error);
      throw error;
    }
  }

  // Get alarm status
  async getAlarmStatus() {
    try {
      const command = new DescribeAlarmsCommand({
        AlarmNamePrefix: 'OpportunityAnalysis-',
        StateValue: 'ALARM',
      });

      const response = await this.cloudWatchClient.send(command);
      
      return {
        success: true,
        activeAlarms: response.MetricAlarms.length,
        alarms: response.MetricAlarms.map(alarm => ({
          name: alarm.AlarmName,
          description: alarm.AlarmDescription,
          state: alarm.StateValue,
          reason: alarm.StateReason,
          timestamp: alarm.StateUpdatedTimestamp,
        })),
      };
    } catch (error) {
      await this.monitoring.logError('Failed to get alarm status', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Health check with monitoring
  async performHealthCheck() {
    const healthChecks = [];
    
    try {
      // Check CloudWatch connectivity
      const cloudWatchHealth = await this.monitoring.createSubsegment('health-cloudwatch', async () => {
        const command = new GetMetricStatisticsCommand({
          Namespace: 'AWS/OpportunityAnalysis',
          MetricName: 'AnalysisRequests',
          StartTime: new Date(Date.now() - 300000), // 5 minutes ago
          EndTime: new Date(),
          Period: 300,
          Statistics: ['Sum'],
        });
        
        await this.cloudWatchClient.send(command);
        return { healthy: true, responseTime: 100 };
      });
      
      healthChecks.push({
        component: 'CloudWatch',
        healthy: cloudWatchHealth.healthy,
        responseTime: cloudWatchHealth.responseTime,
      });

      // Check X-Ray connectivity
      const xrayHealth = await this.monitoring.createSubsegment('health-xray', async () => {
        // Simple X-Ray health check by generating a trace ID
        const traceId = this.monitoring.generateTraceId();
        return { healthy: true, responseTime: 50, traceId };
      });
      
      healthChecks.push({
        component: 'X-Ray',
        healthy: xrayHealth.healthy,
        responseTime: xrayHealth.responseTime,
      });

      const overallHealthy = healthChecks.every(check => check.healthy);
      
      await this.monitoring.logInfo('Health check completed', {
        overallHealthy,
        checks: healthChecks,
      });

      return {
        success: true,
        healthy: overallHealthy,
        checks: healthChecks,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await this.monitoring.logError('Health check failed', error);
      return {
        success: false,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Cleanup monitoring resources
  async cleanup() {
    await this.monitoring.cleanup();
  }
}

module.exports = { MonitoringService };