#!/usr/bin/env node

/**
 * AWS Service Connectivity Validation Tool
 * 
 * This script validates connectivity and permissions for all AWS services
 * required by the Partner Opportunity Intelligence application.
 * 
 * Services tested:
 * - AWS Bedrock (Agent and Runtime)
 * - AWS Lambda
 * - Amazon Athena
 * - Amazon DynamoDB
 * - Amazon EventBridge
 * - Supporting services (S3, IAM, CloudWatch)
 */

const { HealthCheckService } = require('../lib/health-check-service');
const { ConnectivityReporter } = require('../lib/connectivity-reporter');

async function main() {
  console.log('🔍 AWS Service Connectivity Validation');
  console.log('=====================================\n');

  const healthCheck = new HealthCheckService();
  const reporter = new ConnectivityReporter();

  try {
    // Initialize health check system
    await healthCheck.initialize();
    
    // Run comprehensive connectivity tests
    console.log('Running comprehensive AWS service connectivity tests...\n');
    
    const results = await healthCheck.runFullHealthCheck();
    
    // Generate and display report
    const report = reporter.generateReport(results);
    reporter.displayReport(report);
    
    // Save detailed report to file
    await reporter.saveReport(report, 'aws-connectivity-report.json');
    
    // Exit with appropriate code
    const hasFailures = results.some(result => result.status === 'unhealthy');
    process.exit(hasFailures ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Fatal error during connectivity validation:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Validation interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Validation terminated');
  process.exit(143);
});

// Run the validation
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };