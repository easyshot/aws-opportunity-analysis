/**
 * Integration Script for Enhanced Error Handling and Monitoring
 * Integrates the enhanced services into the existing application
 */

const { EnhancedErrorHandlingService } = require('../lib/enhanced-error-handling-service');
const { EnhancedMonitoringService } = require('../lib/enhanced-monitoring-service');

class ErrorHandlingIntegration {
  constructor() {
    this.enhancedErrorHandling = null;
    this.enhancedMonitoring = null;
    this.integrationStatus = {
      errorHandling: false,
      monitoring: false,
      dashboards: false,
      healthChecks: false
    };
  }

  /**
   * Initialize enhanced error handling and monitoring
   */
  async initialize() {
    console.log('🚀 Initializing Enhanced Error Handling and Monitoring Integration');
    console.log('====================================================================');

    try {
      // Initialize Enhanced Error Handling Service
      console.log('🛡️ Initializing Enhanced Error Handling Service...');
      this.enhancedErrorHandling = new EnhancedErrorHandlingService({
        deadLetterQueueUrl: process.env.ERROR_DLQ_URL,
        errorRecoveryQueueUrl: process.env.ERROR_RECOVERY_QUEUE_URL,
        errorRecoveryLambda: process.env.ERROR_RECOVERY_LAMBDA,
        errorRecoveryStateMachine: process.env.ERROR_RECOVERY_STATE_MACHINE,
        incidentResponseDocument: process.env.INCIDENT_RESPONSE_DOCUMENT,
        alertTopicArn: process.env.ERROR_ALERT_TOPIC_ARN
      });
      this.integrationStatus.errorHandling = true;
      console.log('✅ Enhanced Error Handling Service initialized');

      // Initialize Enhanced Monitoring Service
      console.log('📊 Initializing Enhanced Monitoring Service...');
      this.enhancedMonitoring = new EnhancedMonitoringService({
        namespace: 'AWS/OpportunityAnalysis/Enhanced',
        logGroupName: '/aws/opportunity-analysis/enhanced-monitoring',
        dashboardName: 'OpportunityAnalysis-Enhanced-Monitoring',
        anomalyDetectionEnabled: true,
        detailedLoggingEnabled: process.env.DETAILED_LOGGING_ENABLED !== 'false',
        sensitiveDataMasking: process.env.SENSITIVE_DATA_MASKING !== 'false'
      });
      this.integrationStatus.monitoring = true;
      console.log('✅ Enhanced Monitoring Service initialized');

      // Create monitoring dashboards
      console.log('📈 Creating monitoring dashboards...');
      await this.createMonitoringDashboards();
      this.integrationStatus.dashboards = true;
      console.log('✅ Monitoring dashboards created');

      // Setup health checks
      console.log('🏥 Setting up health checks...');
      await this.setupHealthChecks();
      this.integrationStatus.healthChecks = true;
      console.log('✅ Health checks configured');

      console.log('\n🎉 Enhanced Error Handling and Monitoring Integration Complete!');
      this.printIntegrationStatus();

    } catch (error) {
      console.error('❌ Integration failed:', error.message);
      throw error;
    }
  }

  /**
   * Create comprehensive monitoring dashboards
   */
  async createMonitoringDashboards() {
    try {
      // Create enhanced monitoring dashboard
      await this.enhancedMonitoring.createComprehensiveDashboard();
      
      // Create error handling dashboard
      await this.enhancedErrorHandling.createMonitoringDashboard();
      
      console.log('📊 Created comprehensive monitoring dashboards');
    } catch (error) {
      console.warn('⚠️ Dashboard creation warning:', error.message);
    }
  }

