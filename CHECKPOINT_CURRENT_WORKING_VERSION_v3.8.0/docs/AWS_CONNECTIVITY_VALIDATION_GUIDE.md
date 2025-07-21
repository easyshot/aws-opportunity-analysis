# AWS Connectivity Validation Guide

This guide provides comprehensive documentation for the AWS service connectivity validation tools implemented for the Partner Opportunity Intelligence application.

## Overview

The validation system provides comprehensive health checking for all AWS services required by the application, including:

- **AWS Bedrock** (Agent and Runtime)
- **AWS Lambda** functions
- **Amazon Athena** database and queries
- **Amazon DynamoDB** tables
- **Amazon EventBridge** event bus
- **Amazon S3** storage access
- **AWS CloudWatch** monitoring
- **IAM permissions** and security

## Quick Start

### Prerequisites

1. **Environment Configuration**: Ensure your `.env` file is properly configured with AWS credentials and service settings
2. **AWS Credentials**: Valid AWS access key and secret key with appropriate permissions
3. **Node.js Dependencies**: Run `npm install` to install required packages

### Basic Usage

```bash
# Run full connectivity validation
npm run validate:aws

# Run specific service validations
npm run validate:bedrock
npm run validate:lambda
npm run validate:infrastructure
npm run validate:security

# Run comprehensive test suite
npm run test:connectivity:all

# Run all validations including security
npm run validate:all
```

## Validation Tools

### 1. Full AWS Connectivity Validation (`validate:aws`)

**Script**: `scripts/validate-aws-connectivity.js`

Comprehensive validation of all AWS services used by the application.

**What it tests**:
- AWS credential validation
- Bedrock Agent and Runtime connectivity
- Bedrock prompt accessibility
- Lambda function existence and invocation
- Athena database and S3 access
- DynamoDB table availability
- EventBridge service access
- CloudWatch monitoring access

**Output**: Detailed report with service status, response times, and recommendations

### 2. Bedrock Services Validation (`validate:bedrock`)

**Script**: `scripts/validate-bedrock-connectivity.js`

Focused validation of AWS Bedrock AI services.

**What it tests**:
- Bedrock Agent service connectivity
- Bedrock Runtime model access
- Prompt management validation
- Model permission testing

**Use when**: Troubleshooting AI/ML functionality or prompt access issues

### 3. Lambda Functions Validation (`validate:lambda`)

**Script**: `scripts/validate-lambda-functions.js`

Comprehensive Lambda function testing including performance validation.

**What it tests**:
- Function configuration and state
- Function invocation capabilities
- Performance testing with multiple invocations
- Response time consistency

**Use when**: Debugging Lambda function issues or performance problems

### 4. Infrastructure Validation (`validate:infrastructure`)

**Script**: `scripts/validate-infrastructure.js`

Infrastructure readiness assessment with deployment recommendations.

**What it tests**:
- Infrastructure layer analysis (Foundation, Data, Compute, AI, Events)
- Service dependency validation
- Deployment readiness assessment
- Critical path analysis

**Use when**: Preparing for deployment or assessing overall system health

### 5. Security Validation (`validate:security`)

**Script**: `scripts/validate-security.js`

Security configuration and IAM permissions validation.

**What it tests**:
- AWS identity validation
- IAM permissions assessment
- Security best practices compliance
- Data encryption validation

**Use when**: Security audits or troubleshooting permission issues

### 6. Comprehensive Test Runner (`test:connectivity`)

**Script**: `scripts/run-connectivity-tests.js`

Orchestrates multiple validation suites with unified reporting.

**Available test suites**:
- `full` - Complete AWS service validation
- `bedrock` - Bedrock services only
- `lambda` - Lambda functions only
- `infrastructure` - Infrastructure assessment

**Usage examples**:
```bash
# Run specific suites
npm run test:connectivity bedrock lambda

# Run all suites
npm run test:connectivity:all
```

## Understanding Results

### Status Levels

- **✅ Healthy**: Service is fully operational and ready for use
- **⚠️ Degraded**: Service has minor issues but may still function
- **❌ Unhealthy**: Service has critical issues requiring attention

### Response Time Categories

- **🟢 Fast**: < 1000ms
- **🟡 Moderate**: 1000-3000ms
- **🔴 Slow**: > 3000ms

### Report Sections

#### Summary
- Overall system health status
- Service count statistics
- Average response times
- Critical issues identified

#### Service Details
- Individual service status
- Detailed check results
- Error messages and codes
- Service-specific recommendations

#### Recommendations
- Global recommendations for system improvement
- Service-specific action items
- Security best practices
- Performance optimization suggestions

