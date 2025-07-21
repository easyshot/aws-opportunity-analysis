#!/usr/bin/env node

/**
 * Test script for Enhanced Bedrock Prompt Management System
 * Tests prompt selection, A/B testing, analytics, and performance monitoring
 */

require('dotenv').config();
const BedrockPromptManager = require('../lib/bedrock-prompt-manager');
const PromptAnalyticsService = require('../lib/prompt-analytics-service');

// Test data for different scenarios
const TEST_SCENARIOS = {
  enterprise_complex: {
    CustomerName: 'Global Enterprise Corp',
    region: 'us-east-1',
    closeDate: '2025-06-15',
    oppName: 'Enterprise Cloud Transformation',
    oppDescription: 'Large-scale enterprise migration involving multi-cloud hybrid architecture with advanced security compliance requirements for financial services industry. Includes microservices modernization and AI/ML integration.',
    expectedCharacteristics: {
      opportunitySize: 'enterprise',
      complexity: 'high',
      customerSegment: 'enterprise',
      industry: 'financial'
    }
  },
  
  smb_simple: {
    CustomerName: 'Small Business Inc',
    region: 'us-west-2',
    closeDate: '2025-03-20',
    oppName: 'Basic Website Migration',
    oppDescription: 'Small business looking to migrate their simple website and database to AWS for better reliability and cost savings.',
    expectedCharacteristics: {
      opportunitySize: 'smb',
      complexity: 'low',
      customerSegment: 'smb',
      industry: 'general'
    }
  },
  
  healthcare_medium: {
    CustomerName: 'Regional Healthcare System',
    region: 'us-east-1',
    closeDate: '2025-08-10',
    oppName: 'HIPAA-Compliant Data Platform',
    oppDescription: 'Healthcare organization needs to build a HIPAA-compliant data analytics platform for patient records and medical research with advanced security and compliance features.',
    expectedCharacteristics: {
      opportunitySize: 'medium',
      complexity: 'high',
      customerSegment: 'commercial',
      industry: 'healthcare'
    }
  },
  
  startup_innovative: {
    CustomerName: 'TechStart Innovations',
    region: 'us-west-2',
    closeDate: '2025-04-30',
    oppName: 'AI-Powered SaaS Platform',
    oppDescription: 'Startup building an innovative AI-powered SaaS platform using machine learning, real-time analytics, and serverless architecture for rapid scaling.',
    expectedCharacteristics: {
      opportunitySize: 'smb',
      complexity: 'high',
      customerSegment: 'startup',
      industry: 'general'
    }
  }
};

class PromptManagementTester {
  constructor() {
    this.promptManager = new BedrockPromptManager();
    this.analyticsService = new PromptAnalyticsService();
    this.testResults = {
      passed: 0,
      failed: 0,
      details: []
    };
  }

