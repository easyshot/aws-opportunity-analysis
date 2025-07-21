#!/usr/bin/env node

/**
 * EventBridge Integration Test Script
 * Tests EventBridge enhanced data processing functionality
 */

require('dotenv').config();
const EventBridgeService = require('../lib/eventbridge-service');

class EventBridgeTestSuite {
  constructor() {
    this.eventBridgeService = new EventBridgeService();
    this.testResults = [];
  }

  /**
   * Run all EventBridge tests
   */
  async runAllTests() {
    console.log('🧪 Starting EventBridge Integration Tests...');
    console.log('='.repeat(50));

    const tests = [
      { name: 'Infrastructure Initialization', fn: this.testInfrastructureInit.bind(this) },
      { name: 'Event Publishing', fn: this.testEventPublishing.bind(this) },
      { name: 'Analysis Workflow Events', fn: this.testAnalysisWorkflowEvents.bind(this) },
      { name: 'Error Handling Events', fn: this.testErrorHandlingEvents.bind(this) },
      { name: 'Notification Events', fn: this.testNotificationEvents.bind(this) },
      { name: 'SNS Integration', fn: this.testSNSIntegration.bind(this) },
      { name: 'DLQ Processing', fn: this.testDLQProcessing.bind(this) },
      { name: 'Event Statistics', fn: this.testEventStatistics.bind(this) }
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.fn);
    }