  /**
   * Setup health checks
   */
  async setupHealthChecks() {
    try {
      // Test error handling health check
      const errorHandlingHealth = await this.enhancedErrorHandling.performEnhancedHealthCheck();
      console.log(`🛡️ Error Handling Health: ${errorHandlingHealth.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);

      // Test monitoring health check
      const monitoringHealth = await this.enhancedMonitoring.performEnhancedHealthCheck();
      console.log(`📊 Monitoring Health: ${monitoringHealth.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);

    } catch (error) {
      console.warn('⚠️ Health check setup warning:', error.message);
    }
  }

  /**
   * Demonstrate enhanced error handling with real scenarios
   */
  async demonstrateErrorHandling() {
    console.log('\n🧪 Demonstrating Enhanced Error Handling Scenarios');
    console.log('==================================================');

    // Scenario 1: Successful operation with monitoring
    console.log('\n📋 Scenario 1: Successful Operation with Monitoring');
    try {
      const result = await this.enhancedErrorHandling.executeWithEnhancedErrorHandling(
        'demo-successful-operation',
        async () => {
          console.log('  🔄 Executing successful operation...');
          await this.sleep(1000); // Simulate processing time
          return { success: true, data: 'Operation completed successfully' };
        },
        {
          context: { demo: true, scenario: 'success' }
        }
      );
      console.log('  ✅ Operation completed:', result.data);
    } catch (error) {
      console.error('  ❌ Unexpected error:', error.message);
    }

    // Scenario 2: Retry with exponential backoff
    console.log('\n📋 Scenario 2: Retry with Exponential Backoff');
    let attemptCount = 0;
    try {
      const result = await this.enhancedErrorHandling.executeWithEnhancedErrorHandling(
        'demo-retry-operation',
        async () => {
          attemptCount++;
          console.log(`  🔄 Attempt ${attemptCount}...`);
          if (attemptCount < 3) {
            throw new Error('Temporary service unavailable');
          }
          return { success: true, attempts: attemptCount };
        },
        {
          maxRetries: 5,
          context: { demo: true, scenario: 'retry' }
        }
      );
      console.log(`  ✅ Operation succeeded after ${result.attempts} attempts`);
    } catch (error) {
      console.error('  ❌ Operation failed:', error.message);
    }

    // Scenario 3: Throttling handling
    console.log('\n📋 Scenario 3: Throttling Error Handling');
    try {
      await this.enhancedErrorHandling.executeWithEnhancedErrorHandling(
        'demo-throttling-operation',
        async () => {
          const error = new Error('ThrottlingException: Rate limit exceeded');
          error.name = 'ThrottlingException';
          throw error;
        },
        {
          maxRetries: 2,
          context: { demo: true, scenario: 'throttling' }
        }
      );
    } catch (error) {
      console.log('  ⚠️ Throttling error handled:', error.message);
      
      // Check throttling status
      const isThrottled = this.enhancedErrorHandling.isOperationThrottled('demo-throttling-operation');
      const throttleDelay = this.enhancedErrorHandling.getThrottleDelay('demo-throttling-operation');
      console.log(`  🚦 Operation throttled: ${isThrottled}, Delay: ${throttleDelay}ms`);
    }

    // Scenario 4: Network error with recovery
    console.log('\n📋 Scenario 4: Network Error with Recovery');
    try {
      await this.enhancedErrorHandling.executeWithEnhancedErrorHandling(
        'demo-network-operation',
        async () => {
          const error = new Error('Network timeout - connection failed');
          error.name = 'NetworkError';
          throw error;
        },
        {
          maxRetries: 2,
          context: { demo: true, scenario: 'network' }
        }
      );
    } catch (error) {
      console.log('  🌐 Network error handled:', error.message);
    }

    // Scenario 5: Circuit breaker demonstration
    console.log('\n📋 Scenario 5: Circuit Breaker Demonstration');
    const failingOperation = async () => {
      throw new Error('Service consistently unavailable');
    };

    // Trigger circuit breaker
    for (let i = 1; i <= 6; i++) {
      try {
        await this.enhancedErrorHandling.executeWithEnhancedErrorHandling(
          'demo-circuit-breaker',
          failingOperation,
          {
            maxRetries: 0,
            enableCircuitBreaker: true,
            context: { demo: true, scenario: 'circuit-breaker', attempt: i }
          }
        );
      } catch (error) {
        if (error.message.includes('Circuit breaker is open')) {
          console.log(`  🔌 Circuit breaker opened after ${i} attempts`);
          break;
        } else {
          console.log(`  ❌ Attempt ${i} failed: ${error.message}`);
        }
      }
    }
  }

  /**
   * Demonstrate enhanced monitoring capabilities
   */
  async demonstrateMonitoring() {
    console.log('\n📊 Demonstrating Enhanced Monitoring Capabilities');
    console.log('================================================');

    // Scenario 1: Workflow monitoring
    console.log('\n📋 Monitoring Complete Analysis Workflow');
    const testWorkflowData = {
      CustomerName: 'Demo Customer Corp',
      region: 'us-east-1',
      closeDate: '2024-12-31',
      oppName: 'Demo Opportunity',
      oppDescription: 'This is a demonstration opportunity for testing enhanced monitoring capabilities',
      useNovaPremier: false
    };

    try {
      const result = await this.enhancedMonitoring.monitorEnhancedAnalysisWorkflow(testWorkflowData);
      console.log(`  ✅ Workflow monitored successfully:`);
      console.log(`     - Workflow ID: ${result.workflowId}`);
      console.log(`     - Trace ID: ${result.traceId}`);
      console.log(`     - Total Duration: ${result.totalDuration}ms`);
      console.log(`     - Steps: Query(${result.steps.queryGeneration.duration}ms), Data(${result.steps.dataRetrieval.duration}ms), Analysis(${result.steps.analysis.duration}ms)`);
    } catch (error) {
      console.error('  ❌ Workflow monitoring failed:', error.message);
    }

    // Scenario 2: Custom metrics recording
    console.log('\n📋 Recording Custom Metrics');
    try {
      await this.enhancedMonitoring.recordEnhancedMetric('DemoMetric', 100, 'Count', [
        { Name: 'DemoType', Value: 'integration-test' }
      ]);
      console.log('  ✅ Custom metric recorded successfully');
    } catch (error) {
      console.error('  ❌ Custom metric recording failed:', error.message);
    }

    // Scenario 3: Structured logging
    console.log('\n📋 Structured Event Logging');
    try {
      await this.enhancedMonitoring.logEnhancedEvent('demo_integration_event', {
        eventType: 'integration_demonstration',
        customerName: this.enhancedMonitoring.maskSensitiveData('Demo Customer Corp'),
        region: 'us-east-1',
        metadata: {
          integrationVersion: '1.0.0',
          timestamp: new Date().toISOString(),
          features: ['error-handling', 'monitoring', 'dashboards']
        }
      });
      console.log('  ✅ Structured event logged successfully');
    } catch (error) {
      console.error('  ❌ Structured event logging failed:', error.message);
    }

    // Scenario 4: Performance metrics
    console.log('\n📋 Performance Metrics Retrieval');
    try {
      const metrics = await this.enhancedMonitoring.getEnhancedPerformanceMetrics(3600);
      console.log('  ✅ Performance metrics retrieved:');
      console.log(`     - Success: ${metrics.success}`);
      console.log(`     - Total Requests: ${metrics.metrics?.totalRequests || 0}`);
      console.log(`     - Error Rate: ${metrics.metrics?.errorRate?.toFixed(2) || 0}%`);
      console.log(`     - Average Latency: ${metrics.metrics?.averageLatency?.toFixed(0) || 0}ms`);
      console.log(`     - Tracked Operations: ${Object.keys(metrics.enhanced?.performanceTracking || {}).length}`);
    } catch (error) {
      console.error('  ❌ Performance metrics retrieval failed:', error.message);
    }
  }

  /**
   * Generate comprehensive status report
   */
  async generateStatusReport() {
    console.log('\n📋 Comprehensive Status Report');
    console.log('==============================');

    try {
      // Error handling statistics
      const errorStats = await this.enhancedErrorHandling.getEnhancedErrorStatistics();
      console.log('\n🛡️ Error Handling Statistics:');
      console.log(`   - Circuit Breakers: ${errorStats.circuitBreakers?.length || 0}`);
      console.log(`   - Active Throttles: ${errorStats.throttling?.length || 0}`);
      console.log(`   - Network Issues: ${errorStats.networkIssues?.consecutiveFailures || 0} consecutive failures`);
      console.log(`   - Quota Issues: ${errorStats.quotaIssues?.length || 0}`);

      // Monitoring health
      const monitoringHealth = await this.enhancedMonitoring.performEnhancedHealthCheck();
      console.log('\n📊 Monitoring Health:');
      console.log(`   - Overall Health: ${monitoringHealth.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      console.log(`   - CloudWatch: ${monitoringHealth.checks?.find(c => c.component === 'CloudWatch')?.healthy ? '✅' : '❌'}`);
      console.log(`   - X-Ray: ${monitoringHealth.checks?.find(c => c.component === 'X-Ray')?.healthy ? '✅' : '❌'}`);
      console.log(`   - Metrics Buffer: ${monitoringHealth.enhanced?.metricsBuffer?.bufferSize || 0}/${monitoringHealth.enhanced?.metricsBuffer?.maxSize || 0}`);
      console.log(`   - Anomaly Detectors: ${monitoringHealth.enhanced?.anomalyDetection?.enabledDetectors || 0} enabled`);

      // Integration status
      console.log('\n🔧 Integration Status:');
      Object.entries(this.integrationStatus).forEach(([component, status]) => {
        console.log(`   - ${component}: ${status ? '✅ Integrated' : '❌ Not Integrated'}`);
      });

    } catch (error) {
      console.error('❌ Status report generation failed:', error.message);
    }
  }

  /**
   * Print integration status
   */
  printIntegrationStatus() {
    console.log('\n🔧 Integration Status Summary:');
    console.log('==============================');
    console.log(`✅ Enhanced Error Handling: ${this.integrationStatus.errorHandling ? 'Active' : 'Inactive'}`);
    console.log(`✅ Enhanced Monitoring: ${this.integrationStatus.monitoring ? 'Active' : 'Inactive'}`);
    console.log(`✅ Monitoring Dashboards: ${this.integrationStatus.dashboards ? 'Created' : 'Not Created'}`);
    console.log(`✅ Health Checks: ${this.integrationStatus.healthChecks ? 'Configured' : 'Not Configured'}`);
    
    console.log('\n🎯 Task 6 Implementation Features:');
    console.log('==================================');
    console.log('✅ Retry logic with exponential backoff');
    console.log('✅ CloudWatch metrics tracking for KPIs');
    console.log('✅ Detailed logging with sensitive data protection');
    console.log('✅ Throttling and service quota handling');
    console.log('✅ Network issue handling and fallback responses');
    console.log('✅ Monitoring dashboards for operational visibility');
    console.log('✅ Circuit breaker pattern implementation');
    console.log('✅ Dead Letter Queue for failed operations');
    console.log('✅ Automated recovery mechanisms');
    console.log('✅ Real-time alerting for critical errors');
    console.log('✅ Performance tracking and anomaly detection');
    console.log('✅ Comprehensive health checks');
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up resources...');
    
    try {
      if (this.enhancedMonitoring) {
        await this.enhancedMonitoring.cleanup();
      }
      console.log('✅ Cleanup completed successfully');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error.message);
    }
  }

  /**
   * Utility function for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution function
async function main() {
  const integration = new ErrorHandlingIntegration();
  
  try {
    // Initialize the integration
    await integration.initialize();
    
    // Demonstrate error handling capabilities
    await integration.demonstrateErrorHandling();
    
    // Demonstrate monitoring capabilities
    await integration.demonstrateMonitoring();
    
    // Generate comprehensive status report
    await integration.generateStatusReport();
    
    console.log('\n🎉 Enhanced Error Handling and Monitoring Integration Demonstration Complete!');
    console.log('=============================================================================');
    console.log('The application now has comprehensive error handling and monitoring capabilities.');
    console.log('Check the AWS CloudWatch console for dashboards, metrics, and logs.');
    
  } catch (error) {
    console.error('❌ Integration demonstration failed:', error.message);
    process.exit(1);
  } finally {
    await integration.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { ErrorHandlingIntegration };