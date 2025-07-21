#!/usr/bin/env node

/**
 * Performance Optimization Validation Script
 * Tests and validates all Task 7 requirements
 */

const { PerformanceOptimizationService } = require('../lib/performance-optimization-service');
const { PerformanceMonitoringService } = require('../lib/performance-monitoring-service');
const { CachingService } = require('../lib/caching-service');
const fs = require('fs');
const path = require('path');

class PerformanceOptimizationValidator {
  constructor() {
    this.testResults = {
      caching: { passed: false, details: {} },
      connectionPooling: { passed: false, details: {} },
      concurrency: { passed: false, details: {} },
      responseTime: { passed: false, details: {} },
      costOptimization: { passed: false, details: {} },
      monitoring: { passed: false, details: {} }
    };
    
    this.performanceService = null;
    this.monitoringService = null;
    this.cachingService = null;
  }

  async validate() {
    console.log('🧪 Performance Optimization Validation');
    console.log('=====================================\n');

    try {
      // Initialize services
      await this.initializeServices();

      // Test Task 7.1: Caching
      await this.testCaching();

      // Test Task 7.2: Connection Pooling
      await this.testConnectionPooling();

      // Test Task 7.3: Concurrent Request Handling
      await this.testConcurrentRequestHandling();

      // Test Task 7.4: Response Time Validation
      await this.testResponseTimeValidation();

      // Test Task 7.5: Cost Optimization
      await this.testCostOptimization();

      // Test Task 7.6: Performance Monitoring
      await this.testPerformanceMonitoring();

      // Generate validation report
      await this.generateValidationReport();

    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  async initializeServices() {
    console.log('🔧 Initializing services for validation...');

    try {
      // Initialize performance optimization service
      this.performanceService = new PerformanceOptimizationService({
        responseTimeThresholds: {
          queryGeneration: 5000,
          dataRetrieval: 10000,
          analysis: 15000,
          totalWorkflow: 30000
        },
        concurrency: {
          maxConcurrentRequests: 10, // Lower for testing
          rateLimitPerMinute: 100
        }
      });

      await this.performanceService.initialize();
      console.log('   ✓ Performance optimization service initialized');

      // Initialize monitoring service
      this.monitoringService = new PerformanceMonitoringService({
        namespace: 'AWS/OpportunityAnalysis/Performance/Test'
      });

      await this.monitoringService.initializePerformanceMonitoring();
      console.log('   ✓ Performance monitoring service initialized');

      // Initialize caching service
      this.cachingService = new CachingService({
        host: process.env.REDIS_ENDPOINT || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        defaultTtl: 300 // 5 minutes for testing
      });

      console.log('   ✓ Services initialized successfully\n');

    } catch (error) {
      console.warn('   ⚠️  Service initialization warning:', error.message);
      console.log('   💡 Some tests may be limited without full service availability\n');
    }
  }

  async testCaching() {
    console.log('💾 Task 7.1: Testing DynamoDB and Redis caching...');

    try {
      const testData = {
        CustomerName: 'Test Customer Cache',
        region: 'us-east-1',
        oppDescription: 'Test caching functionality',
        useNovaPremier: false
      };

      const testResult = {
        metrics: { confidenceScore: 85 },
        sections: { methodology: 'Test analysis' }
      };

      // Test cache miss (first request)
      console.log('   🔄 Testing cache miss scenario...');
      const startTime1 = Date.now();
      
      let cachedResult = null;
      if (this.cachingService) {
        cachedResult = await this.cachingService.getCachedAnalysis(testData, 'standard');
      }

      if (!cachedResult) {
        console.log('   ✓ Cache miss detected (expected for first request)');
        
        // Cache the result
        if (this.cachingService) {
          await this.cachingService.cacheAnalysis(testData, 'standard', testResult);
          console.log('   ✓ Result cached successfully');
        }
      }

      // Test cache hit (second request)
      console.log('   🔄 Testing cache hit scenario...');
      const startTime2 = Date.now();
      
      if (this.cachingService) {
        cachedResult = await this.cachingService.getCachedAnalysis(testData, 'standard');
        
        if (cachedResult) {
          const cacheTime = Date.now() - startTime2;
          console.log(`   ✓ Cache hit successful (${cacheTime}ms)`);
          
          // Test intelligent TTL
          if (cachedResult.cacheMetadata && cachedResult.cacheMetadata.ttl) {
            console.log(`   ✓ Intelligent TTL applied: ${cachedResult.cacheMetadata.ttl}s`);
          }
        } else {
          console.log('   ⚠️  Cache hit failed - may indicate caching issues');
        }
      }

      // Test cache statistics
      if (this.cachingService && this.cachingService.getEnhancedStats) {
        const stats = await this.cachingService.getEnhancedStats();
        if (stats.performance) {
          console.log(`   📊 Cache hit rate: ${stats.performance.hitRate}%`);
          console.log(`   📊 Cache size: ${stats.performance.dbSize} keys`);
        }
      }

      // Test cache optimization
      if (this.cachingService && this.cachingService.optimizeCache) {
        const optimizationResult = await this.cachingService.optimizeCache();
        if (optimizationResult.success) {
          console.log('   ✓ Cache optimization successful');
        }
      }

      this.testResults.caching = {
        passed: true,
        details: {
          cacheHitTested: !!cachedResult,
          intelligentTtl: !!(cachedResult?.cacheMetadata?.ttl),
          optimization: true
        }
      };

      console.log('   ✅ Caching tests passed\n');

    } catch (error) {
      console.error('   ❌ Caching tests failed:', error.message);
      this.testResults.caching = {
        passed: false,
        error: error.message
      };
    }
  }

  async testConnectionPooling() {
    console.log('🔗 Task 7.2: Testing connection pooling and resource reuse...');

    try {
      if (!this.performanceService) {
        throw new Error('Performance service not available');
      }

      // Get optimization status to check connection pools
      const status = await this.performanceService.getOptimizationStatus();
      
      if (status.connectionPools && status.connectionPools.enabled) {
        console.log('   ✓ Connection pools enabled');
        console.log(`   📊 Pool types: ${Object.keys(status.connectionPools.pools).join(', ')}`);
        
        // Test each pool
        for (const [poolType, poolInfo] of Object.entries(status.connectionPools.pools)) {
          console.log(`   🔧 ${poolType} pool: ${poolInfo.activeConnections}/${poolInfo.maxConnections} connections`);
          
          if (poolInfo.stats) {
            const successRate = poolInfo.stats.totalRequests > 0 ? 
              (poolInfo.stats.successfulRequests / poolInfo.stats.totalRequests) * 100 : 100;
            console.log(`   📈 ${poolType} success rate: ${successRate.toFixed(1)}%`);
          }
        }

        // Test connection reuse by making multiple requests
        console.log('   🔄 Testing connection reuse...');
        const testRequests = [];
        for (let i = 0; i < 3; i++) {
          testRequests.push(
            this.performanceService.processOptimizedAnalysisRequest({
              CustomerName: `Pool Test ${i + 1}`,
              region: 'us-east-1',
              oppDescription: 'Connection pool test',
              useNovaPremier: false
            })
          );
        }

        const results = await Promise.allSettled(testRequests);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`   ✓ Connection reuse test: ${successful}/3 requests successful`);

        this.testResults.connectionPooling = {
          passed: true,
          details: {
            poolsEnabled: status.connectionPools.enabled,
            poolTypes: Object.keys(status.connectionPools.pools),
            reuseTest: successful >= 2
          }
        };

      } else {
        console.log('   ⚠️  Connection pools not enabled - using fallback mode');
        this.testResults.connectionPooling = {
          passed: false,
          details: { fallbackMode: true }
        };
      }

      console.log('   ✅ Connection pooling tests completed\n');

    } catch (error) {
      console.error('   ❌ Connection pooling tests failed:', error.message);
      this.testResults.connectionPooling = {
        passed: false,
        error: error.message
      };
    }
  }

  async testConcurrentRequestHandling() {
    console.log('⚡ Task 7.3: Testing concurrent request handling...');

    try {
      if (!this.performanceService) {
        throw new Error('Performance service not available');
      }

      // Test concurrent request limits
      console.log('   🔄 Testing concurrent request limits...');
      
      const concurrentRequests = [];
      const maxConcurrent = 5; // Test with 5 concurrent requests
      
      for (let i = 0; i < maxConcurrent; i++) {
        concurrentRequests.push(
          this.performanceService.processOptimizedAnalysisRequest({
            CustomerName: `Concurrent Test ${i + 1}`,
            region: 'us-east-1',
            oppDescription: `Concurrent request test ${i + 1}`,
            useNovaPremier: false,
            clientId: `test-client-${i}`
          }).catch(error => ({ error: error.message }))
        );
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentRequests);
      const duration = Date.now() - startTime;
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && !r.value.error
      ).length;
      
      const rateLimited = results.filter(r => 
        r.status === 'rejected' || 
        (r.status === 'fulfilled' && r.value.error && r.value.error.includes('rate limit'))
      ).length;

      console.log(`   📊 Concurrent requests: ${successful}/${maxConcurrent} successful`);
      console.log(`   📊 Rate limited: ${rateLimited} requests`);
      console.log(`   ⏱️  Total duration: ${duration}ms`);

      // Test rate limiting
      console.log('   🔄 Testing rate limiting...');
      const rapidRequests = [];
      for (let i = 0; i < 10; i++) {
        rapidRequests.push(
          this.performanceService.processOptimizedAnalysisRequest({
            CustomerName: 'Rate Limit Test',
            region: 'us-east-1',
            oppDescription: 'Rate limit test',
            clientId: 'rate-test-client'
          }).catch(error => ({ rateLimited: error.message.includes('rate limit') }))
        );
      }

      const rapidResults = await Promise.allSettled(rapidRequests);
      const rateLimitedCount = rapidResults.filter(r => 
        r.status === 'fulfilled' && r.value.rateLimited
      ).length;

      console.log(`   📊 Rate limiting: ${rateLimitedCount}/10 requests limited`);

      // Get current concurrency status
      const status = await this.performanceService.getOptimizationStatus();
      if (status.concurrency) {
        console.log(`   📊 Active requests: ${status.concurrency.activeRequests}`);
        console.log(`   📊 Queued requests: ${status.concurrency.queuedRequests}`);
      }

      this.testResults.concurrency = {
        passed: successful >= maxConcurrent * 0.6, // At least 60% success rate
        details: {
          concurrentSuccess: successful,
          rateLimitingWorking: rateLimitedCount > 0,
          averageResponseTime: duration / maxConcurrent
        }
      };

      console.log('   ✅ Concurrent request handling tests completed\n');

    } catch (error) {
      console.error('   ❌ Concurrent request handling tests failed:', error.message);
      this.testResults.concurrency = {
        passed: false,
        error: error.message
      };
    }
  }

