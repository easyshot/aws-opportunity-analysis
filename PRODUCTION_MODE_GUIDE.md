# Production Mode Guide

This guide explains how to switch the AWS Opportunity Analysis application from debug mode to production mode, enabling real AWS service integrations.

## Overview

The application has two operational modes:

- **Debug Mode** (`app-debug.js`): Uses mock data responses for stable development
- **Production Mode** (`app.js`): Uses real AWS service integrations with comprehensive fallback mechanisms

## Prerequisites

### 1. Environment Variables

Ensure all required environment variables are configured in your `.env` file:

```bash
# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Bedrock Prompt IDs
CATAPULT_QUERY_PROMPT_ID=Y6T66EI3GZ
CATAPULT_ANALYSIS_PROMPT_ID=FDUHITJIME
CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID=P03B9TO1Q1

# Lambda Function
CATAPULT_GET_DATASET_LAMBDA=catapult_get_dataset

# Athena Configuration
ATHENA_DATABASE=default
ATHENA_OUTPUT_LOCATION=s3://aws-athena-query-results/
```

### 2. AWS Infrastructure

Required AWS resources must be deployed:

- Lambda function: `catapult_get_dataset`
- Bedrock prompts with the specified IDs
- Athena database and S3 output location
- Appropriate IAM permissions

### 3. Dependencies

All required Node.js packages must be installed:

```bash
npm install
```

## Switching to Production Mode

### Step 1: Validate Production Readiness

Run the comprehensive validation script to check if your environment is ready:

```bash
npm run validate:production
```

This script validates:
- Environment variables configuration
- AWS service connectivity
- Required infrastructure components
- API endpoint compatibility

### Step 2: Test Production Server

Test the production server startup and functionality:

```bash
npm run test:production
```

This script:
- Starts the production server
- Tests all endpoints
- Validates AWS service integration
- Checks fallback mechanisms

### Step 3: Start Production Mode

Once validation passes, start the application in production mode:

```bash
# Start production server
npm start

# Or with auto-restart during development
npm run dev

# Or start both backend and frontend
npm run dev-all
```

### Step 4: Verify Operation

1. **Health Check**: Visit `http://localhost:8123/health`
   - Should return status: "healthy"
   - Shows service availability status

2. **Frontend**: Visit `http://localhost:3123/index-compact.html`
   - Should load the modern dashboard interface
   - Test form submission with real data

3. **API Test**: Submit a test analysis request
   - Should process through AWS services or fallback gracefully

## Production Features

### Comprehensive Fallback System

The production mode includes intelligent fallback mechanisms:

- **Service Unavailability**: If AWS services are unavailable, switches to mock responses
- **Module Loading**: Gracefully handles missing optional modules
- **Error Recovery**: Continues operation even with partial service failures

### Enhanced Logging

Production mode includes comprehensive structured logging:

- **Request Tracking**: Each request gets a unique ID for tracing
- **Performance Metrics**: Response times and service health monitoring
- **Error Tracking**: Detailed error logging with context
- **File Logging**: Logs saved to `logs/` directory with rotation

### Monitoring and Health Checks

- **Health Endpoint**: `/health` provides service status
- **Service Monitoring**: Tracks AWS service connectivity
- **Performance Tracking**: Monitors response times and error rates
- **Graceful Shutdown**: Proper cleanup on process termination

## Troubleshooting

### Common Issues

1. **AWS Credentials Invalid**
   ```
   Error: AWS credentials invalid or insufficient permissions
   ```
   - Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
   - Check IAM permissions for required services

2. **Lambda Function Not Found**
   ```
   Error: Lambda function 'catapult_get_dataset' does not exist
   ```
   - Deploy the Lambda function using infrastructure scripts
   - Verify CATAPULT_GET_DATASET_LAMBDA environment variable

3. **Bedrock Prompts Not Accessible**
   ```
   Error: Bedrock prompt not accessible
   ```
   - Verify prompt IDs in environment variables
   - Check Bedrock service permissions

4. **Athena Database Not Found**
   ```
   Error: Athena database 'default' not found
   ```
   - Create the Athena database
   - Verify ATHENA_DATABASE environment variable

### Fallback Mode Operation

If AWS services are unavailable, the application automatically switches to fallback mode:

- Returns mock analysis responses
- Maintains API compatibility
- Logs fallback reasons for debugging
- Continues serving requests without interruption

### Debug Mode Fallback

If production mode fails to start, you can always fall back to debug mode:

```bash
# Start debug mode
npm run start:debug

# Or with auto-restart
npm run dev:debug

# Or both backend and frontend in debug mode
npm run dev-all:debug
```

## Monitoring and Maintenance

### Log Files

Production logs are stored in the `logs/` directory:

- `aws-opportunity-analysis-combined.log`: All log entries
- `aws-opportunity-analysis-error.log`: Error-level logs only
- `aws-opportunity-analysis-info.log`: Info-level logs
- `aws-opportunity-analysis-warn.log`: Warning-level logs

### Log Rotation

Logs are automatically rotated when they exceed 100MB, with old files cleaned up automatically.

### Performance Monitoring

Monitor key metrics:
- Request response times
- AWS service call latency
- Error rates and types
- Cache hit rates (if caching is enabled)

### Health Monitoring

Regular health checks should monitor:
- `/health` endpoint status
- AWS service connectivity
- Application response times
- Error rates in logs

## API Compatibility

The production mode maintains full API compatibility with the debug mode:

- Same endpoint URLs (`/api/analyze`)
- Same request/response formats
- Same frontend integration
- Graceful degradation to mock responses when needed

## Security Considerations

### Environment Variables

- Never commit `.env` files to version control
- Use AWS IAM roles in production environments when possible
- Rotate AWS credentials regularly

### Logging

- Sensitive data is automatically filtered from logs
- Request/response data is sanitized
- Error messages don't expose internal system details

### Network Security

- Configure appropriate security groups for AWS resources
- Use HTTPS in production deployments
- Implement rate limiting if needed

## Performance Optimization

### Caching

Enable caching services for better performance:

```bash
# Redis configuration (optional)
REDIS_ENDPOINT=your-redis-endpoint
REDIS_PORT=6379
CACHE_DEFAULT_TTL=3600
```

### Connection Pooling

The application automatically manages AWS service connections efficiently.

### Resource Management

- Automatic cleanup of resources on shutdown
- Connection reuse for AWS services
- Memory-efficient request processing

## Deployment Checklist

Before switching to production mode:

- [ ] All environment variables configured
- [ ] AWS infrastructure deployed
- [ ] Validation script passes (`npm run validate:production`)
- [ ] Production test passes (`npm run test:production`)
- [ ] Health check endpoint responds correctly
- [ ] Frontend loads and functions properly
- [ ] Logs directory has appropriate permissions
- [ ] Monitoring systems configured (if applicable)

## Support and Troubleshooting

### Getting Help

1. Check the validation script output for specific issues
2. Review log files in the `logs/` directory
3. Test individual AWS services using the connectivity scripts
4. Use debug mode as a fallback while troubleshooting

### Common Commands

```bash
# Validate production readiness
npm run validate:production

# Test production server
npm run test:production

# Start production mode
npm start

# Start debug mode (fallback)
npm run start:debug

# Run connectivity tests
npm run test:connectivity:all

# Validate AWS connectivity
npm run validate:aws
```

This guide ensures a smooth transition from debug mode to production mode while maintaining system reliability and providing comprehensive troubleshooting support.