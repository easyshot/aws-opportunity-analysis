# EventBridge Enhanced Data Processing Guide

## Overview

The EventBridge enhanced data processing implementation provides a comprehensive event-driven architecture for the AWS Opportunity Analysis application. This system enables real-time updates, reliable error handling, user notifications, and event replay capabilities.

## Architecture Components

### 1. EventBridge Service (`lib/eventbridge-service.js`)
- **Custom Event Bus**: Dedicated event bus for application events
- **Event Publishing**: Methods to publish various event types
- **SNS Integration**: Notification delivery via Amazon SNS
- **Dead Letter Queue**: Error handling and message retry
- **Event Replay**: Capability to replay events for recovery

### 2. EventBridge Stack (`lib/eventbridge-stack.js`)
- **Infrastructure as Code**: CDK stack for EventBridge resources
- **Event Rules**: Automated event routing and processing
- **Lambda Functions**: Real-time update processing and monitoring
- **CloudWatch Integration**: Metrics and monitoring

### 3. Frontend Integration (`public/eventbridge-client.js`)
- **Real-time Updates**: Client-side event handling
- **Progress Indicators**: Visual feedback for analysis workflow
- **Notifications**: User-friendly notification system
- **Connection Management**: Automatic reconnection and error handling

## Event Types

### Analysis Workflow Events
- `opportunity.analysis.started` - Analysis process initiated
- `opportunity.query.generated` - SQL query generated successfully
- `opportunity.data.retrieved` - Historical data retrieved
- `opportunity.analysis.completed` - Analysis completed successfully
- `opportunity.analysis.failed` - Analysis process failed

### Specialized Analysis Events
- `opportunity.funding.completed` - Funding analysis completed
- `opportunity.followon.completed` - Follow-on analysis completed

### System Events
- `user.notification.required` - User notification needed

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# EventBridge Configuration
EVENTBRIDGE_BUS_NAME=aws-opportunity-analysis-bus
EVENTBRIDGE_BUS_ARN=arn:aws:events:us-east-1:your-account:event-bus/aws-opportunity-analysis-bus
INITIALIZE_EVENTBRIDGE=true
ENABLE_EVENT_DRIVEN=true
ENABLE_REALTIME_UPDATES=true
ENABLE_NOTIFICATIONS=true
ENABLE_EVENT_REPLAY=false
ENABLE_DLQ_PROCESSING=true

# SNS Configuration for Notifications
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:your-account:opportunity-analysis-notifications

# SQS Dead Letter Queue Configuration
DLQ_URL=https://sqs.us-east-1.amazonaws.com/your-account/opportunity-analysis-dlq
DLQ_ARN=arn:aws:sqs:us-east-1:your-account:opportunity-analysis-dlq

# Real-time Updates Lambda (optional)
REALTIME_UPDATE_LAMBDA_ARN=arn:aws:lambda:us-east-1:your-account:function:opportunity-realtime-updates
```

## Deployment

### 1. Deploy EventBridge Infrastructure

```bash
# Validate configuration
npm run eventbridge:validate

# Deploy infrastructure
npm run eventbridge:deploy

# With email notifications
NOTIFICATION_EMAIL=admin@company.com npm run eventbridge:deploy
```

### 2. Test EventBridge Integration

```bash
# Run all tests
npm run eventbridge:test

# Run quick tests only
npm run eventbridge:test-quick
```

### 3. Initialize EventBridge on Application Startup

Set `INITIALIZE_EVENTBRIDGE=true` in your `.env` file to automatically initialize EventBridge infrastructure when the application starts.

## Usage

### Backend Integration

The EventBridge service is automatically integrated into the main analysis workflow:

```javascript
// Analysis started
await eventBridgeService.publishAnalysisStarted(opportunityDetails, 'standard');

// Query generated
await eventBridgeService.publishQueryGenerated(opportunityDetails, generatedQuery);

// Data retrieved
await eventBridgeService.publishDataRetrieved(opportunityDetails, queryResults);

// Analysis completed
await eventBridgeService.publishAnalysisCompleted(opportunityDetails, analysisResults, 'standard');

// Error handling
await eventBridgeService.publishAnalysisFailed(opportunityDetails, error, 'standard');
```

### Frontend Integration

The EventBridge client provides real-time updates:

```javascript
// Initialize client
window.eventBridgeClient.initialize();

// Custom event handlers
eventBridgeClient.on('opportunity.analysis.completed', (eventData) => {
  console.log('Analysis completed:', eventData);
  updateUI(eventData.analysisResults);
});

