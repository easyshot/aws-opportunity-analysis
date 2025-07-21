# Comprehensive Testing and Validation Framework Guide

## Overview

The AWS Opportunity Analysis application includes a comprehensive testing and validation framework that implements Task 9 requirements. This framework provides health checks, scenario testing, performance validation, error handling verification, and diagnostic tools.

## Framework Components

### 1. Health Check System (Requirement 9.1)

The health check system validates connectivity and functionality of all AWS services:

#### Available Health Check Endpoints

- **Main Health Check**: `/api/health`
- **AWS Credentials**: `/api/health/aws-credentials`
- **Bedrock Services**: `/api/health/bedrock`
  - Agent: `/api/health/bedrock/agent`
  - Runtime: `/api/health/bedrock/runtime`
  - Prompts: `/api/health/bedrock/prompts`
- **Lambda Function**: `/api/health/lambda`
- **Athena Services**: `/api/health/athena`
  - Database: `/api/health/athena/database`
  - S3 Access: `/api/health/athena/s3`
- **DynamoDB**: `/api/health/dynamodb`
- **EventBridge**: `/api/health/eventbridge`
- **S3 Access**: `/api/health/s3`

#### Usage Examples

```bash
# Check overall system health
curl http://localhost:8123/api/health

# Check specific service
curl http://localhost:8123/api/health/bedrock

# Get detailed health information
curl http://localhost:8123/api/health | jq '.'
```

### 2. Test Scenarios (Requirement 9.2)

The framework includes comprehensive test scenarios for major workflow validation:

#### Available Test Scenarios

1. **Basic Opportunity Analysis**
   - Tests standard workflow with minimal inputs
   - Validates all six analysis sections
   - Performance threshold: 30 seconds

2. **Complex Opportunity Analysis**
   - Tests full workflow with all features
   - Includes Nova Premier model testing
   - Performance threshold: 45 seconds

3. **Funding Analysis**
   - Tests funding recommendation workflow
   - Validates funding-specific outputs
   - Performance threshold: 35 seconds

4. **Follow-On Analysis**
   - Tests follow-on opportunity identification
   - Validates multi-step workflow
   - Performance threshold: 35 seconds

#### Running Test Scenarios

```bash
# Run all scenarios
node scripts/run-comprehensive-testing-framework.js --scenarios

# Run specific scenario via API
curl -X GET http://localhost:8123/api/test/scenario/basicOpportunity
```

### 3. Diagnostic Tools (Requirement 9.3)

Comprehensive diagnostic tools for troubleshooting:

#### Diagnostic Features

- **System Information**: OS, Node.js, memory, CPU analysis
- **Service Health**: AWS service connectivity and status
- **Performance Metrics**: Response times, resource utilization
- **Configuration Validation**: Environment variables, dependencies
- **Log Analysis**: Error patterns, performance issues
- **Recommendations**: Automated issue identification and solutions

#### Using Diagnostics

```bash
# Run comprehensive diagnostics
node scripts/run-comprehensive-testing-framework.js --diagnostics

# Get diagnostic report via API
curl http://localhost:8123/api/diagnostics/full

# Get connectivity report
curl http://localhost:8123/api/diagnostics/connectivity
```

### 4. Performance Testing (Requirement 9.4)

Performance testing with realistic data loads:

#### Available Performance Tests

1. **Single User Baseline**
   - 1 concurrent user, 60 seconds
   - Establishes performance baseline
   - Thresholds: p95 < 30s, error rate < 1%

2. **Light Load Test**
   - 5 concurrent users, 5 minutes
   - Tests under light load conditions
   - Thresholds: p95 < 40s, error rate < 5%

3. **Moderate Load Test**
   - 10 concurrent users, 10 minutes
   - Tests moderate load handling
   - Thresholds: p95 < 50s, error rate < 10%

4. **Peak Load Test**
   - 20 concurrent users, 15 minutes
   - Tests peak load conditions
   - Thresholds: p95 < 60s, error rate < 15%

#### Running Performance Tests

```bash
# Run performance tests
node scripts/run-comprehensive-testing-framework.js --performance

# Run specific performance test
curl -X GET http://localhost:8123/api/test/performance/singleUserBaseline
```

### 5. Error Scenario Testing (Requirement 9.5)

Validation of error handling and recovery mechanisms:

#### Available Error Scenarios

