# AWS Opportunity Analysis - Comprehensive Testing Guide

This guide covers all aspects of testing for the AWS Opportunity Analysis application, including unit tests, integration tests, security tests, performance tests, load tests, and automated testing infrastructure.

## Table of Contents

1. [Overview](#overview)
2. [Test Types](#test-types)
3. [Testing Infrastructure](#testing-infrastructure)
4. [Running Tests](#running-tests)
5. [Test Configuration](#test-configuration)
6. [CI/CD Integration](#cicd-integration)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Troubleshooting](#troubleshooting)

## Overview

The testing strategy for the AWS Opportunity Analysis application follows a comprehensive approach that includes:

- **Unit Tests**: Testing individual components and functions
- **Integration Tests**: Testing API endpoints and service interactions
- **Contract Tests**: Validating API contracts and schemas
- **Security Tests**: Identifying vulnerabilities and security issues
- **Performance Tests**: Measuring response times and resource usage
- **Load Tests**: Testing system behavior under various load conditions
- **Chaos Engineering**: Testing system resilience and failure scenarios
- **Synthetic Monitoring**: Continuous monitoring of application availability and performance

## Test Types

### Unit Tests

Unit tests are implemented using Jest and test individual functions and components.

```bash
# Run unit tests
npm run test:unit

# Run with coverage
npm run test:coverage
```

**Location**: `tests/` directory with `.test.js` or `.spec.js` files
**Framework**: Jest
**Coverage Target**: 70% minimum

### Integration Tests

Integration tests validate API endpoints and service interactions.

```bash
# Run integration tests
npm run test:integration
```

**Features Tested**:
- API endpoint functionality
- AWS service integrations
- Data flow between components
- Error handling and recovery

### Contract Tests

Contract tests ensure API endpoints conform to defined schemas and contracts.

```bash
# Run contract tests
npm run test:contract
```

**Validations**:
- Request/response schemas
- HTTP status codes
- CORS headers
- Rate limiting
- Authentication/authorization

### Security Tests

Security tests identify vulnerabilities and security issues.

```bash
# Run security tests
npm run test:security
```

**Security Checks**:
- SQL injection protection
- Cross-site scripting (XSS) prevention
- Command injection protection
- Path traversal protection
- Input validation
- HTTP security headers
- Sensitive data exposure
- Authentication and authorization

### Performance Tests

Performance tests measure response times and resource utilization.

```bash
# Run performance tests
npm run test:performance
```

**Metrics Measured**:
- Response times (average, min, max, percentiles)
- Throughput (requests per second)
- Memory usage patterns
- Error rates under load
- Resource utilization

### Load Tests

Load tests simulate realistic user traffic patterns using Artillery.

```bash
# Run load tests
npm run test:load

# Run with custom configuration
TARGET_URL=https://your-app.com npm run test:load
```

**Load Patterns**:
- Warm-up phase (5 users for 60s)
- Ramp-up phase (5-25 users over 120s)
- Sustained load (25 users for 300s)
- Ramp-down phase (25-5 users over 60s)

## Testing Infrastructure

### AWS Load Testing Stack

Distributed load testing using ECS Fargate and Artillery.

**Components**:
- ECS Cluster for test execution
- S3 bucket for test results
- Lambda orchestrator for test management
- CloudWatch dashboard for metrics

**Deployment**:
```bash
node scripts/deploy-testing-infrastructure.js --stacks load-testing
```

### Chaos Engineering Stack

Fault injection and resilience testing using AWS Fault Injection Simulator.

**Components**:
- FIS experiment templates
- Lambda orchestrator for chaos experiments
- CloudWatch alarms for stop conditions
- SNS notifications for alerts

**Deployment**:
```bash
node scripts/deploy-testing-infrastructure.js --stacks chaos-engineering
```

### Synthetic Monitoring Stack

Continuous monitoring using CloudWatch Synthetics.

**Components**:
- API availability canary (runs every 5 minutes)
- Performance monitoring canary (runs every 15 minutes)
- End-to-end user journey canary (runs every hour)
- CloudWatch alarms and dashboards

**Deployment**:
```bash
node scripts/deploy-testing-infrastructure.js --stacks synthetic-monitoring
```

### Security Testing Stack

Automated security testing using AWS Inspector.

**Components**:
- Inspector V2 integration
- Vulnerability assessment automation
- Security findings aggregation
- Risk scoring and alerting

**Deployment**:
```bash
node scripts/deploy-testing-infrastructure.js --stacks inspector-security
```

## Running Tests

### Quick Test Suite

Run essential tests quickly (skips slow tests):

```bash
npm run test:quick
```

### Comprehensive Test Suite

Run all tests including load and performance tests:

```bash
npm run test:all
```

### Individual Test Types

```bash
# Unit tests only
npm test

# Security tests only
npm run test:security

# Performance tests only
npm run test:performance

# Contract tests only
npm run test:contract

# Load tests only
npm run test:load
```

### Custom Test Execution

```bash
# Run tests against specific URL
TARGET_URL=https://your-app.com npm run test:all

# Run with custom load parameters
CONCURRENT_USERS=50 TEST_DURATION=300 npm run test:performance

# Skip slow tests
SKIP_SLOW_TESTS=true npm run test:all

# Continue on failure
CONTINUE_ON_FAILURE=true npm run test:all
```

## Test Configuration

### Environment Variables

```bash
# Target application URL
TARGET_URL=http://localhost:8123

# Test execution parameters
CONCURRENT_USERS=10
TEST_DURATION=60
TEST_TIMEOUT=300000

# Test behavior
SKIP_SLOW_TESTS=false
CONTINUE_ON_FAILURE=false

# Output configuration
TEST_OUTPUT_DIR=test-results
REPORT_FORMAT=json

# AWS configuration
AWS_REGION=us-east-1
NOTIFICATION_EMAIL=alerts@yourcompany.com
```

### Test Data Configuration

Test data is configured in:
- `tests/setup.js` - Global test configuration
- `tests/load-test-config.yml` - Load test scenarios
- `tests/load-test-processor.js` - Custom load test functions

### Thresholds and Limits

```javascript
// Performance thresholds
const thresholds = {
  responseTime: {
    health: 5000,      // 5 seconds
    api: 30000,        // 30 seconds
    analysis: 60000    // 60 seconds
  },
  throughput: {
    minimum: 1         // 1 request per second
  },
  errorRate: {
    maximum: 0.05      // 5% error rate
  }
};
```

## CI/CD Integration

### Enhanced CI/CD Pipeline

The enhanced CI/CD pipeline includes comprehensive testing at multiple stages:

**Pipeline Stages**:
1. **Unit Tests** - Fast feedback on code changes
2. **Security Tests** - Vulnerability scanning and security checks
3. **Integration Tests** - API and service integration validation
4. **Performance Tests** - Response time and resource usage validation
5. **Load Tests** - Scalability and capacity validation

**Deployment**:
```bash
node scripts/deploy-testing-infrastructure.js --stacks enhanced-cicd
```

### GitHub Actions Integration

```yaml
name: Comprehensive Testing
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:quick
      - run: npm run test:security
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

### AWS CodeBuild Integration

The enhanced CI/CD stack includes CodeBuild projects for:
- Unit testing with coverage reporting
- Integration testing with AWS services
- Security testing with vulnerability scanning
- Performance testing with load simulation

## Monitoring and Alerting

### CloudWatch Dashboards

**Available Dashboards**:
- Load Testing Dashboard - Artillery metrics and performance data
- Chaos Engineering Dashboard - Fault injection results and system resilience
- Synthetic Monitoring Dashboard - Availability and performance trends
- Security Monitoring Dashboard - Vulnerability findings and risk scores

### SNS Notifications

**Alert Types**:
- Critical security findings detected
- Performance degradation alerts
- Load test failures
- Chaos experiment results
- Synthetic monitoring failures

**Configuration**:
```bash
# Set notification email
export NOTIFICATION_EMAIL=alerts@yourcompany.com

# Deploy with notifications
node scripts/deploy-testing-infrastructure.js
```

### CloudWatch Alarms

**Configured Alarms**:
- API availability below 95%
- Response time above 25 seconds
- Critical security findings detected
- Security risk score above 75
- Chaos experiment stop conditions

## Troubleshooting

### Common Issues

#### Test Failures

**Symptom**: Tests fail with timeout errors
**Solution**: 
- Increase `TEST_TIMEOUT` environment variable
- Check application health with `curl http://localhost:8123/api/health`
- Verify AWS credentials and permissions

**Symptom**: Security tests report false positives
**Solution**:
- Review security test configuration in `tests/security-tests.js`
- Update test patterns for your specific application
- Check input validation and sanitization

#### Infrastructure Deployment Issues

**Symptom**: CDK deployment fails
**Solution**:
- Ensure AWS credentials are configured
- Check CDK bootstrap status: `cdk bootstrap`
- Verify IAM permissions for deployment
- Check AWS service limits and quotas

**Symptom**: Load tests fail to start
**Solution**:
- Verify ECS cluster is running
- Check S3 bucket permissions
- Ensure target URL is accessible from AWS
- Review CloudWatch logs for detailed errors

#### Performance Issues

**Symptom**: Slow test execution
**Solution**:
- Use `npm run test:quick` for faster feedback
- Run tests in parallel where possible
- Optimize test data and scenarios
- Consider running load tests separately

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Enable debug mode
DEBUG=true npm run test:all

# Verbose output
npm run test:all --verbose

# Dry run to see what would be executed
node scripts/run-comprehensive-tests.js --dry-run
```

### Log Analysis

**Test Logs Location**:
- Unit tests: Jest output and coverage reports
- Integration tests: `test-results/` directory
- Load tests: Artillery reports and S3 artifacts
- Security tests: `security-results/` directory
- Performance tests: `performance-results/` directory

**CloudWatch Logs**:
- `/aws/ecs/load-testing` - Load test execution logs
- `/aws/lambda/chaos-orchestrator` - Chaos engineering logs
- `/aws/synthetics/canary` - Synthetic monitoring logs
- `/aws/lambda/inspector-orchestrator` - Security testing logs

### Support and Resources

**Documentation**:
- [AWS Testing Best Practices](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/test-reliability.html)
- [Artillery.js Documentation](https://artillery.io/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [AWS Inspector Documentation](https://docs.aws.amazon.com/inspector/)

**Community Resources**:
- AWS Testing Community Forums
- Artillery.js Community Slack
- Jest Community Discord
- AWS Security Testing Guidelines

For additional support, please refer to the project documentation or contact the development team.