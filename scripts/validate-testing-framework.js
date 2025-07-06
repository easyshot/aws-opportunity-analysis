#!/usr/bin/env node

/**
 * Testing Framework Validation Script
 * 
 * Validates that the comprehensive testing framework is working correctly.
 * This script tests the testing framework itself to ensure all components are functional.
 */

const { TestingFramework } = require('../lib/testing-framework');
const { HealthCheckService } = require('../lib/health-check-service');
const { DiagnosticService } = require('../lib/diagnostic-service');
const { ConnectivityReporter } = require('../lib/connectivity-reporter');
const { HealthCheckEndpoints } = require('../lib/health-check-endpoints');

class TestingFrameworkValidator {
  constructor() {
    this.results = {
      timestamp: new Date(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };
  }

  async validate() {
    console.log('🔍 Validating Testing Framework Components');
    console.log('=========================================\n');

    try {
      // Test 1: Framework Initialization
      await this.testFrameworkInitialization();
      
      // Test 2: Health Check Service
      await this.testHealthCheckService();
      
      // Test 3: Diagnostic Service
      await this.testDiagnosticService();
      
      // Test 4: Connectivity Reporter
      await this.testConnectivityReporter();
      
      // Test 5: Health Check Endpoints
      await this.testHealthCheckEndpoints();
      
      // Test 6: Test Scenario Loading
      await this.testScenarioLoading();
      
      // Display results
      this.displayResults();
      
      return this.results.summary.failed === 0;
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  async testFrameworkInitialization() {
    const testName = 'Framework Initialization';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const framework = new TestingFramework();
      await framework.initialize();
      
      // Check if framework is properly initialized
      if (framework.initialized && 
          framework.testScenarios && 
          framework.errorScenarios && 
          framework.performanceTests && 
          framework.validationTests) {
        
        this.addTestResult(testName, 'passed', 'Framework initialized successfully');
        console.log('  ✅ Framework initialization: PASSED\n');
      } else {
        this.addTestResult(testName, 'failed', 'Framework not properly initialized');
        console.log('  ❌ Framework initialization: FAILED\n');
      }
    } catch (error) {
      this.addTestResult(testName, 'failed', error.message);
      console.log(`  ❌ Framework initialization: FAILED - ${error.message}\n`);
    }
  }

  async testHealthCheckService() {
    const testName = 'Health Check Service';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const healthCheck = new HealthCheckService();
      await healthCheck.initialize();
      
      // Test basic functionality
      if (healthCheck.initialized && healthCheck.clients) {
        this.addTestResult(testName, 'passed', 'Health check service initialized');
        console.log('  ✅ Health Check Service: PASSED\n');
      } else {
        this.addTestResult(testName, 'failed', 'Health check service not properly initialized');
        console.log('  ❌ Health Check Service: FAILED\n');
      }
    } catch (error) {
      this.addTestResult(testName, 'failed', error.message);
      console.log(`  ❌ Health Check Service: FAILED - ${error.message}\n`);
    }
  }

  async testDiagnosticService() {
    const testName = 'Diagnostic Service';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const diagnostic = new DiagnosticService();
      await diagnostic.initialize();
      
      // Test basic functionality
      if (diagnostic.healthCheck && diagnostic.reporter) {
        this.addTestResult(testName, 'passed', 'Diagnostic service initialized');
        console.log('  ✅ Diagnostic Service: PASSED\n');
      } else {
        this.addTestResult(testName, 'failed', 'Diagnostic service not properly initialized');
        console.log('  ❌ Diagnostic Service: FAILED\n');
      }
    } catch (error) {
      this.addTestResult(testName, 'failed', error.message);
      console.log(`  ❌ Diagnostic Service: FAILED - ${error.message}\n`);
    }
  }

