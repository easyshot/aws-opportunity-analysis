const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
const logs = require('aws-cdk-lib/aws-logs');
const sns = require('aws-cdk-lib/aws-sns');
const snsSubscriptions = require('aws-cdk-lib/aws-sns-subscriptions');
const lambda = require('aws-cdk-lib/aws-lambda');
const iam = require('aws-cdk-lib/aws-iam');
const xray = require('aws-cdk-lib/aws-xray');

class MonitoringStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create SNS topic for alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: 'opportunity-analysis-alerts',
      displayName: 'AWS Opportunity Analysis Alerts',
    });

    // Add email subscription (can be configured via environment variable)
    if (process.env.ALERT_EMAIL) {
      alertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(process.env.ALERT_EMAIL)
      );
    }

    // Create CloudWatch Log Groups with structured retention
    const logGroups = {
      api: new logs.LogGroup(this, 'ApiLogGroup', {
        logGroupName: '/aws/opportunity-analysis/api',
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      lambda: new logs.LogGroup(this, 'LambdaLogGroup', {
        logGroupName: '/aws/opportunity-analysis/lambda',
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      stepfunctions: new logs.LogGroup(this, 'StepFunctionsLogGroup', {
        logGroupName: '/aws/opportunity-analysis/stepfunctions',
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      bedrock: new logs.LogGroup(this, 'BedrockLogGroup', {
        logGroupName: '/aws/opportunity-analysis/bedrock',
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      application: new logs.LogGroup(this, 'ApplicationLogGroup', {
        logGroupName: '/aws/opportunity-analysis/application',
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    };

    // Create X-Ray sampling rules for different service types
    const xraySamplingRules = [
      {
        ruleName: 'OpportunityAnalysisAPI',
        priority: 9000,
        fixedRate: 0.1,
        reservoirSize: 1,
        serviceName: 'opportunity-analysis-api',
        serviceType: 'AWS::ApiGateway::Stage',
        host: '*',
        httpMethod: '*',
        urlPath: '/api/*',
        version: 1,
      },
      {
        ruleName: 'OpportunityAnalysisLambda',
        priority: 9001,
        fixedRate: 0.2,
        reservoirSize: 2,
        serviceName: 'opportunity-analysis-lambda',
        serviceType: 'AWS::Lambda::Function',
        host: '*',
        httpMethod: '*',
        urlPath: '*',
        version: 1,
      },
      {
        ruleName: 'OpportunityAnalysisStepFunctions',
        priority: 9002,
        fixedRate: 0.3,
        reservoirSize: 1,
        serviceName: 'opportunity-analysis-stepfunctions',
        serviceType: 'AWS::StepFunctions::StateMachine',
        host: '*',
        httpMethod: '*',
        urlPath: '*',
        version: 1,
      },
      {
        ruleName: 'OpportunityAnalysisBedrock',
        priority: 9003,
        fixedRate: 0.1,
        reservoirSize: 1,
        serviceName: 'opportunity-analysis-bedrock',
        serviceType: '*',
        host: '*',
        httpMethod: '*',
        urlPath: '*',
        version: 1,
      },
    ];

    // Create X-Ray sampling rules
    xraySamplingRules.forEach((rule, index) => {
      new xray.CfnSamplingRule(this, `XRaySamplingRule${index}`, {
        samplingRule: rule,
      });
    });

    // Create custom CloudWatch metrics namespace
    const metricsNamespace = 'AWS/OpportunityAnalysis';

    // Create business KPI metrics
    const businessMetrics = {
      analysisRequests: new cloudwatch.Metric({
        namespace: metricsNamespace,
        metricName: 'AnalysisRequests',
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      analysisLatency: new cloudwatch.Metric({
        namespace: metricsNamespace,
        metricName: 'AnalysisLatency',
        statistic: 'Average',
        period: Duration.minutes(5),
      }),
      analysisErrors: new cloudwatch.Metric({
        namespace: metricsNamespace,
        metricName: 'AnalysisErrors',
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      bedrockInvocations: new cloudwatch.Metric({
        namespace: metricsNamespace,
        metricName: 'BedrockInvocations',
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      queryExecutions: new cloudwatch.Metric({
        namespace: metricsNamespace,
        metricName: 'QueryExecutions',
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      cacheHitRate: new cloudwatch.Metric({
        namespace: metricsNamespace,
        metricName: 'CacheHitRate',
        statistic: 'Average',
        period: Duration.minutes(5),
      }),
    };

    // Create CloudWatch Alarms
    const alarms = {
      highErrorRate: new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
        metric: businessMetrics.analysisErrors,
        threshold: 10,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'High error rate detected in opportunity analysis',
        alarmName: 'OpportunityAnalysis-HighErrorRate',
      }),
      
      highLatency: new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
        metric: businessMetrics.analysisLatency,
        threshold: 30000, // 30 seconds
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'High latency detected in opportunity analysis',
        alarmName: 'OpportunityAnalysis-HighLatency',
      }),
      
      lowCacheHitRate: new cloudwatch.Alarm(this, 'LowCacheHitRateAlarm', {
        metric: businessMetrics.cacheHitRate,
        threshold: 0.3, // 30%
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'Low cache hit rate detected',
        alarmName: 'OpportunityAnalysis-LowCacheHitRate',
      }),
      
      bedrockThrottling: new cloudwatch.Alarm(this, 'BedrockThrottlingAlarm', {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Bedrock',
          metricName: 'UserErrors',
          statistic: 'Sum',
          period: Duration.minutes(5),
          dimensionsMap: {
            'ModelId': '*',
          },
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'Bedrock throttling or user errors detected',
        alarmName: 'OpportunityAnalysis-BedrockThrottling',
      }),
    };

    // Add SNS actions to all alarms
    Object.values(alarms).forEach(alarm => {
      alarm.addAlarmAction(new cloudwatch.SnsAction(alertTopic));
      alarm.addOkAction(new cloudwatch.SnsAction(alertTopic));
    });

    // Create comprehensive CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'OpportunityAnalysisDashboard', {
      dashboardName: 'AWS-Opportunity-Analysis-Comprehensive',
      widgets: [
        // Row 1: Business KPIs
        [
          new cloudwatch.SingleValueWidget({
            title: 'Total Analysis Requests (24h)',
            metrics: [businessMetrics.analysisRequests],
            period: Duration.hours(24),
            statistic: 'Sum',
            width: 6,
            height: 6,
          }),
          new cloudwatch.SingleValueWidget({
            title: 'Average Analysis Latency',
            metrics: [businessMetrics.analysisLatency],
            period: Duration.hours(1),
            statistic: 'Average',
            width: 6,
            height: 6,
          }),
          new cloudwatch.SingleValueWidget({
            title: 'Error Rate (%)',
            metrics: [
              new cloudwatch.MathExpression({
                expression: '(errors / requests) * 100',
                usingMetrics: {
                  errors: businessMetrics.analysisErrors,
                  requests: businessMetrics.analysisRequests,
                },
              }),
            ],
            period: Duration.hours(1),
            width: 6,
            height: 6,
          }),
          new cloudwatch.SingleValueWidget({
            title: 'Cache Hit Rate (%)',
            metrics: [
              new cloudwatch.MathExpression({
                expression: 'cacheHitRate * 100',
                usingMetrics: {
                  cacheHitRate: businessMetrics.cacheHitRate,
                },
              }),
            ],
            period: Duration.hours(1),
            width: 6,
            height: 6,
          }),
        ],
        
        // Row 2: Request and Error Trends
        [
          new cloudwatch.GraphWidget({
            title: 'Analysis Requests Over Time',
            left: [businessMetrics.analysisRequests],
            width: 12,
            height: 6,
            period: Duration.minutes(5),
            statistic: 'Sum',
          }),
          new cloudwatch.GraphWidget({
            title: 'Error Trends',
            left: [businessMetrics.analysisErrors],
            width: 12,
            height: 6,
            period: Duration.minutes(5),
            statistic: 'Sum',
          }),
        ],
        
        // Row 3: Performance Metrics
        [
          new cloudwatch.GraphWidget({
            title: 'Analysis Latency Distribution',
            left: [
              businessMetrics.analysisLatency.with({
                statistic: 'Average',
                label: 'Average',
              }),
              businessMetrics.analysisLatency.with({
                statistic: 'p95',
                label: '95th Percentile',
              }),
              businessMetrics.analysisLatency.with({
                statistic: 'p99',
                label: '99th Percentile',
              }),
            ],
            width: 12,
            height: 6,
          }),
          new cloudwatch.GraphWidget({
            title: 'Service Invocations',
            left: [
              businessMetrics.bedrockInvocations,
              businessMetrics.queryExecutions,
            ],
            width: 12,
            height: 6,
          }),
        ],
        
        // Row 4: AWS Service Metrics
        [
          new cloudwatch.GraphWidget({
            title: 'Bedrock Model Invocations',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/Bedrock',
                metricName: 'Invocations',
                statistic: 'Sum',
                period: Duration.minutes(5),
                dimensionsMap: {
                  'ModelId': 'amazon.titan-text-express-v1',
                },
                label: 'Titan Express',
              }),
              new cloudwatch.Metric({
                namespace: 'AWS/Bedrock',
                metricName: 'Invocations',
                statistic: 'Sum',
                period: Duration.minutes(5),
                dimensionsMap: {
                  'ModelId': 'amazon.nova-premier-v1:0',
                },
                label: 'Nova Premier',
              }),
            ],
            width: 12,
            height: 6,
          }),
          new cloudwatch.GraphWidget({
            title: 'Bedrock Latency',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/Bedrock',
                metricName: 'InvocationLatency',
                statistic: 'Average',
                period: Duration.minutes(5),
                dimensionsMap: {
                  'ModelId': 'amazon.titan-text-express-v1',
                },
                label: 'Titan Express',
              }),
              new cloudwatch.Metric({
                namespace: 'AWS/Bedrock',
                metricName: 'InvocationLatency',
                statistic: 'Average',
                period: Duration.minutes(5),
                dimensionsMap: {
                  'ModelId': 'amazon.nova-premier-v1:0',
                },
                label: 'Nova Premier',
              }),
            ],
            width: 12,
            height: 6,
          }),
        ],
        
        // Row 5: Infrastructure Metrics
        [
          new cloudwatch.GraphWidget({
            title: 'DynamoDB Metrics',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'ConsumedReadCapacityUnits',
                statistic: 'Sum',
                period: Duration.minutes(5),
                dimensionsMap: {
                  'TableName': 'opportunity-analysis-cache',
                },
                label: 'Read Capacity',
              }),
              new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'ConsumedWriteCapacityUnits',
                statistic: 'Sum',
                period: Duration.minutes(5),
                dimensionsMap: {
                  'TableName': 'opportunity-analysis-cache',
                },
                label: 'Write Capacity',
              }),
            ],
            width: 12,
            height: 6,
          }),
          new cloudwatch.GraphWidget({
            title: 'S3 Metrics',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/S3',
                metricName: 'NumberOfObjects',
                statistic: 'Average',
                period: Duration.hours(1),
                dimensionsMap: {
                  'BucketName': 'as-athena-catapult',
                  'StorageType': 'AllStorageTypes',
                },
                label: 'Object Count',
              }),
            ],
            width: 12,
            height: 6,
          }),
        ],
      ],
    });

    // Create CloudWatch Insights queries for log analysis
    const insightQueries = [
      {
        name: 'Error Analysis',
        queryString: `
          fields @timestamp, @message, @logStream
          | filter @message like /ERROR/
          | stats count() by bin(5m)
          | sort @timestamp desc
        `,
      },
      {
        name: 'Performance Analysis',
        queryString: `
          fields @timestamp, @message, @duration
          | filter @message like /Analysis completed/
          | stats avg(@duration), max(@duration), min(@duration) by bin(5m)
          | sort @timestamp desc
        `,
      },
      {
        name: 'Bedrock Usage Analysis',
        queryString: `
          fields @timestamp, @message
          | filter @message like /Bedrock/
          | stats count() by bin(5m)
          | sort @timestamp desc
        `,
      },
      {
        name: 'User Activity Analysis',
        queryString: `
          fields @timestamp, @message
          | filter @message like /Customer/
          | parse @message "Customer: *" as customer
          | stats count() by customer
          | sort count desc
        `,
      },
    ];

    // Create Lambda function for automated alerting and incident response
    const alertingLambda = new lambda.Function(this, 'AlertingLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

exports.handler = async (event) => {
  console.log('Alerting Lambda triggered:', JSON.stringify(event, null, 2));
  
  const cloudWatch = new CloudWatchClient({ region: process.env.AWS_REGION });
  const sns = new SNSClient({ region: process.env.AWS_REGION });
  
  try {
    // Parse CloudWatch alarm event
    const message = JSON.parse(event.Records[0].Sns.Message);
    const alarmName = message.AlarmName;
    const newState = message.NewStateValue;
    const reason = message.NewStateReason;
    
    // Log the incident
    console.log(\`Alarm: \${alarmName}, State: \${newState}, Reason: \${reason}\`);
    
    // Send custom metric for incident tracking
    await cloudWatch.send(new PutMetricDataCommand({
      Namespace: 'AWS/OpportunityAnalysis/Incidents',
      MetricData: [{
        MetricName: 'AlarmStateChanges',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'AlarmName', Value: alarmName },
          { Name: 'State', Value: newState }
        ]
      }]
    }));
    
    // Enhanced notification for critical alarms
    if (newState === 'ALARM' && alarmName.includes('HighErrorRate')) {
      const enhancedMessage = \`
🚨 CRITICAL ALERT: High Error Rate Detected

Alarm: \${alarmName}
State: \${newState}
Reason: \${reason}
Time: \${new Date().toISOString()}

Recommended Actions:
1. Check application logs in CloudWatch Logs
2. Verify AWS service status
3. Review recent deployments
4. Check X-Ray traces for error patterns

Dashboard: https://console.aws.amazon.com/cloudwatch/home#dashboards:name=AWS-Opportunity-Analysis-Comprehensive
      \`;
      
      await sns.send(new PublishCommand({
        TopicArn: process.env.ALERT_TOPIC_ARN,
        Subject: \`🚨 CRITICAL: \${alarmName}\`,
        Message: enhancedMessage
      }));
    }
    
    return { statusCode: 200, body: 'Alert processed successfully' };
  } catch (error) {
    console.error('Error processing alert:', error);
    return { statusCode: 500, body: 'Error processing alert' };
  }
};
      `),
      environment: {
        ALERT_TOPIC_ARN: alertTopic.topicArn,
      },
      timeout: Duration.minutes(1),
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions to the alerting Lambda
    alertingLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
        'sns:Publish',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));

    // Subscribe the Lambda to the SNS topic
    alertTopic.addSubscription(new snsSubscriptions.LambdaSubscription(alertingLambda));

    // Store references for use by other stacks
    this.alertTopic = alertTopic;
    this.logGroups = logGroups;
    this.dashboard = dashboard;
    this.alarms = alarms;
    this.businessMetrics = businessMetrics;
    this.alertingLambda = alertingLambda;
    this.insightQueries = insightQueries;
  }
}

module.exports = { MonitoringStack };