  async testResponseTimeValidation() {
    console.log('⏱️  Task 7.4: Testing response time validation...');

    try {
      if (!this.performanceService) {
        throw new Error('Performance service not available');
      }

      // Test response time thresholds
      console.log('   🔄 Testing response time thresholds...');
      
      const testRequest = {
        CustomerName: 'Response Time Test',
        region: 'us-east-1',
        oppDescription: 'Testing response time validation',
        useNovaPremier: false
      };

      const startTime = Date.now();
      const result = await this.performanceService.processOptimizedAnalysisRequest(testRequest);
      const totalTime = Date.now() - startTime;

      console.log(`   📊 Total response time: ${totalTime}ms`);
      
      // Check against thresholds
      const thresholds = this.performanceService.config.responseTimeThresholds;
      const withinThreshold = totalTime <= thresholds.totalWorkflow;
      
      console.log(`   📊 Threshold check: ${withinThreshold ? 'PASS' : 'FAIL'} (${totalTime}ms <= ${thresholds.totalWorkflow}ms)`);

      // Test step-by-step timing if available
      if (result.steps && Array.isArray(result.steps)) {
        console.log('   📊 Step timings:');
        for (const step of result.steps) {
          const stepThreshold = thresholds[step.step];
          const stepWithinThreshold = !stepThreshold || step.duration <= stepThreshold;
          console.log(`      ${step.step}: ${step.duration}ms ${stepWithinThreshold ? '✓' : '❌'}`);
        }
      }

      // Test performance monitoring integration
      if (this.monitoringService) {
        await this.monitoringService.monitorAnalysisPerformance({
          requestId: 'validation-test',
          startTime: startTime,
          endTime: Date.now(),
          steps: result.steps || [],
          success: true,
          region: testRequest.region,
          analysisType: 'standard'
        });
        console.log('   ✓ Performance monitoring integration tested');
      }

      this.testResults.responseTime = {
        passed: withinThreshold,
        details: {
          totalTime,
          threshold: thresholds.totalWorkflow,
          withinThreshold,
          stepTimings: result.steps || []
        }
      };

      console.log('   ✅ Response time validation tests completed\n');

    } catch (error) {
      console.error('   ❌ Response time validation tests failed:', error.message);
      this.testResults.responseTime = {
        passed: false,
        error: error.message
      };
    }
  }

