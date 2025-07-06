/**
 * EventBridge Service for Enhanced Data Processing
 * Handles event-driven architecture for real-time updates and notifications
 */

const { EventBridgeClient, PutEventsCommand, CreateEventBusCommand, PutRuleCommand, PutTargetsCommand } = require('@aws-sdk/client-eventbridge');
const { SNSClient, PublishCommand, CreateTopicCommand, SubscribeCommand } = require('@aws-sdk/client-sns');
const { SQSClient, CreateQueueCommand, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

class EventBridgeService {
  constructor() {
    this.eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
    
    this.eventBusName = process.env.EVENTBRIDGE_BUS_NAME || 'aws-opportunity-analysis-bus';
    this.snsTopicArn = process.env.SNS_TOPIC_ARN;
    this.dlqUrl = process.env.DLQ_URL;
    
    this.eventTypes = {
      ANALYSIS_STARTED: 'opportunity.analysis.started',
      ANALYSIS_COMPLETED: 'opportunity.analysis.completed',
      ANALYSIS_FAILED: 'opportunity.analysis.failed',
      QUERY_GENERATED: 'opportunity.query.generated',
      DATA_RETRIEVED: 'opportunity.data.retrieved',
      FUNDING_ANALYSIS_COMPLETED: 'opportunity.funding.completed',
      FOLLOWON_ANALYSIS_COMPLETED: 'opportunity.followon.completed',
      USER_NOTIFICATION: 'user.notification.required'
    };
  }

  /**
   * Initialize EventBridge infrastructure
   */
  async initialize() {
    try {
      console.log('Initializing EventBridge infrastructure...');
      
      // Create custom event bus
      await this.createEventBus();
      
      // Create event rules
      await this.createEventRules();
      
      // Setup SNS integration
      await this.setupSNSIntegration();
      
      // Setup dead letter queue
      await this.setupDeadLetterQueue();
      
      console.log('EventBridge infrastructure initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize EventBridge infrastructure:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create custom EventBridge bus
   */
  async createEventBus() {
    try {
      const command = new CreateEventBusCommand({
        Name: this.eventBusName,
        Tags: [
          { Key: 'Application', Value: 'AWS-Opportunity-Analysis' },
          { Key: 'Environment', Value: process.env.NODE_ENV || 'development' }
        ]
      });
      
      await this.eventBridgeClient.send(command);
      console.log(`EventBridge bus '${this.eventBusName}' created successfully`);
    } catch (error) {
      if (error.name === 'ResourceAlreadyExistsException') {
        console.log(`EventBridge bus '${this.eventBusName}' already exists`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Create event rules for different event types
   */
  async createEventRules() {
    const rules = [
      {
        name: 'analysis-completion-rule',
        eventPattern: {
          source: ['aws.opportunity.analysis'],
          'detail-type': ['Analysis Completed', 'Analysis Failed']
        },
        description: 'Rule for analysis completion events'
      },
      {
        name: 'error-handling-rule',
        eventPattern: {
          source: ['aws.opportunity.analysis'],
          'detail-type': ['Analysis Failed', 'Query Generation Failed', 'Data Retrieval Failed']
        },
        description: 'Rule for error handling events'
      },
      {
        name: 'notification-rule',
        eventPattern: {
          source: ['aws.opportunity.analysis'],
          'detail-type': ['User Notification Required']
        },
        description: 'Rule for user notification events'
      }
    ];

    for (const rule of rules) {
      try {
        const command = new PutRuleCommand({
          Name: rule.name,
          EventBusName: this.eventBusName,
          EventPattern: JSON.stringify(rule.eventPattern),
          Description: rule.description,
          State: 'ENABLED'
        });
        
        await this.eventBridgeClient.send(command);
        console.log(`Event rule '${rule.name}' created successfully`);
      } catch (error) {
        console.error(`Failed to create rule '${rule.name}':`, error);
      }
    }
  }

  /**
   * Setup SNS integration for notifications
   */
  async setupSNSIntegration() {
    if (!this.snsTopicArn) {
      console.log('SNS Topic ARN not configured, skipping SNS integration');
      return;
    }

    try {
      // Add SNS as target for notification rule
      const command = new PutTargetsCommand({
        Rule: 'notification-rule',
        EventBusName: this.eventBusName,
        Targets: [
          {
            Id: '1',
            Arn: this.snsTopicArn,
            InputTransformer: {
              InputPathsMap: {
                'detail-type': '$.detail-type',
                'source': '$.source',
                'detail': '$.detail'
              },
              InputTemplate: JSON.stringify({
                message: 'EventBridge notification: <detail-type> from <source>',
                details: '<detail>'
              })
            }
          }
        ]
      });
      
      await this.eventBridgeClient.send(command);
      console.log('SNS integration configured successfully');
    } catch (error) {
      console.error('Failed to setup SNS integration:', error);
    }
  }

  /**
   * Setup dead letter queue for failed events
   */
  async setupDeadLetterQueue() {
    if (!this.dlqUrl) {
      console.log('DLQ URL not configured, skipping DLQ setup');
      return;
    }

    try {
      // Add DLQ as target for error handling rule
      const command = new PutTargetsCommand({
        Rule: 'error-handling-rule',
        EventBusName: this.eventBusName,
        Targets: [
          {
            Id: '1',
            Arn: this.dlqUrl.replace('https://sqs.', 'arn:aws:sqs:').replace('.amazonaws.com/', ':'),
            DeadLetterConfig: {
              Arn: this.dlqUrl.replace('https://sqs.', 'arn:aws:sqs:').replace('.amazonaws.com/', ':')
            },
            RetryPolicy: {
              MaximumRetryAttempts: 3,
              MaximumEventAge: 3600
            }
          }
        ]
      });
      
      await this.eventBridgeClient.send(command);
      console.log('Dead letter queue configured successfully');
    } catch (error) {
      console.error('Failed to setup dead letter queue:', error);
    }
  }

  /**
   * Publish event to EventBridge
   */
  async publishEvent(eventType, detail, source = 'aws.opportunity.analysis') {
    try {
      const event = {
        Source: source,
        DetailType: this.getDetailType(eventType),
        Detail: JSON.stringify({
          ...detail,
          timestamp: new Date().toISOString(),
          eventId: this.generateEventId()
        }),
        EventBusName: this.eventBusName
      };

      const command = new PutEventsCommand({
        Entries: [event]
      });

      const result = await this.eventBridgeClient.send(command);
      
      if (result.FailedEntryCount > 0) {
        console.error('Failed to publish event:', result.Entries[0].ErrorMessage);
        return { success: false, error: result.Entries[0].ErrorMessage };
      }

      console.log(`Event published successfully: ${eventType}`);
      return { success: true, eventId: event.Detail.eventId };
    } catch (error) {
      console.error('Error publishing event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Publish analysis started event
   */
  async publishAnalysisStarted(opportunityDetails, analysisType = 'standard') {
    return await this.publishEvent(this.eventTypes.ANALYSIS_STARTED, {
      opportunityDetails,
      analysisType,
      status: 'started'
    });
  }

  /**
   * Publish analysis completed event
   */
  async publishAnalysisCompleted(opportunityDetails, analysisResults, analysisType = 'standard') {
    return await this.publishEvent(this.eventTypes.ANALYSIS_COMPLETED, {
      opportunityDetails,
      analysisResults: {
        metrics: analysisResults.metrics,
        confidence: analysisResults.sections?.confidence || 'MEDIUM',
        topServices: analysisResults.metrics?.topServices
      },
      analysisType,
      status: 'completed'
    });
  }

  /**
   * Publish analysis failed event
   */
  async publishAnalysisFailed(opportunityDetails, error, analysisType = 'standard') {
    return await this.publishEvent(this.eventTypes.ANALYSIS_FAILED, {
      opportunityDetails,
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      },
      analysisType,
      status: 'failed'
    });
  }

  /**
   * Publish query generated event
   */
  async publishQueryGenerated(opportunityDetails, generatedQuery) {
    return await this.publishEvent(this.eventTypes.QUERY_GENERATED, {
      opportunityDetails,
      query: generatedQuery,
      status: 'query_generated'
    });
  }

  /**
   * Publish data retrieved event
   */
  async publishDataRetrieved(opportunityDetails, dataResults) {
    return await this.publishEvent(this.eventTypes.DATA_RETRIEVED, {
      opportunityDetails,
      dataResults: {
        recordCount: Array.isArray(dataResults) ? dataResults.length : 0,
        hasData: Array.isArray(dataResults) && dataResults.length > 0
      },
      status: 'data_retrieved'
    });
  }

  /**
   * Publish funding analysis completed event
   */
  async publishFundingAnalysisCompleted(opportunityDetails, fundingResults) {
    return await this.publishEvent(this.eventTypes.FUNDING_ANALYSIS_COMPLETED, {
      opportunityDetails,
      fundingResults,
      status: 'funding_completed'
    });
  }

  /**
   * Publish follow-on analysis completed event
   */
  async publishFollowOnAnalysisCompleted(opportunityDetails, followOnResults) {
    return await this.publishEvent(this.eventTypes.FOLLOWON_ANALYSIS_COMPLETED, {
      opportunityDetails,
      followOnResults,
      status: 'followon_completed'
    });
  }

  /**
   * Publish user notification event
   */
  async publishUserNotification(userId, notificationType, message, data = {}) {
    return await this.publishEvent(this.eventTypes.USER_NOTIFICATION, {
      userId,
      notificationType,
      message,
      data,
      status: 'notification_required'
    });
  }

  /**
   * Send SNS notification
   */
  async sendSNSNotification(message, subject = 'AWS Opportunity Analysis Notification') {
    if (!this.snsTopicArn) {
      console.log('SNS Topic ARN not configured, skipping notification');
      return { success: false, error: 'SNS not configured' };
    }

    try {
      const command = new PublishCommand({
        TopicArn: this.snsTopicArn,
        Message: typeof message === 'string' ? message : JSON.stringify(message),
        Subject: subject
      });

      const result = await this.snsClient.send(command);
      console.log('SNS notification sent successfully:', result.MessageId);
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('Error sending SNS notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process dead letter queue messages
   */
  async processDLQMessages() {
    if (!this.dlqUrl) {
      return { success: false, error: 'DLQ not configured' };
    }

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.dlqUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 5
      });

      const result = await this.sqsClient.send(command);
      const messages = result.Messages || [];

      console.log(`Processing ${messages.length} DLQ messages`);

      for (const message of messages) {
        try {
          const eventData = JSON.parse(message.Body);
          console.log('Processing failed event:', eventData);

          // Implement retry logic or manual intervention here
          await this.handleFailedEvent(eventData);

          // Delete processed message
          await this.sqsClient.send(new DeleteMessageCommand({
            QueueUrl: this.dlqUrl,
            ReceiptHandle: message.ReceiptHandle
          }));

        } catch (error) {
          console.error('Error processing DLQ message:', error);
        }
      }

      return { success: true, processedCount: messages.length };
    } catch (error) {
      console.error('Error processing DLQ messages:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle failed events from DLQ
   */
  async handleFailedEvent(eventData) {
    console.log('Handling failed event:', eventData);
    
    // Implement specific handling logic based on event type
    // This could include retry mechanisms, alerting, or manual intervention
    
    // For now, just log the event for manual review
    console.log('Failed event logged for manual review:', {
      timestamp: new Date().toISOString(),
      eventData
    });
  }

  /**
   * Get event replay capability
   */
  async replayEvents(startTime, endTime, eventPattern = {}) {
    try {
      console.log(`Replaying events from ${startTime} to ${endTime}`);
      
      // Note: EventBridge Replay is a more complex feature that requires
      // additional setup and permissions. This is a placeholder for the capability.
      
      console.log('Event replay initiated (placeholder implementation)');
      return { success: true, message: 'Event replay capability available' };
    } catch (error) {
      console.error('Error replaying events:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get detail type for event
   */
  getDetailType(eventType) {
    const detailTypeMap = {
      [this.eventTypes.ANALYSIS_STARTED]: 'Analysis Started',
      [this.eventTypes.ANALYSIS_COMPLETED]: 'Analysis Completed',
      [this.eventTypes.ANALYSIS_FAILED]: 'Analysis Failed',
      [this.eventTypes.QUERY_GENERATED]: 'Query Generated',
      [this.eventTypes.DATA_RETRIEVED]: 'Data Retrieved',
      [this.eventTypes.FUNDING_ANALYSIS_COMPLETED]: 'Funding Analysis Completed',
      [this.eventTypes.FOLLOWON_ANALYSIS_COMPLETED]: 'Follow-on Analysis Completed',
      [this.eventTypes.USER_NOTIFICATION]: 'User Notification Required'
    };
    
    return detailTypeMap[eventType] || 'Unknown Event';
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(timeRange = 24 * 60 * 60 * 1000) {
    // This would typically query CloudWatch metrics for EventBridge
    // For now, return placeholder statistics
    return {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      eventsByType: {},
      timeRange: timeRange,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = EventBridgeService;