# AWS Opportunity Analysis Lambda Functions

This directory contains the core Lambda functions for the AWS Opportunity Analysis application. These functions provide serverless processing capabilities for opportunity analysis, query generation, data retrieval, funding analysis, and follow-on opportunity identification.

## Architecture Overview

The Lambda functions are designed to work together in a coordinated workflow:

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│ opportunity-        │    │ query-generation     │    │ data-retrieval      │
│ analysis            │───▶│                      │───▶│                     │
│ (Orchestrator)      │    │ (SQL Generation)     │    │ (Athena Queries)    │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
           │                                                        │
           ▼                                                        ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│ funding-analysis    │    │ follow-on-analysis   │    │ Analysis Results    │
│                     │    │                      │    │                     │
│ (Funding Options)   │    │ (Next Opportunities) │    │ (Structured Output) │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## Lambda Functions

### 1. opportunity-analysis.js
**Main orchestrator function that coordinates the entire analysis workflow.**

- **Purpose**: Orchestrates the complete opportunity analysis process
- **Handler**: `opportunity-analysis.handler`
- **Timeout**: 15 minutes
- **Memory**: 1024 MB
- **Key Features**:
  - Input validation and sanitization
  - Workflow orchestration across multiple services
  - Error handling and retry logic
  - Structured response formatting

**Workflow Steps**:
1. Validate opportunity details
2. Generate SQL query using Bedrock
3. Execute query via data-retrieval function
4. Analyze results using Bedrock models
5. Return comprehensive analysis results

### 2. query-generation.js
**Generates SQL queries for finding similar historical projects using AWS Bedrock.**

- **Purpose**: Generate intelligent SQL queries based on opportunity details
- **Handler**: `query-generation.handler`
- **Timeout**: 5 minutes
- **Memory**: 512 MB
- **Key Features**:
  - Bedrock Agent prompt integration
  - Template-based query generation
  - Support for multiple invocation formats
  - Query validation and optimization

**Input Parameters**:
- `customerName`: Customer name for the opportunity
- `region`: AWS region
- `closeDate`: Expected close date
- `opportunityName`: Name of the opportunity
- `description`: Detailed opportunity description

### 3. data-retrieval.js
**Executes SQL queries against Amazon Athena and processes results.**

- **Purpose**: Execute SQL queries and retrieve historical project data
- **Handler**: `data-retrieval.handler`
- **Timeout**: 10 minutes
- **Memory**: 1024 MB
- **Key Features**:
  - Athena query execution with status monitoring
  - Result pagination and processing
  - Comprehensive error handling
  - Data type conversion and formatting

**Configuration**:
- `ATHENA_DATABASE`: Target database (default: catapult_db_p)
- `ATHENA_OUTPUT_LOCATION`: S3 location for query results

### 4. funding-analysis.js
**Analyzes funding options and financial strategies for opportunities.**

- **Purpose**: Provide comprehensive funding analysis and recommendations
- **Handler**: `funding-analysis.handler`
- **Timeout**: 5 minutes
- **Memory**: 512 MB
- **Key Features**:
  - Multi-faceted funding analysis
  - ROI calculations and projections
  - Risk assessment and mitigation strategies
  - Actionable funding recommendations

**Analysis Sections**:
- Funding requirements analysis
- Funding sources and options
- Risk assessment and mitigation
- ROI analysis and business case

### 5. follow-on-analysis.js
**Identifies and analyzes potential follow-on opportunities.**

- **Purpose**: Identify next opportunities and expansion potential
- **Handler**: `follow-on-analysis.handler`
- **Timeout**: 10 minutes
- **Memory**: 1024 MB
- **Key Features**:
  - Follow-on opportunity identification
  - Customer expansion pattern analysis
  - Revenue projection and prioritization
  - Implementation roadmap generation

**Analysis Components**:
- Customer expansion patterns
- Service evolution pathways
- Prioritized action plans
- Revenue expansion potential

## Shared Utilities Layer

### layers/shared-utilities/
**Common utilities and AWS client configurations shared across all Lambda functions.**

**Components**:
- `aws-clients.js`: Centralized AWS SDK client configuration
- `utils.js`: Common utility functions for data processing and validation
- `package.json`: Dependencies for the layer

**Key Utilities**:
- Date format conversion (handles nanoseconds, milliseconds, seconds)
- Historical data processing and standardization
- Input validation and error handling
- Response formatting (success/error)
- Retry logic with exponential backoff

## Environment Variables

All Lambda functions require the following environment variables:

### Required Variables
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_NODEJS_CONNECTION_REUSE_ENABLED=1

# Bedrock Prompt IDs
CATAPULT_QUERY_PROMPT_ID=Y6T66EI3GZ
CATAPULT_ANALYSIS_PROMPT_ID=FDUHITJIME
CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID=P03B9TO1Q1