#### Next Steps
- Prioritized action items based on current status
- Deployment readiness assessment
- Suggested workflow progression

## Troubleshooting Common Issues

### AWS Credentials Issues

**Symptoms**:
- "AWS credentials are invalid or expired"
- "AccessDeniedException" errors

**Solutions**:
1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`
2. Check if credentials have expired
3. Ensure credentials have necessary permissions
4. Test with AWS CLI: `aws sts get-caller-identity`

### Bedrock Access Issues

**Symptoms**:
- "Cannot access Bedrock models"
- "Model access denied"

**Solutions**:
1. Request access to Bedrock models in AWS Console
2. Verify region supports Bedrock services
3. Check IAM permissions for Bedrock access
4. Ensure prompt IDs are correct in configuration

### Lambda Function Issues

**Symptoms**:
- "Lambda function not found"
- "Function invocation failed"

**Solutions**:
1. Deploy Lambda function using CDK or manual deployment
2. Verify function name in `CATAPULT_GET_DATASET_LAMBDA` environment variable
3. Check Lambda function permissions and execution role
4. Review Lambda function logs in CloudWatch

### Athena Database Issues

**Symptoms**:
- "Cannot access database"
- "S3 output location not accessible"

**Solutions**:
1. Create Athena database if it doesn't exist
2. Verify S3 bucket exists and is accessible
3. Check IAM permissions for Athena and S3 access
4. Ensure S3 output location format is correct

### DynamoDB Issues

**Symptoms**:
- "DynamoDB tables not accessible"
- "Table not found"

**Solutions**:
1. Deploy DynamoDB tables using CDK stack
2. Verify table names in environment configuration
3. Check IAM permissions for DynamoDB access
4. Ensure tables are in the correct region

## Integration with Development Workflow

### Pre-Deployment Checklist

1. **Run Full Validation**: `npm run validate:all`
2. **Check Infrastructure Readiness**: `npm run validate:infrastructure`
3. **Verify Security Configuration**: `npm run validate:security`
4. **Review Generated Reports**: Check `reports/` directory for detailed results

### Continuous Integration

Add validation to your CI/CD pipeline:

```yaml
# Example GitHub Actions step
- name: Validate AWS Connectivity
  run: npm run validate:all
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_REGION: us-east-1
```

### Development Best Practices

1. **Regular Validation**: Run connectivity tests regularly during development
2. **Environment Parity**: Ensure validation passes in all environments
3. **Report Review**: Review generated reports for optimization opportunities
4. **Security Monitoring**: Run security validation after configuration changes

## Advanced Usage

### Custom Test Suites

Create custom validation scripts by extending the `HealthCheckService` class:

```javascript
const { HealthCheckService } = require('./lib/health-check-service');

class CustomValidator extends HealthCheckService {
  async customValidation() {
    // Your custom validation logic
  }
}
```

### Automated Monitoring

Set up automated monitoring using the validation tools:

```bash
# Create a monitoring script
#!/bin/bash
npm run validate:aws > /tmp/health-check.log 2>&1
if [ $? -ne 0 ]; then
  # Send alert notification
  echo "AWS connectivity issues detected" | mail -s "Alert" admin@example.com
fi
```

### Report Analysis

Parse JSON reports programmatically:

```javascript
const fs = require('fs');
const report = JSON.parse(fs.readFileSync('reports/aws-connectivity-report.json'));

// Analyze unhealthy services
const unhealthyServices = report.services.filter(s => s.status === 'unhealthy');
console.log(`Found ${unhealthyServices.length} unhealthy services`);
```

## Support and Troubleshooting

### Getting Help

1. **Check Reports**: Review detailed reports in `reports/` directory
2. **Enable Debug Logging**: Set `DEBUG=true` in environment
3. **AWS Documentation**: Refer to AWS service documentation for specific errors
4. **CloudWatch Logs**: Check AWS CloudWatch logs for service-specific issues

### Common Error Codes

- **AccessDeniedException**: Insufficient IAM permissions
- **ResourceNotFoundException**: AWS resource doesn't exist
- **ThrottlingException**: API rate limits exceeded
- **ValidationException**: Invalid parameters or configuration

### Performance Optimization

- **Connection Pooling**: Reuse AWS SDK clients
- **Parallel Execution**: Run independent validations concurrently
- **Caching**: Cache validation results for repeated checks
- **Timeout Configuration**: Adjust timeouts based on network conditions

## Conclusion

The AWS connectivity validation system provides comprehensive health checking and monitoring capabilities for the Partner Opportunity Intelligence application. Regular use of these tools ensures reliable AWS service connectivity and helps identify issues before they impact users.

For additional support or questions about the validation tools, refer to the generated reports and AWS service documentation.