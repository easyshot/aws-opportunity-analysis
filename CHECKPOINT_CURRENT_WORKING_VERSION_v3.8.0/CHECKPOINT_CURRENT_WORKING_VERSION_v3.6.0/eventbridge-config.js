/**
 * EventBridge Configuration
 * Centralized configuration for EventBridge enhanced data processing
 */

const eventBridgeConfig = {
  // EventBridge settings
  eventBus: {
    name: process.env.EVENTBRIDGE_BUS_NAME || 'aws-opportunity-analysis-bus',
    region: process.env.AWS_REGION || 'us-east-1'
  },

  // Event types and their configurations
  eventTypes: {
    ANALYSIS_STARTED: {
      type: 'opportunity.analysis.started',
      detailType: 'Analysis Started',
      source: 'aws.opportunity.analysis',
      retryPolicy: {
        maximumRetryAttempts: 3,
        maximumEventAge: 3600
      }
    },
    ANALYSIS_COMPLETED: {
      type: 'opportunity.analysis.completed',
      detailType: 'Analysis Completed',
      source: 'aws.opportunity.analysis',
      retryPolicy: {
        maximumRetryAttempts: 2,
        maximumEventAge: 1800
      }
    },
    ANALYSIS_FAILED: {
      type: 'opportunity.analysis.failed',
      detailType: 'Analysis Failed',
      source: 'aws.opportunity.analysis',
      retryPolicy: {
        maximumRetryAttempts: 5,
        maximumEventAge: 7200
      }
    },
    QUERY_GENERATED: {
      type: 'opportunity.query.generated',
      detailType: 'Query Generated',
      source: 'aws.opportunity.analysis',
      retryPolicy: {
        maximumRetryAttempts: 2,
        maximumEventAge: 1800
      }
    },
    DATA_RETRIEVED: {
      type: 'opportunity.data.retrieved',
      detailType: 'Data Retrieved',
      source: 'aws.opportunity.analysis',
      retryPolicy: {
        maximumRetryAttempts: 2,
        maximumEventAge: 1800
      }
    },
    FUNDING_ANALYSIS_COMPLETED: {
      type: 'opportunity.funding.completed',
      detailType: 'Funding Analysis Completed',
      source: 'aws.opportunity.analysis',
      retryPolicy: {
        maximumRetryAttempts: 2,
        maximumEventAge: 1800
      }
    },
    FOLLOWON_ANALYSIS_COMPLETED: {
      type: 'opportunity.followon.completed',
      detailType: 'Follow-on Analysis Completed',
      source: 'aws.opportunity.analysis',
      retryPolicy: {
        maximumRetryAttempts: 2,
        maximumEventAge: 1800
      }
    },
    USER_NOTIFICATION: {
      type: 'user.notification.required',
      detailType: 'User Notification Required',
      source: 'aws.opportunity.analysis',
      retryPolicy: {
        maximumRetryAttempts: 3,
        maximumEventAge: 3600
      }
    }
  },

  // Event rules configuration
  eventRules: [
    {
      name: 'analysis-completion-rule',
      description: 'Rule for analysis completion events',
      eventPattern: {
        source: ['aws.opportunity.analysis'],
        'detail-type': ['Analysis Completed', 'Analysis Failed']
      },
      targets: [
        {
          type: 'sns',
          arn: process.env.SNS_TOPIC_ARN,
          inputTransformer: {
            inputPathsMap: {
              'detail-type': '$.detail-type',
              'source': '$.source',
              'detail': '$.detail'
            },
            inputTemplate: JSON.stringify({
              message: 'Analysis event: <detail-type> from <source>',
              details: '<detail>'
            })
          }
        }
      ]
    },
    {
      name: 'error-handling-rule',
      description: 'Rule for error handling events',
      eventPattern: {
        source: ['aws.opportunity.analysis'],
        'detail-type': ['Analysis Failed', 'Query Generation Failed', 'Data Retrieval Failed']
      },
      targets: [
        {
          type: 'sqs',
          arn: process.env.DLQ_ARN,
          deadLetterConfig: {
            arn: process.env.DLQ_ARN
          },
          retryPolicy: {
            maximumRetryAttempts: 3,
            maximumEventAge: 3600
          }
        }
      ]
    },
    {
      name: 'notification-rule',
      description: 'Rule for user notification events',
      eventPattern: {
        source: ['aws.opportunity.analysis'],
        'detail-type': ['User Notification Required']
      },
      targets: [
        {
          type: 'sns',
          arn: process.env.SNS_TOPIC_ARN,
          inputTransformer: {
            inputPathsMap: {
              'userId': '$.detail.userId',
              'message': '$.detail.message',
              'notificationType': '$.detail.notificationType'
            },
            inputTemplate: JSON.stringify({
              userId: '<userId>',
              notification: '<message>',
              type: '<notificationType>'
            })
          }
        }
      ]
    },
    {
      name: 'real-time-updates-rule',
      description: 'Rule for real-time updates',
      eventPattern: {
        source: ['aws.opportunity.analysis'],
        'detail-type': [
          'Query Generated',
          'Data Retrieved',
          'Analysis Completed',
          'Funding Analysis Completed',
          'Follow-on Analysis Completed'
        ]
      },
      targets: [
        {
          type: 'lambda',
          arn: process.env.REALTIME_UPDATE_LAMBDA_ARN,
          inputTransformer: {
            inputPathsMap: {
              'eventType': '$.detail-type',
              'opportunityDetails': '$.detail.opportunityDetails',
              'timestamp': '$.detail.timestamp'
            },
            inputTemplate: JSON.stringify({
              eventType: '<eventType>',
              opportunity: '<opportunityDetails>',
              timestamp: '<timestamp>',
              action: 'real-time-update'
            })
          }
        }
      ]
    }
  ],

  // SNS configuration
  sns: {
    topicArn: process.env.SNS_TOPIC_ARN,
    region: process.env.AWS_REGION || 'us-east-1',
    messageAttributes: {
      application: {
        DataType: 'String',
        StringValue: 'AWS-Opportunity-Analysis'
      },
      environment: {
        DataType: 'String',
        StringValue: process.env.NODE_ENV || 'development'
      }
    }
  },

  // SQS Dead Letter Queue configuration
  dlq: {
    queueUrl: process.env.DLQ_URL,
    queueArn: process.env.DLQ_ARN,
    region: process.env.AWS_REGION || 'us-east-1',
    visibilityTimeoutSeconds: 300,
    messageRetentionPeriod: 1209600, // 14 days
    maxReceiveCount: 3
  },

  // Event replay configuration
  replay: {
    enabled: process.env.EVENTBRIDGE_REPLAY_ENABLED === 'true',
    replayName: 'opportunity-analysis-replay',
    description: 'Replay events for AWS Opportunity Analysis',
    eventSourceArn: process.env.EVENTBRIDGE_BUS_ARN
  },

  // Monitoring and metrics
  monitoring: {
    cloudWatchNamespace: 'AWS/OpportunityAnalysis/EventBridge',
    customMetrics: [
      'EventsPublished',
      'EventsProcessed',
      'EventsFailed',
      'NotificationsSent',
      'DLQMessages'
    ],
    alarms: {
      highErrorRate: {
        threshold: 5,
        evaluationPeriods: 2,
        comparisonOperator: 'GreaterThanThreshold'
      },
      dlqMessages: {
        threshold: 10,
        evaluationPeriods: 1,
        comparisonOperator: 'GreaterThanOrEqualToThreshold'
      }
    }
  },

  // Feature flags
  features: {
    enableEventDrivenArchitecture: process.env.ENABLE_EVENT_DRIVEN === 'true',
    enableRealTimeUpdates: process.env.ENABLE_REALTIME_UPDATES === 'true',
    enableNotifications: process.env.ENABLE_NOTIFICATIONS === 'true',
    enableEventReplay: process.env.ENABLE_EVENT_REPLAY === 'true',
    enableDLQProcessing: process.env.ENABLE_DLQ_PROCESSING === 'true'
  }
};

module.exports = eventBridgeConfig;