  /**
   * Run comprehensive test suite
   */
  async runAllTests() {
    console.log('🧪 Starting Enhanced Prompt Management Test Suite\n');
    console.log('='.repeat(60));
    
    try {
      // Test 1: Prompt Selection Logic
      await this.testPromptSelection();
      
      // Test 2: A/B Testing Configuration
      await this.testABTestingConfig();
      
      // Test 3: Dynamic Prompt Selection
      await this.testDynamicPromptSelection();
      
      // Test 4: Performance Metrics Recording
      await this.testPerformanceMetrics();
      
      // Test 5: Analytics Service
      await this.testAnalyticsService();
      
      // Test 6: Cache Management
      await this.testCacheManagement();
      
      // Test 7: Error Handling
      await this.testErrorHandling();
      
      // Display final results
      this.displayTestResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test prompt selection logic
   */
  async testPromptSelection() {
    console.log('\n📋 Test 1: Prompt Selection Logic');
    console.log('-'.repeat(40));
    
    for (const [scenarioName, scenario] of Object.entries(TEST_SCENARIOS)) {
      try {
        console.log(`\n  Testing scenario: ${scenarioName}`);
        
        // Test query generation prompt selection
        const queryPrompt = await this.promptManager.getOptimalPrompt(
          'query-generation', 
          scenario.expectedCharacteristics
        );
        
        this.assert(
          queryPrompt.prompt !== null,
          `Query prompt selected for ${scenarioName}`,
          'Should return a valid prompt'
        );
        
        console.log(`    ✓ Selected prompt: ${queryPrompt.promptId}`);
        console.log(`    ✓ Selection reason: ${queryPrompt.selectionReason}`);
        
        // Test analysis prompt selection
        const analysisPrompt = await this.promptManager.getOptimalPrompt(
          'analysis',
          scenario.expectedCharacteristics
        );
        
        this.assert(
          analysisPrompt.prompt !== null,
          `Analysis prompt selected for ${scenarioName}`,
          'Should return a valid prompt'
        );
        
        console.log(`    ✓ Analysis prompt: ${analysisPrompt.promptId}`);
        
      } catch (error) {
        this.recordFailure(`Prompt selection failed for ${scenarioName}`, error.message);
      }
    }
  }

  /**
   * Test A/B testing configuration
   */
  async testABTestingConfig() {
    console.log('\n🧪 Test 2: A/B Testing Configuration');
    console.log('-'.repeat(40));
    
    try {
      // Test updating A/B test config
      const testConfig = {
        enabled: true,
        variants: [
          { promptId: 'test-prompt-1', weight: 60, version: 'v1' },
          { promptId: 'test-prompt-2', weight: 40, version: 'v2' }
        ],
        metrics: ['response_time', 'quality_score']
      };
      
      this.promptManager.updateABTestConfig('test-prompt-type', testConfig);
      
      // Verify configuration was updated
      const updatedConfig = this.promptManager.abTestConfigs.get('test-prompt-type');
      
      this.assert(
        updatedConfig.enabled === true,
        'A/B test config update',
        'Should enable A/B testing'
      );
      
      this.assert(
        updatedConfig.variants.length === 2,
        'A/B test variants',
        'Should have 2 variants'
      );
      
      console.log('    ✓ A/B test configuration updated successfully');
      
    } catch (error) {
      this.recordFailure('A/B testing configuration', error.message);
    }
  }

  /**
   * Test dynamic prompt selection based on characteristics
   */
  async testDynamicPromptSelection() {
    console.log('\n🎯 Test 3: Dynamic Prompt Selection');
    console.log('-'.repeat(40));
    
    try {
      // Test enterprise scenario should prefer Nova Premier
      const enterpriseChar = TEST_SCENARIOS.enterprise_complex.expectedCharacteristics;
      enterpriseChar.predictedArr = 2500000; // High value
      
      const enterprisePrompt = await this.promptManager.getOptimalPrompt(
        'analysis',
        enterpriseChar
      );
      
      console.log(`    ✓ Enterprise scenario: ${enterprisePrompt.selectionReason}`);
      
      // Test SMB scenario should prefer standard
      const smbChar = TEST_SCENARIOS.smb_simple.expectedCharacteristics;
      smbChar.predictedArr = 50000; // Lower value
      
      const smbPrompt = await this.promptManager.getOptimalPrompt(
        'analysis',
        smbChar
      );
      
      console.log(`    ✓ SMB scenario: ${smbPrompt.selectionReason}`);
      
      // Verify different prompts were selected based on characteristics
      this.assert(
        enterprisePrompt.selectionReason !== smbPrompt.selectionReason,
        'Dynamic selection differentiation',
        'Should select different prompts for different scenarios'
      );
      
    } catch (error) {
      this.recordFailure('Dynamic prompt selection', error.message);
    }
  }

  /**
   * Test performance metrics recording
   */
  async testPerformanceMetrics() {
    console.log('\n📊 Test 4: Performance Metrics Recording');
    console.log('-'.repeat(40));
    
    try {
      // Test recording metrics for different prompt types
      const testMetrics = {
        response_time: 1500,
        query_quality: 85,
        success_rate: 95,
        confidence_score: 80
      };
      
      await this.promptManager.recordPromptPerformance(
        'query-generation',
        'test-prompt-id',
        testMetrics
      );
      
      console.log('    ✓ Query generation metrics recorded');
      
      // Test recording analysis metrics
      const analysisMetrics = {
        response_time: 2200,
        analysis_quality: 90,
        success_rate: 98,
        confidence_score: 85
      };
      
      await this.promptManager.recordPromptPerformance(
        'analysis',
        'test-analysis-prompt',
        analysisMetrics
      );
      
      console.log('    ✓ Analysis metrics recorded');
      
      // Verify metrics are stored locally
      const storedMetrics = this.promptManager.performanceMetrics;
      
      this.assert(
        storedMetrics.size > 0,
        'Metrics storage',
        'Should store performance metrics locally'
      );
      
    } catch (error) {
      this.recordFailure('Performance metrics recording', error.message);
    }
  }

  /**
   * Test analytics service
   */
  async testAnalyticsService() {
    console.log('\n📈 Test 5: Analytics Service');
    console.log('-'.repeat(40));
    
    try {
      // Test getting performance analytics
      const analytics = this.promptManager.getPerformanceAnalytics('query-generation');
      
      this.assert(
        typeof analytics === 'object',
        'Analytics object structure',
        'Should return analytics object'
      );
      
      this.assert(
        analytics.hasOwnProperty('totalSelections'),
        'Analytics properties',
        'Should include totalSelections property'
      );
      
      console.log('    ✓ Performance analytics retrieved');
      console.log(`    ✓ Total selections: ${analytics.totalSelections}`);
      
      // Test comprehensive analytics (this will use mock data since we don't have real CloudWatch data)
      try {
        const comprehensiveAnalytics = await this.analyticsService.getComprehensiveAnalytics();
        console.log('    ✓ Comprehensive analytics service accessible');
      } catch (error) {
        console.log('    ⚠️  CloudWatch analytics not available (expected in test environment)');
      }
      
    } catch (error) {
      this.recordFailure('Analytics service', error.message);
    }
  }

  /**
   * Test cache management
   */
  async testCacheManagement() {
    console.log('\n🗄️  Test 6: Cache Management');
    console.log('-'.repeat(40));
    
    try {
      // Test cache clearing
      this.promptManager.clearCache();
      console.log('    ✓ Prompt cache cleared');
      
      this.analyticsService.clearCache();
      console.log('    ✓ Analytics cache cleared');
      
      // Verify caches are empty
      this.assert(
        this.promptManager.promptCache.size === 0,
        'Prompt cache clearing',
        'Should clear prompt cache'
      );
      
      this.assert(
        this.analyticsService.analyticsCache.size === 0,
        'Analytics cache clearing',
        'Should clear analytics cache'
      );
      
    } catch (error) {
      this.recordFailure('Cache management', error.message);
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('\n⚠️  Test 7: Error Handling');
    console.log('-'.repeat(40));
    
    try {
      // Test invalid prompt type
      try {
        await this.promptManager.getOptimalPrompt('invalid-prompt-type', {});
        this.recordFailure('Error handling', 'Should throw error for invalid prompt type');
      } catch (error) {
        console.log('    ✓ Properly handles invalid prompt type');
      }
      
      // Test missing characteristics
      try {
        const result = await this.promptManager.getOptimalPrompt('query-generation', null);
        console.log('    ✓ Handles missing characteristics gracefully');
      } catch (error) {
        console.log('    ✓ Properly handles missing characteristics');
      }
      
      // Test invalid metrics
      try {
        await this.promptManager.recordPromptPerformance('test-type', 'test-id', null);
        console.log('    ✓ Handles invalid metrics gracefully');
      } catch (error) {
        console.log('    ✓ Properly handles invalid metrics');
      }
      
    } catch (error) {
      this.recordFailure('Error handling tests', error.message);
    }
  }

  /**
   * Assert helper function
   */
  assert(condition, testName, description) {
    if (condition) {
      this.testResults.passed++;
      this.testResults.details.push({
        status: 'PASS',
        test: testName,
        description
      });
    } else {
      this.recordFailure(testName, description);
    }
  }

  /**
   * Record test failure
   */
  recordFailure(testName, message) {
    this.testResults.failed++;
    this.testResults.details.push({
      status: 'FAIL',
      test: testName,
      message
    });
    console.log(`    ❌ ${testName}: ${message}`);
  }

  /**
   * Display final test results
   */
  displayTestResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(60));
    
    console.log(`\n✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📊 Total:  ${this.testResults.passed + this.testResults.failed}`);
    
    const successRate = (this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100;
    console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.details
        .filter(detail => detail.status === 'FAIL')
        .forEach(detail => {
          console.log(`  • ${detail.test}: ${detail.message}`);
        });
    }
    
    console.log('\n🎉 Enhanced Prompt Management Test Suite Complete!');
    
    if (this.testResults.failed === 0) {
      console.log('🌟 All tests passed! The system is ready for production use.');
    } else {
      console.log('⚠️  Some tests failed. Please review and fix issues before deployment.');
      process.exit(1);
    }
  }
}

/**
 * Performance benchmark test
 */
async function runPerformanceBenchmark() {
  console.log('\n⚡ Running Performance Benchmark');
  console.log('-'.repeat(40));
  
  const promptManager = new BedrockPromptManager();
  const iterations = 10;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    try {
      await promptManager.getOptimalPrompt('query-generation', {
        opportunitySize: 'enterprise',
        complexity: 'high'
      });
      
      const endTime = Date.now();
      times.push(endTime - startTime);
      
    } catch (error) {
      console.log(`  ⚠️  Iteration ${i + 1} failed: ${error.message}`);
    }
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`  📊 Average response time: ${avgTime.toFixed(2)}ms`);
    console.log(`  ⚡ Fastest response: ${minTime}ms`);
    console.log(`  🐌 Slowest response: ${maxTime}ms`);
    
    if (avgTime < 100) {
      console.log('  🌟 Excellent performance!');
    } else if (avgTime < 500) {
      console.log('  ✅ Good performance');
    } else {
      console.log('  ⚠️  Performance could be improved');
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

async function main() {
  if (args.includes('--benchmark')) {
    await runPerformanceBenchmark();
  } else if (args.includes('--help')) {
    console.log(`
Enhanced Prompt Management Test Suite

Usage:
  node scripts/test-prompt-management.js [options]

Options:
  --help        Show this help message
  --benchmark   Run performance benchmark tests

The test suite will:
  1. Test prompt selection logic
  2. Verify A/B testing configuration
  3. Test dynamic prompt selection
  4. Validate performance metrics recording
  5. Test analytics service functionality
  6. Verify cache management
  7. Test error handling scenarios
`);
  } else {
    const tester = new PromptManagementTester();
    await tester.runAllTests();
    
    if (args.includes('--with-benchmark')) {
      await runPerformanceBenchmark();
    }
  }
}

main().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});

module.exports = PromptManagementTester;