# Lambda Functions
CATAPULT_GET_DATASET_LAMBDA=catapult_get_dataset

# Athena Configuration
ATHENA_DATABASE=catapult_db_p
ATHENA_OUTPUT_LOCATION=s3://as-athena-catapult/

# Monitoring
POWERTOOLS_SERVICE_NAME=opportunity-analysis
POWERTOOLS_METRICS_NAMESPACE=OpportunityAnalysis
```

## IAM Permissions

Lambda functions require the following IAM permissions:

### AWS Bedrock
- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock-agent:GetPrompt`
- `bedrock-runtime:Converse`
- `bedrock-runtime:ConverseStream`

### Amazon Athena
- `athena:StartQueryExecution`
- `athena:GetQueryExecution`
- `athena:GetQueryResults`
- `athena:StopQueryExecution`
- `athena:GetWorkGroup`

### Amazon S3
- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`
- `s3:ListBucket`

### AWS Lambda
- `lambda:InvokeFunction`

### CloudWatch & X-Ray
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`
- `xray:PutTraceSegments`
- `xray:PutTelemetryRecords`

## Deployment

### Using the Deployment Script
```bash
# Deploy all Lambda functions
npm run lambda:deploy

# Validate deployed functions
npm run lambda:validate
```

### Manual Deployment
```bash
# Deploy individual function
aws lambda create-function \
  --function-name aws-opportunity-analysis-main \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT:role/lambda-role \
  --handler opportunity-analysis.handler \
  --zip-file fileb://function.zip
```

## Testing

### Unit Testing
Each function includes comprehensive error handling and input validation. Test with various input scenarios:

```javascript
// Test opportunity analysis
const testEvent = {
  opportunityDetails: {
    customerName: "Test Customer",
    region: "us-east-1",
    opportunityName: "Test Opportunity",
    description: "Test description",
    closeDate: "2024-12-31"
  },
  analysisType: "standard"
};
```

### Integration Testing
Test the complete workflow by invoking the main orchestrator function with realistic opportunity data.

## Monitoring and Logging

### CloudWatch Metrics
- Function invocations and duration
- Error rates and success rates
- Memory utilization
- Custom business metrics

### X-Ray Tracing
All functions have X-Ray tracing enabled for distributed tracing across the workflow.

### Log Analysis
Structured logging with correlation IDs for tracking requests across functions.

## Error Handling

### Retry Logic
- Exponential backoff for AWS service calls
- Configurable retry attempts and delays
- Circuit breaker patterns for external dependencies

### Error Categories
- **Input Validation Errors**: Invalid or missing parameters
- **AWS Service Errors**: Bedrock, Athena, Lambda service failures
- **Data Processing Errors**: JSON parsing, date conversion failures
- **Timeout Errors**: Long-running operations

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_400",
    "message": "Validation failed: Customer name is required",
    "details": null,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "function": "opportunity-analysis"
  }
}
```

## Performance Optimization

### Memory and Timeout Configuration
- Functions sized appropriately for their workload
- Timeout values based on expected execution time
- Memory allocation optimized for performance vs. cost

### Connection Reuse
- AWS SDK connection reuse enabled
- Persistent connections across invocations
- Optimized client configurations

### Caching Strategies
- Prompt caching for frequently used Bedrock prompts
- Result caching for expensive computations
- Layer-based dependency sharing

## Security Best Practices

### Least Privilege Access
- IAM roles with minimal required permissions
- Resource-specific access controls
- Regular permission audits

### Data Protection
- Encryption in transit and at rest
- Secure handling of sensitive data
- No hardcoded credentials or secrets

### Input Validation
- Comprehensive input sanitization
- SQL injection prevention
- Cross-site scripting (XSS) protection

## Troubleshooting

### Common Issues

1. **Function Timeout**
   - Increase timeout value
   - Optimize query complexity
   - Check Athena query performance

2. **Memory Errors**
   - Increase memory allocation
   - Optimize data processing
   - Implement streaming for large datasets

3. **Permission Errors**
   - Verify IAM role permissions
   - Check resource access policies
   - Validate cross-account access

4. **Bedrock Errors**
   - Verify prompt IDs are correct
   - Check model availability in region
   - Validate input format and size

### Debug Mode
Enable debug logging by setting environment variables:
```bash
POWERTOOLS_LOG_LEVEL=DEBUG
AWS_LAMBDA_LOG_LEVEL=DEBUG
```

## Contributing

When adding new Lambda functions:

1. Follow the established naming convention
2. Use the shared utilities layer
3. Implement comprehensive error handling
4. Add appropriate monitoring and logging
5. Update this documentation
6. Add validation tests

## Version History

- **v1.0.0**: Initial implementation with core processing functions
- **v1.1.0**: Enhanced error handling and retry logic
- **v1.2.0**: Added comprehensive monitoring and tracing
- **v1.3.0**: Optimized performance and memory usage