    this.printTestSummary();
  }

  /**
   * Run individual test
   */
  async runTest(testName, testFn) {
    console.log(`\n🔍 Testing: ${testName}`);
    console.log('-'.repeat(30));

    try {
      const startTime = Date.now();
      const result = await testFn();
      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(`✅ ${testName} - PASSED (${duration}ms)`);
        if (result.details) {
          console.log(`   Details: ${result.details}`);
        }
        this.testResults.push({ name: testName, status: 'PASSED', duration, details: result.details });
      } else {
        console.log(`❌ ${testName} - FAILED (${duration}ms)`);
        console.log(`   Error: ${result.error}`);
        this.testResults.push({ name: testName, status: 'FAILED', duration, error: result.error });
      }
    } catch (error) {
      console.log(`💥 ${testName} - ERROR`);
      console.log(`   Exception: ${error.message}`);
      this.testResults.push({ name: testName, status: 'ERROR', error: error.message });
    }
  }

  /**
   * Test infrastructure initialization
   */
  async testInfrastructureInit() {
    try {
      const result = await this.eventBridgeService.initialize();
      return {
        success: result.success,
        details: result.success ? 'EventBridge infrastructure initialized' : 'Initialization failed',
        error: result.error
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test basic event publishing
   */
  async testEventPublishing() {
    try {
      const testEvent = {
        testId: 'test-' + Date.now(),
        message: 'Test event from EventBridge test suite'
      };

      const result = await this.eventBridgeService.publishEvent(
        'test.event.published',
        testEvent,
        'aws.opportunity.analysis.test'
      );

      return {
        success: result.success,
        details: result.success ? `Event published with ID: ${result.eventId}` : 'Event publishing failed',
        error: result.error
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test analysis workflow events
   */
  async testAnalysisWorkflowEvents() {
    try {
      const opportunityDetails = {
        CustomerName: 'Test Customer',
        region: 'us-east-1',
        closeDate: '2025-12-31',
        oppName: 'Test Opportunity',
        oppDescription: 'Test opportunity for EventBridge testing'
      };

      // Test analysis started event
      const startedResult = await this.eventBridgeService.publishAnalysisStarted(opportunityDetails, 'test');
      if (!startedResult.success) {
        return { success: false, error: 'Failed to publish analysis started event' };
      }

      // Test query generated event
      const queryResult = await this.eventBridgeService.publishQueryGenerated(opportunityDetails, 'SELECT * FROM test');
      if (!queryResult.success) {
        return { success: false, error: 'Failed to publish query generated event' };
      }

      // Test data retrieved event
      const dataResult = await this.eventBridgeService.publishDataRetrieved(opportunityDetails, [{ test: 'data' }]);
      if (!dataResult.success) {
        return { success: false, error: 'Failed to publish data retrieved event' };
      }

      // Test analysis completed event
      const completedResult = await this.eventBridgeService.publishAnalysisCompleted(
        opportunityDetails,
        { metrics: { predictedArr: '$100,000', confidence: 'HIGH' } },
        'test'
      );

      return {
        success: completedResult.success,
        details: 'All workflow events published successfully',
        error: completedResult.error
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test error handling events
   */
  async testErrorHandlingEvents() {
    try {
      const opportunityDetails = {
        CustomerName: 'Test Customer',
        region: 'us-east-1',
        closeDate: '2025-12-31',
        oppName: 'Test Opportunity',
        oppDescription: 'Test opportunity for error handling'
      };

      const testError = new Error('Test error for EventBridge testing');
      const result = await this.eventBridgeService.publishAnalysisFailed(opportunityDetails, testError, 'test');

      return {
        success: result.success,
        details: result.success ? 'Error event published successfully' : 'Failed to publish error event',
        error: result.error
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test notification events
   */
  async testNotificationEvents() {
    try {
      const result = await this.eventBridgeService.publishUserNotification(
        'test-user',
        'test_notification',
        'Test notification from EventBridge test suite',
        { testData: 'test-value' }
      );

      return {
        success: result.success,
        details: result.success ? 'Notification event published successfully' : 'Failed to publish notification event',
        error: result.error
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test SNS integration
   */
  async testSNSIntegration() {
    try {
      const result = await this.eventBridgeService.sendSNSNotification(
        'Test SNS notification from EventBridge test suite',
        'EventBridge Test Notification'
      );

      return {
        success: result.success || result.error === 'SNS not configured',
        details: result.success ? `SNS notification sent: ${result.messageId}` : 'SNS not configured (expected in test environment)',
        error: result.success ? null : result.error
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test DLQ processing
   */
  async testDLQProcessing() {
    try {
      const result = await this.eventBridgeService.processDLQMessages();

      return {
        success: result.success || result.error === 'DLQ not configured',
        details: result.success ? `Processed ${result.processedCount} DLQ messages` : 'DLQ not configured (expected in test environment)',
        error: result.success ? null : result.error
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test event statistics
   */
  async testEventStatistics() {
    try {
      const statistics = await this.eventBridgeService.getEventStatistics();

      return {
        success: true,
        details: `Statistics retrieved: ${statistics.totalEvents} total events`,
        error: null
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Print test summary
   */
  printTestSummary() {
    console.log('\n📊 Test Summary');
    console.log('='.repeat(50));

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`💥 Errors: ${errors}`);

    if (failed > 0 || errors > 0) {
      console.log('\n❌ Failed/Error Tests:');
      this.testResults
        .filter(r => r.status === 'FAILED' || r.status === 'ERROR')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }

    const successRate = ((passed / total) * 100).toFixed(1);
    console.log(`\n📈 Success Rate: ${successRate}%`);

    if (successRate === '100.0') {
      console.log('\n🎉 All EventBridge tests passed successfully!');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the configuration and try again.');
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
EventBridge Integration Test Suite

Usage: node scripts/test-eventbridge.js [options]

Options:
  --help, -h          Show this help message
  --quick            Run only basic tests
  --verbose          Show detailed output

Environment Variables Required:
  AWS_REGION                    AWS region
  EVENTBRIDGE_BUS_NAME         EventBridge bus name
  SNS_TOPIC_ARN               SNS topic ARN (optional)
  DLQ_URL                     Dead letter queue URL (optional)

Examples:
  node scripts/test-eventbridge.js
  node scripts/test-eventbridge.js --quick
  node scripts/test-eventbridge.js --verbose
  `);
  process.exit(0);
}

// Run tests
async function runTests() {
  const testSuite = new EventBridgeTestSuite();
  
  if (args.includes('--quick')) {
    console.log('🏃 Running quick EventBridge tests...');
    await testSuite.runTest('Infrastructure Initialization', testSuite.testInfrastructureInit.bind(testSuite));
    await testSuite.runTest('Event Publishing', testSuite.testEventPublishing.bind(testSuite));
    testSuite.printTestSummary();
  } else {
    await testSuite.runAllTests();
  }
}

runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});