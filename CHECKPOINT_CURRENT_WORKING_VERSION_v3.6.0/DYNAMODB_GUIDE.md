# DynamoDB State Management and Caching Guide

## Overview

The AWS Opportunity Analysis application uses Amazon DynamoDB for state management, caching, and analysis history tracking. This implementation provides high-performance data storage with automatic scaling, TTL-based cleanup, and real-time data processing through DynamoDB Streams.

## Architecture

### Tables Structure

#### 1. Analysis Results Cache Table (`opportunity-analysis-results`)
- **Purpose**: Cache analysis results to improve performance and reduce costs
- **Partition Key**: `id` (STRING) - Unique opportunity identifier
- **TTL**: 7 days (configurable)
- **Streams**: Enabled for real-time processing

#### 2. User Sessions Table (`opportunity-analysis-sessions`)
- **Purpose**: Manage user sessions and track user interactions
- **Partition Key**: `sessionId` (STRING) - Unique session identifier
- **TTL**: 24 hours (configurable)
- **Streams**: Enabled for session analytics

#### 3. Analysis History Table (`opportunity-analysis-history`)
- **Purpose**: Track analysis history for reporting and trend analysis
- **Partition Key**: `historyId` (STRING) - Unique history record identifier
- **Sort Key**: `timestamp` (STRING) - ISO timestamp of analysis
- **TTL**: 90 days (configurable)
- **Streams**: Enabled for trend analysis

### Global Secondary Indexes (GSI)

#### Analysis History GSIs
1. **UserIdTimestampIndex**: Query history by user ID
2. **OpportunityNameTimestampIndex**: Query history by opportunity name
3. **CustomerNameTimestampIndex**: Query history by customer name

## Features

### 1. Analysis Results Caching
- **Automatic Caching**: All successful analysis results are automatically cached
- **Cache Key**: Generated from customer name, opportunity name, and timestamp
- **Cache Hit Detection**: Checks for existing results before running expensive analysis
- **TTL Cleanup**: Automatic cleanup after 7 days to manage storage costs

### 2. User Session Management
- **Session Creation**: Automatic session creation for each user interaction
- **Session Tracking**: Tracks IP address, user agent, and initial opportunity details
- **Session Updates**: Updates last accessed time on each interaction
- **Session Cleanup**: Automatic cleanup after 24 hours of inactivity

### 3. Analysis History Tracking
- **Comprehensive Logging**: Records all analysis attempts (successful and failed)
- **Trend Analysis**: Enables analysis of usage patterns and success rates
- **Customer Insights**: Track analysis history by customer and opportunity
- **Performance Metrics**: Monitor analysis types, confidence levels, and predictions

### 4. Real-time Data Processing
- **DynamoDB Streams**: Capture all data changes in real-time
- **Stream Processing**: Lambda function processes stream events
- **Event Types**: INSERT, MODIFY, REMOVE events
- **Use Cases**: Analytics, notifications, cache warming

## Configuration

### Environment Variables

```bash
# DynamoDB Table Names
DYNAMODB_ANALYSIS_RESULTS_TABLE=opportunity-analysis-results
DYNAMODB_USER_SESSIONS_TABLE=opportunity-analysis-sessions
DYNAMODB_ANALYSIS_HISTORY_TABLE=opportunity-analysis-history

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### TTL Settings (Configurable in code)
- **Analysis Results**: 7 days (604,800 seconds)
- **User Sessions**: 24 hours (86,400 seconds)
- **Analysis History**: 90 days (7,776,000 seconds)

## Deployment

### 1. Deploy DynamoDB Infrastructure

```bash
# Deploy DynamoDB tables and streams
npm run dynamodb:deploy

# Or using CDK directly
npx cdk deploy OpportunityAnalysisDynamoDBStack
```

### 2. Validate Deployment

```bash
# Validate DynamoDB configuration
npm run dynamodb:validate
```

### 3. Test DynamoDB Functionality

```bash
# Run all DynamoDB tests
npm run dynamodb:test

# Run specific test categories
npm run dynamodb:test-health      # Health check only
npm run dynamodb:test-session     # Session management only
npm run dynamodb:test-cache       # Caching functionality only
npm run dynamodb:test-history     # History tracking only
```

## API Endpoints

### Session Management
- `GET /api/session/:sessionId` - Retrieve user session
- `DELETE /api/session/:sessionId` - Delete user session

### Analysis History
- `GET /api/history/:userId` - Get analysis history for user
- `GET /api/history/opportunity/:opportunityName` - Get history by opportunity

### Caching
- `GET /api/cache/:opportunityId` - Get cached analysis result

### Health Check
- `GET /api/dynamodb/health` - DynamoDB health check

## Usage Examples

### 1. Caching Analysis Results

```javascript
const dynamoDBService = new DynamoDBService();

// Cache analysis result
const analysisData = {
    metrics: { predictedArr: '$100,000', confidence: 'HIGH' },
    sections: { methodology: 'Historical analysis', findings: 'Strong match' }
};