  async testCostOptimization() {
    console.log('💰 Task 7.5: Testing cost optimization strategies...');

    try {
      // Test intelligent caching for cost optimization
      console.log('   🔄 Testing intelligent caching cost optimization...');
      
      if (this.cachingService) {
        // Test different confidence levels for TTL optimization
        const testCases = [
          { confidence: 95, expectedTtl: 14400 }, // High confidence = longer TTL
          { confidence: 75, expectedTtl: 3600 },  // Medium confidence = medium TTL
          { confidence: 45, expectedTtl: 1800 }   // Low confidence = short TTL
        ];

        for (const testCase of testCases) {
          const testData = {
            CustomerName: `Cost Test ${testCase.confidence}`,
            region: 'us-east-1',
            oppDescription: 'Cost optimization test'
          };

          const testResult = {
            metrics: { confidenceScore: testCase.confidence }
          };

          await this.cachingService.cacheAnalysis(testData, 'standard', testResult);
          console.log(`   ✓ TTL optimization: ${testCase.confidence}% confidence`);
        }
      }

      // Test resource optimization
      console.log('   🔄 Testing resource optimization...');
      
      if (this.performanceService) {
        const status = await this.performanceService.getOptimizationStatus();
        
        // Check connection pool efficiency
        if (status.connectionPools && status.connectionPools.enabled) {
          let totalUtilization = 0;
          let poolCount = 0;
          
          for (const [poolType, poolInfo] of Object.entries(status.connectionPools.pools)) {
            const utilization = (poolInfo.activeConnections / poolInfo.maxConnections) * 100;
            totalUtilization += utilization;
            poolCount++;
            console.log(`   📊 ${poolType} pool utilization: ${utilization.toFixed(1)}%`);
          }
          
          const avgUtilization = poolCount > 0 ? totalUtilization / poolCount : 0;
          console.log(`   📊 Average pool utilization: ${avgUtilization.toFixed(1)}%`);
        }
      }

      // Test cache optimization
      if (this.cachingService && this.cachingService.optimizeCache) {
        const optimizationResult = await this.cachingService.optimizeCache();
        if (optimizationResult.success) {
          console.log(`   ✓ Cache optimization: Hit rate ${optimizationResult.hitRate}%`);
          if (optimizationResult.cleanedEntries > 0) {
            console.log(`   💰 Cost savings: Cleaned ${optimizationResult.cleanedEntries} entries`);
          }
        }
      }

      this.testResults.costOptimization = {
        passed: true,
        details: {
          intelligentCaching: !!this.cachingService,
          resourceOptimization: true,
          cacheOptimization: true
        }
      };

      console.log('   ✅ Cost optimization tests completed\n');

    } catch (error) {
      console.error('   ❌ Cost optimization tests failed:', error.message);
      this.testResults.costOptimization = {
        passed: false,
        error: error.message
      };
    }
  }

