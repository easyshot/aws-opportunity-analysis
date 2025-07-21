/**
 * EventBridge Stack for Enhanced Data Processing
 * Creates EventBridge infrastructure for event-driven architecture
 */

const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { EventBus, Rule, RuleTargetInput } = require('aws-cdk-lib/aws-events');
const { SnsDestination, SqsDestination, LambdaDestination } = require('aws-cdk-lib/aws-events-targets');
const { Topic, Subscription, SubscriptionProtocol } = require('aws-cdk-lib/aws-sns');
const { Queue, DeadLetterQueue } = require('aws-cdk-lib/aws-sqs');
const { Function, Runtime, Code } = require('aws-cdk-lib/aws-lambda');
const { PolicyStatement, Effect } = require('aws-cdk-lib/aws-iam');
const { LogGroup, RetentionDays } = require('aws-cdk-lib/aws-logs');

class EventBridgeStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create custom EventBridge bus
    this.eventBus = new EventBus(this, 'OpportunityAnalysisEventBus', {
      eventBusName: 'aws-opportunity-analysis-bus',
      description: 'Custom event bus for AWS Opportunity Analysis application'
    });

    // Create SNS topic for notifications
    this.notificationTopic = new Topic(this, 'OpportunityAnalysisNotifications', {
      topicName: 'opportunity-analysis-notifications',
      displayName: 'AWS Opportunity Analysis Notifications'
    });

    // Create dead letter queue
    this.deadLetterQueue = new Queue(this, 'OpportunityAnalysisDLQ', {
      queueName: 'opportunity-analysis-dlq',
      retentionPeriod: Duration.days(14),
      visibilityTimeout: Duration.minutes(5)
    });

    // Create Lambda function for real-time updates
    this.realTimeUpdateFunction = new Function(this, 'RealTimeUpdateFunction', {
      functionName: 'opportunity-realtime-updates',
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Real-time update event:', JSON.stringify(event, null, 2));
          
          // Process the event and send real-time updates
          // This could integrate with WebSocket API, Server-Sent Events, etc.
          
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Real-time update processed',
              eventType: event['detail-type'],
              timestamp: new Date().toISOString()
            })
          };
        };
      `),
      timeout: Duration.minutes(5),
      description: 'Processes EventBridge events for real-time UI updates'
    });

    // Create log group for the Lambda function
    new LogGroup(this, 'RealTimeUpdateLogGroup', {
      logGroupName: `/aws/lambda/${this.realTimeUpdateFunction.functionName}`,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Grant permissions to the Lambda function
    this.realTimeUpdateFunction.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));

    // Create event rules
    this.createEventRules();

    // Output important ARNs
    this.eventBusArn = this.eventBus.eventBusArn;
    this.notificationTopicArn = this.notificationTopic.topicArn;
    this.deadLetterQueueUrl = this.deadLetterQueue.queueUrl;
    this.deadLetterQueueArn = this.deadLetterQueue.queueArn;
    this.realTimeUpdateFunctionArn = this.realTimeUpdateFunction.functionArn;
  }

  /**
   * Create EventBridge rules for different event types
   */
  createEventRules() {
    // Rule for analysis completion events
    const analysisCompletionRule = new Rule(this, 'AnalysisCompletionRule', {
      ruleName: 'analysis-completion-rule',
      description: 'Rule for analysis completion events',
      eventBus: this.eventBus,
      eventPattern: {
        source: ['aws.opportunity.analysis'],
        detailType: ['Analysis Completed', 'Analysis Failed']
      }
    });

    // Add SNS target for notifications
    analysisCompletionRule.addTarget(new SnsDestination(this.notificationTopic, {
      message: RuleTargetInput.fromObject({
        eventType: RuleTargetInput.fromEventPath('$.detail-type'),
        source: RuleTargetInput.fromEventPath('$.source'),
        opportunityName: RuleTargetInput.fromEventPath('$.detail.opportunityDetails.oppName'),
        customerName: RuleTargetInput.fromEventPath('$.detail.opportunityDetails.CustomerName'),
        timestamp: RuleTargetInput.fromEventPath('$.detail.timestamp'),
        status: RuleTargetInput.fromEventPath('$.detail.status')
      })
    }));

    // Rule for error handling events
    const errorHandlingRule = new Rule(this, 'ErrorHandlingRule', {
      ruleName: 'error-handling-rule',
      description: 'Rule for error handling events',
      eventBus: this.eventBus,
      eventPattern: {
        source: ['aws.opportunity.analysis'],
        detailType: ['Analysis Failed', 'Query Generation Failed', 'Data Retrieval Failed']
      }
    });

    // Add DLQ target for failed events
    errorHandlingRule.addTarget(new SqsDestination(this.deadLetterQueue, {
      message: RuleTargetInput.fromObject({
        eventType: RuleTargetInput.fromEventPath('$.detail-type'),
        error: RuleTargetInput.fromEventPath('$.detail.error'),
        opportunityDetails: RuleTargetInput.fromEventPath('$.detail.opportunityDetails'),
        timestamp: RuleTargetInput.fromEventPath('$.detail.timestamp')
      })
    }));

    // Rule for user notification events
    const notificationRule = new Rule(this, 'NotificationRule', {
      ruleName: 'notification-rule',
      description: 'Rule for user notification events',
      eventBus: this.eventBus,
      eventPattern: {
        source: ['aws.opportunity.analysis'],
        detailType: ['User Notification Required']
      }
    });

    // Add SNS target for user notifications
    notificationRule.addTarget(new SnsDestination(this.notificationTopic, {
      message: RuleTargetInput.fromObject({
        userId: RuleTargetInput.fromEventPath('$.detail.userId'),
        notificationType: RuleTargetInput.fromEventPath('$.detail.notificationType'),
        message: RuleTargetInput.fromEventPath('$.detail.message'),
        data: RuleTargetInput.fromEventPath('$.detail.data'),
        timestamp: RuleTargetInput.fromEventPath('$.detail.timestamp')
      })
    }));

    // Rule for real-time updates
    const realTimeUpdatesRule = new Rule(this, 'RealTimeUpdatesRule', {
      ruleName: 'real-time-updates-rule',
      description: 'Rule for real-time updates',
      eventBus: this.eventBus,
      eventPattern: {
        source: ['aws.opportunity.analysis'],
        detailType: [
          'Query Generated',
          'Data Retrieved',
          'Analysis Completed',
          'Funding Analysis Completed',
          'Follow-on Analysis Completed'
        ]
      }
    });

    // Add Lambda target for real-time processing
    realTimeUpdatesRule.addTarget(new LambdaDestination(this.realTimeUpdateFunction, {
      event: RuleTargetInput.fromObject({
        eventType: RuleTargetInput.fromEventPath('$.detail-type'),
        opportunityDetails: RuleTargetInput.fromEventPath('$.detail.opportunityDetails'),
        timestamp: RuleTargetInput.fromEventPath('$.detail.timestamp'),
        action: 'real-time-update'
      })
    }));

    // Rule for comprehensive monitoring
    const monitoringRule = new Rule(this, 'MonitoringRule', {
      ruleName: 'monitoring-rule',
      description: 'Rule for comprehensive monitoring of all events',
      eventBus: this.eventBus,
      eventPattern: {
        source: ['aws.opportunity.analysis']
      }
    });

    // Add Lambda target for monitoring and metrics
    const monitoringFunction = new Function(this, 'MonitoringFunction', {
      functionName: 'opportunity-analysis-monitoring',
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromInline(`
        const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
        
        const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION });
        
        exports.handler = async (event) => {
          console.log('Monitoring event:', JSON.stringify(event, null, 2));
          
          try {
            // Extract event details
            const eventType = event['detail-type'];
            const source = event.source;
            const timestamp = new Date();
            
            // Create custom metrics
            const params = {
              Namespace: 'AWS/OpportunityAnalysis/EventBridge',
              MetricData: [
                {
                  MetricName: 'EventsProcessed',
                  Value: 1,
                  Unit: 'Count',
                  Timestamp: timestamp,
                  Dimensions: [
                    {
                      Name: 'EventType',
                      Value: eventType
                    },
                    {
                      Name: 'Source',
                      Value: source
                    }
                  ]
                }
              ]
            };
            
            await cloudwatch.send(new PutMetricDataCommand(params));
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: 'Event monitored successfully',
                eventType,
                timestamp: timestamp.toISOString()
              })
            };
          } catch (error) {
            console.error('Error in monitoring function:', error);
            throw error;
          }
        };
      `),
      timeout: Duration.minutes(2),
      description: 'Monitors EventBridge events and creates CloudWatch metrics'
    });

    // Grant CloudWatch permissions to monitoring function
    monitoringFunction.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData'
      ],
      resources: ['*']
    }));

    monitoringRule.addTarget(new LambdaDestination(monitoringFunction));

    // Create log group for monitoring function
    new LogGroup(this, 'MonitoringLogGroup', {
      logGroupName: `/aws/lambda/${monitoringFunction.functionName}`,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });
  }

  /**
   * Add email subscription to SNS topic
   */
  addEmailSubscription(email) {
    new Subscription(this, 'EmailSubscription', {
      topic: this.notificationTopic,
      protocol: SubscriptionProtocol.EMAIL,
      endpoint: email
    });
  }

  /**
   * Get stack outputs
   */
  getOutputs() {
    return {
      eventBusName: this.eventBus.eventBusName,
      eventBusArn: this.eventBusArn,
      notificationTopicArn: this.notificationTopicArn,
      deadLetterQueueUrl: this.deadLetterQueueUrl,
      deadLetterQueueArn: this.deadLetterQueueArn,
      realTimeUpdateFunctionArn: this.realTimeUpdateFunctionArn
    };
  }
}

module.exports = { EventBridgeStack };