// Simulate events for testing
eventBridgeClient.simulateEvent('opportunity.analysis.started', {
  opportunityDetails: { oppName: 'Test Opportunity' }
});
```

## Event Rules and Targets

### Analysis Completion Rule
- **Pattern**: Analysis Completed, Analysis Failed events
- **Targets**: SNS notifications

### Error Handling Rule
- **Pattern**: All failure events
- **Targets**: Dead Letter Queue for retry processing

### Notification Rule
- **Pattern**: User notification events
- **Targets**: SNS topic for email/SMS delivery

### Real-time Updates Rule
- **Pattern**: All workflow progress events
- **Targets**: Lambda function for WebSocket/SSE updates

## Monitoring and Metrics

### CloudWatch Metrics
- `EventsPublished` - Total events published
- `EventsProcessed` - Events successfully processed
- `EventsFailed` - Failed event processing
- `NotificationsSent` - Notifications delivered
- `DLQMessages` - Messages in dead letter queue

### Custom Dashboards
The monitoring Lambda function creates custom CloudWatch metrics in the `AWS/OpportunityAnalysis/EventBridge` namespace.

## Error Handling and Reliability

### Dead Letter Queue Processing
Failed events are automatically routed to a dead letter queue for manual review and retry:

```bash
# Process DLQ messages
curl -X POST http://localhost:8123/api/eventbridge/process-dlq
```

### Event Replay
Events can be replayed for recovery scenarios:

```bash
# Replay events from a specific time range
curl -X POST http://localhost:8123/api/eventbridge/replay \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2025-01-01T00:00:00Z",
    "endTime": "2025-01-01T23:59:59Z"
  }'
```

### Retry Logic
- **Automatic Retries**: 3 attempts with exponential backoff
- **Maximum Event Age**: 1-2 hours depending on event type
- **Circuit Breaker**: Prevents cascade failures

## API Endpoints

### EventBridge Management
- `POST /api/eventbridge/initialize` - Initialize infrastructure
- `GET /api/eventbridge/statistics` - Get event statistics
- `POST /api/eventbridge/process-dlq` - Process dead letter queue
- `POST /api/eventbridge/replay` - Replay events
- `POST /api/eventbridge/test-notification` - Send test notification
- `POST /api/eventbridge/publish-event` - Publish custom event

## Real-time UI Features

### Status Indicators
- **Connection Status**: Shows EventBridge connection state
- **Analysis Status**: Shows current analysis progress
- **Progress Steps**: Visual workflow progress indicator

### Notifications
- **Toast Notifications**: Non-intrusive status updates
- **Progress Messages**: Detailed workflow feedback
- **Error Alerts**: Clear error communication

### Auto-refresh
- **Results Update**: Automatic UI refresh on completion
- **Metrics Display**: Real-time metric updates
- **Status Changes**: Immediate status reflection

## Best Practices

### Event Design
1. **Consistent Schema**: Use standardized event structure
2. **Idempotency**: Ensure events can be safely replayed
3. **Minimal Payload**: Include only necessary data
4. **Clear Naming**: Use descriptive event types

### Error Handling
1. **Graceful Degradation**: Continue operation if EventBridge fails
2. **Logging**: Comprehensive error logging
3. **Monitoring**: Set up CloudWatch alarms
4. **Recovery**: Implement event replay for critical failures

### Performance
1. **Batch Publishing**: Group related events when possible
2. **Async Processing**: Don't block main workflow
3. **Connection Pooling**: Reuse AWS SDK clients
4. **Caching**: Cache frequently accessed configurations

## Troubleshooting

### Common Issues

#### EventBridge Not Initialized
```bash
# Check environment variables
echo $EVENTBRIDGE_BUS_NAME
echo $INITIALIZE_EVENTBRIDGE

# Initialize manually
curl -X POST http://localhost:8123/api/eventbridge/initialize
```

#### Events Not Publishing
```bash
# Check AWS credentials
aws sts get-caller-identity

# Test event publishing
curl -X POST http://localhost:8123/api/eventbridge/publish-event \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "test.event",
    "detail": {"test": "data"}
  }'
```

#### Notifications Not Received
```bash
# Check SNS topic configuration
aws sns list-subscriptions-by-topic --topic-arn $SNS_TOPIC_ARN

# Send test notification
curl -X POST http://localhost:8123/api/eventbridge/test-notification \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test notification",
    "subject": "EventBridge Test"
  }'
```

### Debug Mode
Enable debug logging by setting `DEBUG=true` in your environment variables.

## Security Considerations

### IAM Permissions
Ensure the application has appropriate permissions:
- `events:PutEvents` - Publish events to EventBridge
- `sns:Publish` - Send notifications via SNS
- `sqs:SendMessage`, `sqs:ReceiveMessage` - DLQ operations
- `lambda:InvokeFunction` - Trigger Lambda functions

### Event Data
- **Sensitive Data**: Avoid including sensitive information in events
- **Encryption**: Use EventBridge encryption at rest
- **Access Control**: Implement proper IAM policies

## Future Enhancements

### Planned Features
1. **WebSocket Integration**: Real-time bidirectional communication
2. **Event Sourcing**: Complete event history tracking
3. **Advanced Analytics**: Event pattern analysis
4. **Multi-region Support**: Cross-region event replication

### Integration Opportunities
1. **API Gateway**: WebSocket API for real-time updates
2. **DynamoDB Streams**: Database change events
3. **S3 Events**: File processing notifications
4. **CloudWatch Events**: System monitoring integration

## Support

For issues or questions regarding EventBridge integration:
1. Check the troubleshooting section above
2. Review CloudWatch logs for detailed error information
3. Run the test suite to validate configuration
4. Consult AWS EventBridge documentation for service-specific issues