  async testConnectivityReporter() {
    const testName = 'Connectivity Reporter';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const reporter = new ConnectivityReporter();
      
      // Test with mock health results
      const mockResults = [
        {
          service: 'Test Service',
          status: 'healthy',
          responseTime: 100,
          timestamp: new Date()
        }
      ];
      
      const report = reporter.generateReport(mockResults);
      
      if (report && report.summary && report.services && report.recommendations) {
        this.addTestResult(testName, 'passed', 'Connectivity reporter working');
        console.log('  ✅ Connectivity Reporter: PASSED\n');
      } else {
        this.addTestResult(testName, 'failed', 'Report generation failed');
        console.log('  ❌ Connectivity Reporter: FAILED\n');
      }
    } catch (error) {
      this.addTestResult(testName, 'failed', error.message);
      console.log(`  ❌ Connectivity Reporter: FAILED - ${error.message}\n`);
    }
  }

  async testHealthCheckEndpoints() {
    const testName = 'Health Check Endpoints';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const endpoints = new HealthCheckEndpoints();
      
      // Test initialization
      await endpoints.initialize();
      
      if (endpoints.initialized && endpoints.framework && endpoints.healthCheck) {
        this.addTestResult(testName, 'passed', 'Health check endpoints initialized');
        console.log('  ✅ Health Check Endpoints: PASSED\n');
      } else {
        this.addTestResult(testName, 'failed', 'Endpoints not properly initialized');
        console.log('  ❌ Health Check Endpoints: FAILED\n');
      }
    } catch (error) {
      this.addTestResult(testName, 'failed', error.message);
      console.log(`  ❌ Health Check Endpoints: FAILED - ${error.message}\n`);
    }
  }

  async testScenarioLoading() {
    const testName = 'Test Scenario Loading';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const framework = new TestingFramework();
      await framework.initialize();
      
      // Check if scenarios are loaded
      const scenarioCount = Object.keys(framework.testScenarios).length;
      const errorScenarioCount = Object.keys(framework.errorScenarios).length;
      const performanceTestCount = Object.keys(framework.performanceTests).length;
      const validationTestCount = Object.keys(framework.validationTests).length;
      
      if (scenarioCount > 0 && errorScenarioCount > 0 && 
          performanceTestCount > 0 && validationTestCount > 0) {
        
        this.addTestResult(testName, 'passed', 
          `Loaded ${scenarioCount} scenarios, ${errorScenarioCount} error scenarios, ` +
          `${performanceTestCount} performance tests, ${validationTestCount} validation tests`);
        
        console.log('  ✅ Test Scenario Loading: PASSED');
        console.log(`    - Test Scenarios: ${scenarioCount}`);
        console.log(`    - Error Scenarios: ${errorScenarioCount}`);
        console.log(`    - Performance Tests: ${performanceTestCount}`);
        console.log(`    - Validation Tests: ${validationTestCount}\n`);
      } else {
        this.addTestResult(testName, 'failed', 'Not all scenario types loaded');
        console.log('  ❌ Test Scenario Loading: FAILED\n');
      }
    } catch (error) {
      this.addTestResult(testName, 'failed', error.message);
      console.log(`  ❌ Test Scenario Loading: FAILED - ${error.message}\n`);
    }
  }

  addTestResult(name, status, details) {
    this.results.tests.push({
      name,
      status,
      details,
      timestamp: new Date()
    });
    
    this.results.summary.total++;
    if (status === 'passed') {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
    }
  }

  displayResults() {
    console.log('='.repeat(60));
    console.log('🎯 TESTING FRAMEWORK VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    console.log(`📅 Validation Time: ${this.results.timestamp.toLocaleString()}`);
    console.log(`🏁 Overall Status: ${this.results.summary.failed === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    
    console.log('\n📊 Test Results:');
    console.log(`  Total Tests: ${this.results.summary.total}`);
    console.log(`  ✅ Passed: ${this.results.summary.passed}`);
    console.log(`  ❌ Failed: ${this.results.summary.failed}`);
    
    console.log('\n📋 Test Details:');
    this.results.tests.forEach((test, index) => {
      const statusIcon = test.status === 'passed' ? '✅' : '❌';
      console.log(`  ${index + 1}. ${statusIcon} ${test.name}: ${test.status.toUpperCase()}`);
      if (test.details) {
        console.log(`     ${test.details}`);
      }
    });
    
    if (this.results.summary.failed === 0) {
      console.log('\n🎉 All validation tests passed! The testing framework is ready to use.');
      console.log('\n💡 Next Steps:');
      console.log('  1. Run comprehensive tests: node scripts/run-comprehensive-testing-framework.js');
      console.log('  2. Check health endpoints: node scripts/validate-aws-connectivity.js');
      console.log('  3. Run specific test scenarios as needed');
    } else {
      console.log('\n⚠️  Some validation tests failed. Please review the issues above.');
      console.log('\n🔧 Troubleshooting:');
      console.log('  1. Check that all required dependencies are installed');
      console.log('  2. Verify AWS credentials are configured');
      console.log('  3. Ensure environment variables are set');
      console.log('  4. Review error messages for specific issues');
    }
    
    console.log('='.repeat(60));
  }
}

// CLI interface
async function main() {
  const validator = new TestingFrameworkValidator();
  
  try {
    const success = await validator.validate();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Validation interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Validation terminated');
  process.exit(143);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { TestingFrameworkValidator };