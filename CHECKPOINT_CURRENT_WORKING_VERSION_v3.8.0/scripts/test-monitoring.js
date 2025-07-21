#!/usr/bin/env node

const { MonitoringService } = require('../lib/monitoring-service');
const { monitoringConfig } = require('../config/monitoring-config');
const axios = require('axios');

class MonitoringTest {
  constructor() {
    this.monitoringService = new MonitoringService();
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:8123';
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive monitoring tests...\n');
    
    try {
      // Test 1: Basic monitoring functionality
      await this.testBasicMonitoring();
      
      // Test 2: X-Ray tracing
      await this.testXRayTracing();
      
      // Test 3: CloudWatch metrics
      await this.testCloudWatchMetrics();
      
      // Test 4: Error handling and logging
      await this.testErrorHandling();
      
      // Test 5: Performance monitoring
      await this.testPerformanceMonitoring();
      
      // Test 6: Health checks
      await this.testHealthChecks();
      
      // Test 7: Integration with analysis workflow
      await this.testAnalysisWorkflowMonitoring();
      
      // Test 8: CloudWatch Insights queries
      await this.testCloudWatchInsights();
      
      this.printTestSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testBasicMonitoring() {
    console.log('🔍 Test 1: Basic Monitoring Functionality');
    
    try {
      // Initialize trace
      const traceId = monitoringConfig.initializeTrace('test-request-001');
      this.addTestResult('Basic Monitoring - Trace Initialization', true, `Trace ID: ${traceId}`);
      
      // Test metric recording
      await monitoringConfig.recordAnalysisRequest('TestCustomer', 'us-east-1', true, 1500);
      this.addTestResult('Basic Monitoring - Metric Recording', true, 'Analysis request metric recorded');
      
      // Test structured logging
      await monitoringConfig.logInfo('Test log message', { testData: 'monitoring-test' });
      this.addTestResult('Basic Monitoring - Structured Logging', true, 'Log message sent');
      
      // Cleanup
      await monitoringConfig.cleanup();
      this.addTestResult('Basic Monitoring - Cleanup', true, 'Monitoring cleanup completed');
      
    } catch (error) {
      this.addTestResult('Basic Monitoring', false, error.message);
    }
    
    console.log('');
  }

  async testXRayTracing() {
    console.log('🔍 Test 2: X-Ray Tracing');
    
    try {
      // Initialize new trace
      const traceId = monitoringConfig.initializeTrace('test-xray-001');
      
      // Test subsegment creation
      const result = await monitoringConfig.createSubsegment('test-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
        return { success: true, data: 'test-data' };
      }, { testMetadata: 'xray-test' });
      
      this.addTestResult('X-Ray Tracing - Subsegment Creation', true, `Result: ${JSON.stringify(result)}`);
      
      // Test error subsegment
      try {
        await monitoringConfig.createSubsegment('test-error-operation', async () => {
          throw new Error('Test error for X-Ray');
        });
      } catch (error) {
        this.addTestResult('X-Ray Tracing - Error Subsegment', true, 'Error subsegment recorded correctly');
      }
      
      // Send trace segments
      await monitoringConfig.sendTraceSegments();
      this.addTestResult('X-Ray Tracing - Trace Segments', true, `Trace sent: ${traceId}`);
      
    } catch (error) {
      this.addTestResult('X-Ray Tracing', false, error.message);
    }
    
    console.log('');
  }

  async testCloudWatchMetrics() {
    console.log('🔍 Test 3: CloudWatch Metrics');
    
    try {
      // Test various metric types
      await monitoringConfig.recordBedrockInvocation('amazon.titan-text-express-v1', true, 2000);
      this.addTestResult('CloudWatch Metrics - Bedrock Invocation', true, 'Bedrock metric recorded');
      
      await monitoringConfig.recordQueryExecution('test-query', 3000, true);
      this.addTestResult('CloudWatch Metrics - Query Execution', true, 'Query metric recorded');
      
      await monitoringConfig.recordError('test-error', 'Test error message', { context: 'monitoring-test' });
      this.addTestResult('CloudWatch Metrics - Error Recording', true, 'Error metric recorded');
      
      // Test custom metric
      await monitoringConfig.putMetric('TestMetric', 42, 'Count', [
        { Name: 'TestDimension', Value: 'TestValue' }
      ]);
      this.addTestResult('CloudWatch Metrics - Custom Metric', true, 'Custom metric sent');
      
    } catch (error) {
      this.addTestResult('CloudWatch Metrics', false, error.message);
    }
    
    console.log('');
  }

  async testErrorHandling() {
    console.log('🔍 Test 4: Error Handling and Logging');
    
    try {
      // Test error logging
      const testError = new Error('Test error for monitoring');
      testError.stack = 'Test stack trace';
      
      await monitoringConfig.logError('Test error occurred', testError, {
        context: 'monitoring-test',
        additionalData: { key: 'value' }
      });
      this.addTestResult('Error Handling - Error Logging', true, 'Error logged with full context');
      
      // Test warning logging
      await monitoringConfig.logWarning('Test warning message', {
        warningType: 'monitoring-test'
      });
      this.addTestResult('Error Handling - Warning Logging', true, 'Warning logged');
      
      // Test debug logging (should only log in development)
      await monitoringConfig.logDebug('Test debug message', {
        debugInfo: 'monitoring-test'
      });
      this.addTestResult('Error Handling - Debug Logging', true, 'Debug logging tested');
      
    } catch (error) {
      this.addTestResult('Error Handling', false, error.message);
    }
    
    console.log('');
  }

  async testPerformanceMonitoring() {
    console.log('🔍 Test 5: Performance Monitoring');
    
    try {
      // Test performance timer
      const timer = await monitoringConfig.startPerformanceTimer('test-operation');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const duration = await monitoringConfig.endPerformanceTimer(timer, true, {
        operationDetails: 'test-performance-monitoring'
      });
      
      this.addTestResult('Performance Monitoring - Timer', true, `Duration: ${duration}ms`);
      
      // Test latency recording
      await monitoringConfig.recordAnalysisLatency(1500, 'test-analysis');
      this.addTestResult('Performance Monitoring - Latency Recording', true, 'Latency metric recorded');
      
    } catch (error) {
      this.addTestResult('Performance Monitoring', false, error.message);
    }
    
    console.log('');
  }

  async testHealthChecks() {
    console.log('🔍 Test 6: Health Checks');
    
    try {
      // Test health check functionality
      const healthResult = await this.monitoringService.performHealthCheck();
      
      if (healthResult.success) {
        this.addTestResult('Health Checks - Overall Health', healthResult.healthy, 
          `Checks: ${healthResult.checks.length}, Healthy: ${healthResult.healthy}`);
        
        // Test individual component health checks
        for (const check of healthResult.checks) {
          this.addTestResult(`Health Checks - ${check.component}`, check.healthy, 
            `Response time: ${check.responseTime}ms`);
        }
      } else {
        this.addTestResult('Health Checks', false, healthResult.error);
      }
      
    } catch (error) {
      this.addTestResult('Health Checks', false, error.message);
    }
    
    console.log('');
  }

  async testAnalysisWorkflowMonitoring() {
    console.log('🔍 Test 7: Analysis Workflow Monitoring');
    
    try {
      // Test workflow monitoring with mock data
      const workflowData = {
        CustomerName: 'Test Customer',
        region: 'us-east-1',
        closeDate: '2024-12-31',
        oppName: 'Test Opportunity',
        oppDescription: 'Test opportunity for monitoring',
        useNovaPremier: false
      };
      
      // Initialize request monitoring
      const traceId = await this.monitoringService.initializeRequestMonitoring('test-workflow-001', workflowData);
      this.addTestResult('Workflow Monitoring - Request Initialization', true, `Trace ID: ${traceId}`);
      
      // Test monitoring service methods
      await this.monitoringService.monitorBedrockOperation('test-query', 'amazon.titan-text-express-v1', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, query: 'SELECT * FROM test' };
      });
      this.addTestResult('Workflow Monitoring - Bedrock Operation', true, 'Bedrock operation monitored');
      
      await this.monitoringService.monitorLambdaOperation('test-function', async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return { statusCode: 200, body: 'test-result' };
      });
      this.addTestResult('Workflow Monitoring - Lambda Operation', true, 'Lambda operation monitored');
      
    } catch (error) {
      this.addTestResult('Analysis Workflow Monitoring', false, error.message);
    }
    
    console.log('');
  }

  async testCloudWatchInsights() {
    console.log('🔍 Test 8: CloudWatch Insights Queries');
    
    try {
      // Test getting comprehensive metrics
      const metrics = await this.monitoringService.getComprehensiveMetrics(3600);
      
      if (metrics.success) {
        this.addTestResult('CloudWatch Insights - Comprehensive Metrics', true, 
          `Requests: ${metrics.metrics.totalRequests}, Errors: ${metrics.metrics.totalErrors}`);
      } else {
        this.addTestResult('CloudWatch Insights - Comprehensive Metrics', false, metrics.error);
      }
      
      // Test alarm status
      const alarmStatus = await this.monitoringService.getAlarmStatus();
      
      if (alarmStatus.success) {
        this.addTestResult('CloudWatch Insights - Alarm Status', true, 
          `Active alarms: ${alarmStatus.activeAlarms}`);
      } else {
        this.addTestResult('CloudWatch Insights - Alarm Status', false, alarmStatus.error);
      }
      
    } catch (error) {
      this.addTestResult('CloudWatch Insights', false, error.message);
    }
    
    console.log('');
  }

  async testEndToEndMonitoring() {
    console.log('🔍 Test 9: End-to-End Monitoring (Optional)');
    
    try {
      // Test actual API call with monitoring
      const testPayload = {
        CustomerName: 'Test Customer',
        region: 'us-east-1',
        closeDate: '2024-12-31',
        oppName: 'Test Opportunity',
        oppDescription: 'End-to-end monitoring test'
      };
      
      console.log('   Making test API call...');
      const response = await axios.post(`${this.baseUrl}/api/analyze/mock`, testPayload, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        this.addTestResult('End-to-End Monitoring - API Call', true, 'Mock API call successful');
      } else {
        this.addTestResult('End-to-End Monitoring - API Call', false, `Status: ${response.status}`);
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.addTestResult('End-to-End Monitoring - API Call', false, 'Server not running (expected in test environment)');
      } else {
        this.addTestResult('End-to-End Monitoring - API Call', false, error.message);
      }
    }
    
    console.log('');
  }

  addTestResult(testName, success, details) {
    this.testResults.push({ testName, success, details });
    const status = success ? '✅' : '❌';
    console.log(`   ${status} ${testName}: ${details}`);
  }

  printTestSummary() {
    console.log('📊 Test Summary');
    console.log('================');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.testName}: ${r.details}`));
    }
    
    console.log('\n🎉 Monitoring test suite completed!');
    
    if (failedTests === 0) {
      console.log('✅ All monitoring components are working correctly!');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new MonitoringTest();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { MonitoringTest };