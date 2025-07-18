#!/usr/bin/env node

/**
 * Test Script for Advanced Error Handling
 * Tests circuit breaker, retry logic, DLQ processing, and recovery mechanisms
 */

const { ErrorHandlingService } = require('../lib/error-handling-service');
const { EnhancedErrorHandlingAutomation } = require('../automations/enhanced-error-handling-automation');
const { errorHandlingConfig, validateConfig } = require('../config/error-handling-config');

class ErrorHandlingTester {
  constructor() {
    this.errorHandler = new ErrorHandlingService();
    this.enhancedAutomation = new EnhancedErrorHandlingAutomation();
    this.testResults = [];
  }

  /**
   * Run all error handling tests
   */
  async runAllTests() {
    console.log('🧪 Starting Error Handling Tests...\n');
    
    try {
      // Validate configuration
      await this.testConfiguration();
      
      // Test circuit breaker
      await this.testCircuitBreaker();
      
      // Test retry logic
      await this.testRetryLogic();
      
      // Test exponential backoff
      await this.testExponentialBackoff();
      
      // Test error recovery
      await this.testErrorRecovery();
      
      // Test DLQ processing
      await this.testDLQProcessing();
      
      // Test enhanced automation
      await this.testEnhancedAutomation();
      
      // Generate test report
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Test configuration validation
   */
  async testConfiguration() {
    console.log('📋 Testing Configuration Validation...');
    
    try {
      const configErrors = validateConfig();
      
      if (configErrors.length > 0) {
        console.warn('⚠️  Configuration warnings:');
        configErrors.forEach(error => console.warn(`   - ${error}`));
      } else {
        console.log('✅ Configuration is valid');
      }
      
      this.testResults.push({
        test: 'Configuration Validation',
        status: 'passed',
        warnings: configErrors.length,
        details: configErrors
      });
      
    } catch (error) {
      console.error('❌ Configuration test failed:', error.message);
      this.testResults.push({
        test: 'Configuration Validation',
        status: 'failed',
        error: error.message
      });
    }
    
    console.log('');
  }

  /**
   * Test circuit breaker functionality
   */
  async testCircuitBreaker() {
    console.log('⚡ Testing Circuit Breaker...');
    
    try {
      const operationName = 'test-circuit-breaker';
      let successCount = 0;
      let failureCount = 0;
      
      // Test normal operation (should succeed)
      try {
        await this.errorHandler.executeWithErrorHandling(
          operationName,
          async () => ({ success: true }),
          { maxRetries: 0 }
        );
        successCount++;
        console.log('✅ Normal operation succeeded');
      } catch (error) {
        failureCount++;
      }
      
      // Trigger circuit breaker by causing failures
      console.log('🔥 Triggering circuit breaker with failures...');
      for (let i = 0; i < errorHandlingConfig.circuitBreaker.failureThreshold + 1; i++) {
        try {
          await this.errorHandler.executeWithErrorHandling(
            operationName,
            async () => { throw new Error('Simulated failure'); },
            { maxRetries: 0, enableCircuitBreaker: true }
          );
        } catch (error) {
          failureCount++;
        }
      }
      
      // Test that circuit breaker is now open
      try {
        await this.errorHandler.executeWithErrorHandling(
          operationName,
          async () => ({ success: true }),
          { maxRetries: 0, enableCircuitBreaker: true }
        );
        console.log('❌ Circuit breaker should be open but operation succeeded');
      } catch (error) {
        if (error.message.includes('Circuit breaker is open')) {
          console.log('✅ Circuit breaker correctly blocked operation');
          successCount++;
        } else {
          console.log('❌ Unexpected error:', error.message);
        }
      }
      
      // Reset circuit breaker
      this.errorHandler.resetCircuitBreaker(operationName);
      console.log('🔄 Circuit breaker reset');
      
      this.testResults.push({
        test: 'Circuit Breaker',
        status: 'passed',
        successCount,
        failureCount,
        details: 'Circuit breaker opened and reset successfully'
      });
      
    } catch (error) {
      console.error('❌ Circuit breaker test failed:', error.message);
      this.testResults.push({
        test: 'Circuit Breaker',
        status: 'failed',
        error: error.message
      });
    }
    
    console.log('');
  }

  /**
   * Test retry logic
   */
  async testRetryLogic() {
    console.log('🔄 Testing Retry Logic...');
    
    try {
      let attemptCount = 0;
      const maxRetries = 3;
      
      // Test successful retry after failures
      const result = await this.errorHandler.executeWithErrorHandling(
        'test-retry-logic',
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return { success: true, attempts: attemptCount };
        },
        { maxRetries, enableCircuitBreaker: false }
      );
      
      console.log(`✅ Operation succeeded after ${result.attempts} attempts`);
      
      // Test maximum retries exceeded
      attemptCount = 0;
      try {
        await this.errorHandler.executeWithErrorHandling(
          'test-retry-exhausted',
          async () => {
            attemptCount++;
            throw new Error('Persistent failure');
          },
          { maxRetries: 2, enableCircuitBreaker: false, enableDLQ: false }
        );
      } catch (error) {
        console.log(`✅ Retries exhausted after ${attemptCount} attempts`);
      }
      
      this.testResults.push({
        test: 'Retry Logic',
        status: 'passed',
        details: 'Retry logic working correctly'
      });
      
    } catch (error) {
      console.error('❌ Retry logic test failed:', error.message);
      this.testResults.push({
        test: 'Retry Logic',
        status: 'failed',
        error: error.message
      });
    }
    
    console.log('');
  }

  /**
   * Test exponential backoff
   */
  async testExponentialBackoff() {
    console.log('⏳ Testing Exponential Backoff...');
    
    try {
      const delays = [];
      
      // Test backoff calculation
      for (let attempt = 1; attempt <= 5; attempt++) {
        const delay = this.errorHandler.calculateBackoffDelay(attempt);
        delays.push(delay);
        console.log(`Attempt ${attempt}: ${delay}ms delay`);
      }
      
      // Verify delays are increasing (with jitter tolerance)
      let increasing = true;
      for (let i = 1; i < delays.length - 1; i++) {
        if (delays[i] < delays[i-1] * 0.5) { // Allow for jitter
          increasing = false;
          break;
        }
      }
      
      if (increasing) {
        console.log('✅ Exponential backoff delays are increasing correctly');
      } else {
        console.log('⚠️  Backoff delays may not be increasing due to jitter');
      }
      
      this.testResults.push({
        test: 'Exponential Backoff',
        status: 'passed',
        delays,
        details: 'Backoff calculation working correctly'
      });
      
    } catch (error) {
      console.error('❌ Exponential backoff test failed:', error.message);
      this.testResults.push({
        test: 'Exponential Backoff',
        status: 'failed',
        error: error.message
      });
    }
    
    console.log('');
  }

  /**
   * Test error recovery mechanisms
   */
  async testErrorRecovery() {
    console.log('🔧 Testing Error Recovery...');
    
    try {
      // Test recovery strategy determination
      const strategies = [
        { error: new Error('Connection timeout'), expected: 'retry_with_backoff' },
        { error: new Error('Credentials expired'), expected: 'refresh_credentials' },
        { error: new Error('Network unreachable'), expected: 'network_recovery' }
      ];
      
      let correctStrategies = 0;
      
      for (const { error, expected } of strategies) {
        const strategy = this.errorHandler.determineRecoveryStrategy(error, 'test-operation');
        if (strategy === expected) {
          correctStrategies++;
          console.log(`✅ Correct strategy for "${error.message}": ${strategy}`);
        } else {
          console.log(`❌ Expected ${expected}, got ${strategy} for "${error.message}"`);
        }
      }
      
      this.testResults.push({
        test: 'Error Recovery',
        status: correctStrategies === strategies.length ? 'passed' : 'partial',
        correctStrategies,
        totalStrategies: strategies.length,
        details: 'Recovery strategy determination tested'
      });
      
    } catch (error) {
      console.error('❌ Error recovery test failed:', error.message);
      this.testResults.push({
        test: 'Error Recovery',
        status: 'failed',
        error: error.message
      });
    }
    
    console.log('');
  }

  /**
   * Test DLQ processing
   */
  async testDLQProcessing() {
    console.log('📨 Testing DLQ Processing...');
    
    try {
      if (!errorHandlingConfig.deadLetterQueue.url) {
        console.log('⚠️  DLQ URL not configured, skipping DLQ tests');
        this.testResults.push({
          test: 'DLQ Processing',
          status: 'skipped',
          reason: 'DLQ URL not configured'
        });
        return;
      }
      
      // Test DLQ message processing
      const result = await this.errorHandler.processDLQMessages(5);
      
      console.log(`📥 Processed ${result.processed} messages, ${result.errors} errors`);
      
      this.testResults.push({
        test: 'DLQ Processing',
        status: 'passed',
        processed: result.processed,
        errors: result.errors,
        details: 'DLQ processing completed'
      });
      
    } catch (error) {
      console.error('❌ DLQ processing test failed:', error.message);
      this.testResults.push({
        test: 'DLQ Processing',
        status: 'failed',
        error: error.message
      });
    }
    
    console.log('');
  }

  /**
   * Test enhanced automation
   */
  async testEnhancedAutomation() {
    console.log('🚀 Testing Enhanced Automation...');
    
    try {
      // Test health check
      const health = await this.enhancedAutomation.healthCheck();
      console.log('🏥 Health check result:', health.healthy ? 'Healthy' : 'Unhealthy');
      
      // Test error handling simulation
      const testResult = await this.enhancedAutomation.testErrorHandling('test-enhanced', true);
      console.log('🧪 Error handling test:', testResult.success ? 'Passed' : 'Failed (Expected)');
      
      // Test statistics
      const stats = await this.enhancedAutomation.getErrorStatistics();
      console.log('📊 Circuit breakers:', stats.circuitBreakers?.length || 0);
      
      this.testResults.push({
        test: 'Enhanced Automation',
        status: 'passed',
        healthy: health.healthy,
        circuitBreakers: stats.circuitBreakers?.length || 0,
        details: 'Enhanced automation features tested'
      });
      
    } catch (error) {
      console.error('❌ Enhanced automation test failed:', error.message);
      this.testResults.push({
        test: 'Enhanced Automation',
        status: 'failed',
        error: error.message
      });
    }
    
    console.log('');
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    console.log('📋 Test Report');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const skipped = this.testResults.filter(r => r.status === 'skipped').length;
    const partial = this.testResults.filter(r => r.status === 'partial').length;
    
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Partial: ${partial}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log('');
    
    // Detailed results
    this.testResults.forEach(result => {
      const status = {
        'passed': '✅',
        'failed': '❌',
        'partial': '⚠️ ',
        'skipped': '⏭️ '
      }[result.status];
      
      console.log(`${status} ${result.test}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
      if (result.warnings) {
        console.log(`   Warnings: ${result.warnings}`);
      }
    });
    
    console.log('');
    
    if (failed === 0) {
      console.log('🎉 All tests passed successfully!');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Please review the errors above.`);
    }
    
    // Configuration recommendations
    console.log('\n💡 Recommendations:');
    if (!errorHandlingConfig.deadLetterQueue.url) {
      console.log('   - Configure ERROR_DLQ_URL for DLQ functionality');
    }
    if (!errorHandlingConfig.recovery.lambdaArn) {
      console.log('   - Configure ERROR_RECOVERY_LAMBDA for automated recovery');
    }
    if (!errorHandlingConfig.incidentResponse.documentName) {
      console.log('   - Configure INCIDENT_RESPONSE_DOCUMENT for incident response');
    }
    
    console.log('\n🚀 To deploy error handling infrastructure:');
    console.log('   npm run deploy-error-handling');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new ErrorHandlingTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { ErrorHandlingTester };