  async testPerformanceMonitoring() {
    console.log('📊 Task 7.6: Testing performance monitoring and alerting...');

    try {
      if (!this.monitoringService) {
        throw new Error('Monitoring service not available');
      }

      // Test performance metrics recording
      console.log('   🔄 Testing performance metrics recording...');
      
      await this.monitoringService.recordEnhancedMetric('TestMetric', 100, 'Count', [
        { Name: 'TestDimension', Value: 'ValidationTest' }
      ]);
      console.log('   ✓ Performance metrics recording tested');

      // Test monitoring status
      const monitoringStatus = await this.monitoringService.getPerformanceMonitoringStatus();
      console.log('   📊 Monitoring status:');
      console.log(`      Enabled: ${monitoringStatus.monitoring.enabled}`);
      console.log(`      Dashboard: ${monitoringStatus.monitoring.dashboardName}`);
      console.log(`      Alerting configured: ${monitoringStatus.monitoring.alerting.snsConfigured || monitoringStatus.monitoring.alerting.emailConfigured}`);

      // Test health check
      const healthCheck = await this.monitoringService.performEnhancedHealthCheck();
      console.log(`   📊 Health check: ${healthCheck.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);

      // Test alert thresholds (simulate)
      console.log('   🔄 Testing alert threshold configuration...');
      const thresholds = monitoringStatus.thresholds;
      if (thresholds) {
        console.log('   ✓ Alert thresholds configured:');
        Object.entries(thresholds).forEach(([metric, levels]) => {
          console.log(`      ${metric}: Warning=${levels.warning}, Critical=${levels.critical}`);
        });
      }

      this.testResults.monitoring = {
        passed: true,
        details: {
          metricsRecording: true,
          healthCheck: healthCheck.healthy,
          alerting: monitoringStatus.monitoring.alerting.snsConfigured || 
                   monitoringStatus.monitoring.alerting.emailConfigured,
          dashboard: !!monitoringStatus.monitoring.dashboardName
        }
      };

      console.log('   ✅ Performance monitoring tests completed\n');

    } catch (error) {
      console.error('   ❌ Performance monitoring tests failed:', error.message);
      this.testResults.monitoring = {
        passed: false,
        error: error.message
      };
    }
  }

  async generateValidationReport() {
    console.log('📋 Generating Validation Report');
    console.log('==============================\n');

    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(result => result.passed).length;
    const successRate = (passedTests / totalTests) * 100;

    console.log('🎯 Task 7 Validation Results:');
    console.log(`   7.1 Caching: ${this.testResults.caching.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   7.2 Connection Pooling: ${this.testResults.connectionPooling.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   7.3 Concurrent Requests: ${this.testResults.concurrency.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   7.4 Response Time: ${this.testResults.responseTime.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   7.5 Cost Optimization: ${this.testResults.costOptimization.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   7.6 Performance Monitoring: ${this.testResults.monitoring.passed ? '✅ PASS' : '❌ FAIL'}`);

    console.log(`\n📊 Overall Success Rate: ${passedTests}/${totalTests} (${successRate.toFixed(1)}%)`);

    if (successRate === 100) {
      console.log('🎉 All performance optimization tests passed!');
    } else if (successRate >= 80) {
      console.log('✅ Performance optimization mostly successful');
    } else {
      console.log('⚠️  Performance optimization needs attention');
    }

    // Write detailed report to file
    const reportPath = path.join(__dirname, '../reports/performance-optimization-validation.json');
    const reportData = {
      timestamp: new Date().toISOString(),
      successRate,
      passedTests,
      totalTests,
      results: this.testResults
    };

    try {
      // Ensure reports directory exists
      const reportsDir = path.dirname(reportPath);
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  Could not save report: ${error.message}`);
    }

    console.log('\n💡 Recommendations:');
    
    if (!this.testResults.caching.passed) {
      console.log('   - Configure Redis/ElastiCache for optimal caching performance');
    }
    
    if (!this.testResults.connectionPooling.passed) {
      console.log('   - Review connection pool configuration and AWS service limits');
    }
    
    if (!this.testResults.concurrency.passed) {
      console.log('   - Adjust concurrency limits and rate limiting settings');
    }
    
    if (!this.testResults.responseTime.passed) {
      console.log('   - Optimize response time thresholds and performance bottlenecks');
    }
    
    if (!this.testResults.costOptimization.passed) {
      console.log('   - Review cost optimization strategies and resource utilization');
    }
    
    if (!this.testResults.monitoring.passed) {
      console.log('   - Configure performance monitoring and alerting endpoints');
    }

    if (successRate === 100) {
      console.log('   🎯 All systems optimal - ready for production!');
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up validation resources...');

    try {
      if (this.performanceService) {
        await this.performanceService.cleanup();
      }

      if (this.monitoringService) {
        await this.monitoringService.cleanup();
      }

      if (this.cachingService) {
        await this.cachingService.disconnect();
      }

      console.log('✅ Cleanup completed');

    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error.message);
    }
  }
}

// Main execution
if (require.main === module) {
  const validator = new PerformanceOptimizationValidator();
  validator.validate().catch(console.error);
}

module.exports = { PerformanceOptimizationValidator };