1. **Invalid Input Validation**
   - Tests input validation error handling
   - Validates error messages and user feedback

2. **Bedrock Timeout Handling**
   - Tests Bedrock service timeout scenarios
   - Validates fallback mechanisms

3. **Athena Query Error Handling**
   - Tests Athena query execution errors
   - Validates retry logic and fallbacks

4. **Network Error Handling**
   - Tests network connectivity issues
   - Validates error recovery mechanisms

5. **Service Throttling Handling**
   - Tests AWS service throttling scenarios
   - Validates exponential backoff implementation

#### Running Error Scenarios

```bash
# Run all error scenarios
node scripts/run-comprehensive-testing-framework.js --error-scenarios

# Run specific error scenario
curl -X GET http://localhost:8123/api/test/error-scenario/invalidInput
```

### 6. Automated Validation Tests (Requirement 9.6)

Deployment verification and automated validation:

#### Available Validation Suites

1. **Pre-Deployment Validation**
   - AWS credentials verification
   - Environment variables validation
   - Dependencies check
   - Service connectivity verification

2. **Post-Deployment Validation**
   - Service health verification
   - Basic workflow testing
   - Error handling validation
   - Performance baseline check

3. **Daily Health Check**
   - Automated daily health verification
   - Basic workflow validation
   - Service status monitoring

4. **Weekly Full Check**
   - Comprehensive weekly validation
   - All workflow testing
   - Performance verification
   - Error handling validation

#### Running Validation Tests

```bash
# Run validation tests
node scripts/run-comprehensive-testing-framework.js --validation

# Run specific validation suite
curl -X GET http://localhost:8123/api/test/validation/preDeployment
```

## Usage Guide

### Quick Start

1. **Validate Framework Installation**
   ```bash
   node scripts/validate-testing-framework.js
   ```

2. **Run Essential Tests**
   ```bash
   node scripts/run-comprehensive-testing-framework.js --quick
   ```

3. **Run Full Test Suite**
   ```bash
   node scripts/run-comprehensive-testing-framework.js --all
   ```

### Command Line Options

```bash
# Available options
node scripts/run-comprehensive-testing-framework.js [options]

Options:
  --health-check      Run health check tests (default: true)
  --scenarios         Run scenario tests (default: true)
  --error-scenarios   Run error scenario tests (default: true)
  --performance       Run performance tests (default: false)
  --validation        Run validation tests (default: true)
  --diagnostics       Run diagnostic tests (default: true)
  
  --all               Run all tests including performance tests
  --quick             Run only essential tests
  
  --no-health-check   Skip health check tests
  --no-scenarios      Skip scenario tests
  --no-validation     Skip validation tests
  
  --help, -h          Show help message
```

### Integration with Express App

To integrate health check endpoints with your Express application:

```javascript
const express = require('express');
const { HealthCheckEndpoints } = require('./lib/health-check-endpoints');

const app = express();
const healthEndpoints = new HealthCheckEndpoints();

// Register health check endpoints
healthEndpoints.registerEndpoints(app);

// Start server
app.listen(8123, () => {
  console.log('Server running with health check endpoints');
});
```

### API Testing Examples

```bash
# Health check examples
curl http://localhost:8123/api/health
curl http://localhost:8123/api/health/bedrock
curl http://localhost:8123/api/diagnostics

# Test scenario examples
curl -X GET http://localhost:8123/api/test/scenario/basicOpportunity
curl -X GET http://localhost:8123/api/test/error-scenario/invalidInput

# Comprehensive test via API
curl -X POST http://localhost:8123/api/test/comprehensive \
  -H "Content-Type: application/json" \
  -d '{"healthCheck": true, "scenarios": true, "diagnostics": true}'
```

## Reports and Output

### Report Types

1. **Health Check Reports**
   - Service connectivity status
   - Response time analysis
   - Error identification
   - Troubleshooting recommendations

2. **Test Execution Reports**
   - Test suite results
   - Performance metrics
   - Error analysis
   - Success/failure statistics

3. **Diagnostic Reports**
   - System health analysis
   - Configuration validation
   - Performance assessment
   - Optimization recommendations

### Report Locations

All reports are saved to the `reports/` directory:

- `connectivity-report-{timestamp}.json`
- `comprehensive-test-report-{timestamp}.json`
- `test-summary-{timestamp}.md`
- `diagnostic-report-{timestamp}.json`