await dynamoDBService.cacheAnalysisResult('customer-opportunity-123', analysisData);

// Retrieve cached result
const cachedResult = await dynamoDBService.getCachedAnalysisResult('customer-opportunity-123');
```

### 2. Managing User Sessions

```javascript
// Create user session
const sessionId = await dynamoDBService.createUserSession({
    userId: 'user123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    initialOpportunity: { CustomerName: 'Acme Corp', oppName: 'Migration' }
});

// Retrieve session
const session = await dynamoDBService.getUserSession(sessionId);

// Update session access time
await dynamoDBService.updateUserSessionAccess(sessionId);
```

### 3. Tracking Analysis History

```javascript
// Save analysis history
const historyId = await dynamoDBService.saveAnalysisHistory({
    userId: 'user123',
    sessionId: 'session456',
    customerName: 'Acme Corp',
    opportunityName: 'Cloud Migration',
    analysisType: 'standard',
    predictedArr: '$150,000',
    confidence: 'MEDIUM'
});

// Get user's analysis history
const history = await dynamoDBService.getAnalysisHistory('user123', 10);

// Get history by opportunity
const oppHistory = await dynamoDBService.getAnalysisHistoryByOpportunity('Cloud Migration', 5);
```

## Performance Considerations

### 1. Billing Mode
- **Pay-per-request**: Automatically scales with usage
- **No capacity planning**: DynamoDB handles scaling automatically
- **Cost-effective**: Pay only for actual read/write operations

### 2. Caching Strategy
- **Cache Hit Rate**: Monitor cache effectiveness
- **Cache Invalidation**: TTL-based automatic cleanup
- **Cache Warming**: Stream processing can pre-populate cache

### 3. Query Optimization
- **GSI Usage**: Efficient querying by user, opportunity, or customer
- **Projection**: GSIs project all attributes for complete data access
- **Sort Order**: Timestamp-based sorting for chronological access

## Monitoring and Analytics

### 1. CloudWatch Metrics
- **Read/Write Capacity**: Monitor table usage
- **Throttling**: Track throttled requests
- **Error Rates**: Monitor failed operations

### 2. Stream Processing Metrics
- **Stream Records**: Monitor stream processing volume
- **Processing Latency**: Track real-time processing delays
- **Error Handling**: Monitor stream processing failures

### 3. Application Metrics
- **Cache Hit Rate**: Percentage of requests served from cache
- **Session Duration**: Average user session length
- **Analysis Frequency**: Analysis requests per user/customer

## Security

### 1. IAM Permissions
- **Least Privilege**: Minimal required permissions
- **Resource-specific**: Permissions scoped to specific tables
- **Role-based**: Different roles for different access patterns

### 2. Data Encryption
- **Encryption at Rest**: DynamoDB encryption enabled
- **Encryption in Transit**: TLS for all API calls
- **Key Management**: AWS managed encryption keys

### 3. Access Control
- **VPC Endpoints**: Private network access (optional)
- **Resource Policies**: Table-level access control
- **Audit Logging**: CloudTrail integration

## Troubleshooting

### Common Issues

#### 1. Table Not Found
```bash
# Verify table deployment
aws dynamodb list-tables --region us-east-1

# Check table status
aws dynamodb describe-table --table-name opportunity-analysis-results
```

#### 2. Permission Errors
```bash
# Verify IAM permissions
aws sts get-caller-identity

# Test table access
aws dynamodb scan --table-name opportunity-analysis-results --limit 1
```

#### 3. TTL Not Working
- Verify TTL attribute is set correctly
- Check TTL is enabled on the table
- TTL cleanup can take up to 48 hours

### Health Check Failures
```javascript
// Manual health check
const dynamoDBService = new DynamoDBService();
const health = await dynamoDBService.healthCheck();
console.log('Health status:', health);
```

## Best Practices

### 1. Data Modeling
- **Single Table Design**: Consider consolidating related data
- **Composite Keys**: Use meaningful partition and sort keys
- **GSI Strategy**: Plan GSIs for query patterns

### 2. Performance
- **Batch Operations**: Use batch operations for multiple items
- **Connection Pooling**: Reuse DynamoDB connections
- **Error Handling**: Implement exponential backoff

### 3. Cost Optimization
- **TTL Usage**: Implement TTL for automatic cleanup
- **Query Efficiency**: Use specific queries instead of scans
- **Monitoring**: Regular cost and usage monitoring

## Future Enhancements

### 1. Advanced Analytics
- **Machine Learning**: Integrate with SageMaker for predictive analytics
- **Real-time Dashboards**: QuickSight integration for business intelligence
- **Trend Analysis**: Advanced pattern recognition in analysis history

### 2. Enhanced Caching
- **Multi-level Caching**: ElastiCache integration for hot data
- **Intelligent Invalidation**: Smart cache invalidation strategies
- **Cache Warming**: Predictive cache population

### 3. Data Archiving
- **S3 Integration**: Archive old data to S3 for cost savings
- **Data Lake**: Integration with AWS Data Lake for analytics
- **Compliance**: Long-term data retention for compliance requirements