### Report Format Example

```json
{
  "metadata": {
    "timestamp": "2025-01-07T10:30:00.000Z",
    "version": "1.0.0",
    "environment": "development"
  },
  "summary": {
    "total": 6,
    "passed": 5,
    "failed": 1,
    "errors": 0
  },
  "testSuites": {
    "healthCheck": {
      "status": "passed",
      "duration": 2500,
      "tests": [...]
    }
  },
  "recommendations": [
    {
      "priority": "High",
      "category": "Configuration",
      "issue": "Missing environment variables",
      "action": "Configure required environment variables"
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Configured**
   ```
   Error: AWS credentials not found
   Solution: Configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
   ```

2. **Environment Variables Missing**
   ```
   Error: CATAPULT_QUERY_PROMPT_ID environment variable not set
   Solution: Copy .env.template to .env and configure all variables
   ```

3. **Service Connectivity Issues**
   ```
   Error: Network timeout connecting to Bedrock
   Solution: Check internet connectivity and AWS service status
   ```

4. **Permission Errors**
   ```
   Error: Access denied for Bedrock service
   Solution: Review IAM permissions and service availability
   ```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
DEBUG=testing-framework node scripts/run-comprehensive-testing-framework.js
```

### Log Analysis

Check application logs for detailed error information:

```bash
# View recent errors
tail -f logs/aws-opportunity-analysis-error.log

# Search for specific errors
grep -i "bedrock" logs/aws-opportunity-analysis-combined.log
```

## Best Practices

### Regular Testing Schedule

1. **Daily**: Run health checks and basic validation
2. **Weekly**: Run comprehensive test suite
3. **Before Deployment**: Run full validation suite
4. **After Changes**: Run relevant test scenarios

### Monitoring Integration

1. Set up automated health check monitoring
2. Configure alerts for test failures
3. Track performance trends over time
4. Monitor error rates and patterns

### Continuous Integration

Integrate testing framework with CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Testing Framework
  run: |
    node scripts/validate-testing-framework.js
    node scripts/run-comprehensive-testing-framework.js --quick
```

### Performance Optimization

1. Monitor response times regularly
2. Set up performance baselines
3. Track resource utilization
4. Optimize based on test results

## Advanced Usage

### Custom Test Scenarios

Create custom test scenarios by adding to `tests/scenarios.json`:

```json
{
  "customScenario": {
    "name": "Custom Test Scenario",
    "description": "Custom test for specific use case",
    "input": {
      "customerName": "Custom Corp",
      "customerRegion": "United States",
      "closeDate": "2025-12-31",
      "description": "Custom test scenario description",
      "timeToLaunch": 6
    },
    "validations": [
      { "field": "methodology", "type": "required" }
    ]
  }
}
```

### Custom Error Scenarios

Add custom error scenarios to `tests/error-scenarios.json`:

```json
{
  "customError": {
    "name": "Custom Error Scenario",
    "description": "Tests custom error handling",
    "input": {
      "description": "SIMULATE_CUSTOM_ERROR"
    },
    "expectedErrors": [
      { "type": "custom", "message": "Custom error occurred" }
    ]
  }
}
```

### Performance Test Configuration

Customize performance tests in `tests/performance-tests.json`:

```json
{
  "customLoad": {
    "name": "Custom Load Test",
    "concurrentUsers": 15,
    "duration": 300,
    "scenarios": ["basicOpportunity"],
    "thresholds": {
      "responseTime": { "p95": 35000 },
      "errorRate": { "max": 8 }
    }
  }
}
```

## Support and Maintenance

### Framework Updates

The testing framework is designed to be extensible and maintainable:

1. **Adding New Services**: Extend health check service with new AWS services
2. **New Test Scenarios**: Add scenarios for new application features
3. **Performance Tuning**: Adjust thresholds based on production requirements
4. **Error Handling**: Add new error scenarios as edge cases are discovered

### Monitoring Framework Health

Monitor the testing framework itself:

1. Track test execution times
2. Monitor framework error rates
3. Validate report generation
4. Check endpoint availability

### Documentation Updates

Keep documentation current with framework changes:

1. Update endpoint documentation
2. Maintain troubleshooting guides
3. Document new test scenarios
4. Update integration examples

---

For additional support or questions about the testing framework, refer to the application documentation or contact the development team.