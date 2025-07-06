#!/usr/bin/env node

/**
 * Comprehensive Testing Framework Runner
 * 
 * Implements Task 9: Create comprehensive testing and validation framework
 * 
 * This script provides a unified interface to run all types of tests:
 * - Health check endpoints for all AWS services (Requirement 9.1)
 * - Test scenarios for major workflow validation (Requirement 9.2)
 * - Diagnostic tools for troubleshooting issues (Requirement 9.3)
 * - Performance testing with realistic data loads (Requirement 9.4)
 * - Error scenario testing for validation of error handling (Requirement 9.5)
 * - Automated validation tests for deployment verification (Requirement 9.6)
 */

const { TestingFramework } = require('../lib/testing-framework');
const { DiagnosticService } = require('../lib/diagnostic-service');
const fs = require('fs').promises;
const path = require('path');

class TestingFrameworkRunner {
  constructor() {
    this.framework = new TestingFramework();
    this.diagnostic = new DiagnosticService();
    this.results = {
      timestamp: new Date(),
      testSuites: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      errors: []
    };
  }

  async run(options = {}) {
    console.log('🚀 Starting Comprehensive Testing Framework');
    console.log('==========================================\n');

    try {
      // Initialize framework
      await this.framework.initialize();
      await this.diagnostic.initialize();

      // Parse command line options
      const testOptions = this.parseOptions(options);
      
      // Run selected test suites
      if (testOptions.healthCheck) {
        await this.runHealthCheckTests();
      }
      
      if (testOptions.scenarios) {
        await this.runScenarioTests();
      }
      
      if (testOptions.errorScenarios) {
        await this.runErrorScenarioTests();
      }
      
      if (testOptions.performance) {
        await this.runPerformanceTests();
      }
      
      if (testOptions.validation) {
        await this.runValidationTests();
      }
      
      if (testOptions.diagnostics) {
        await this.runDiagnosticTests();
      }

      // Generate comprehensive report
      await this.generateReport();
      
      // Display summary
      this.displaySummary();
      
      // Return success/failure status
      return this.results.summary.failed === 0;

    } catch (error) {
      console.error('❌ Testing framework execution failed:', error.message);
      this.results.errors.push({
        phase: 'framework_execution',
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  parseOptions(options) {
    // Default to running all tests if no specific options provided
    const defaultOptions = {
      healthCheck: true,
      scenarios: true,
      errorScenarios: true,
      performance: false, // Skip by default due to time
      validation: true,
      diagnostics: true
    };

    return {
      ...defaultOptions,
      ...options,
      // Override from command line arguments
      healthCheck: process.argv.includes('--health-check') || options.healthCheck !== false,
      scenarios: process.argv.includes('--scenarios') || options.scenarios !== false,
      errorScenarios: process.argv.includes('--error-scenarios') || options.errorScenarios !== false,
      performance: process.argv.includes('--performance') || options.performance === true,
      validation: process.argv.includes('--validation') || options.validation !== false,
      diagnostics: process.argv.includes('--diagnostics') || options.diagnostics !== false
    };
  }

  /**
   * Run health check tests
   * Implements Requirement 9.1: Health check endpoints for all services
   */
  async runHealthCheckTests() {
    console.log('🏥 Running Health Check Tests...\n');
    
    const startTime = Date.now();
    const suite = {
      name: 'Health Check Tests',
      startTime: new Date(),
      tests: [],
      status: 'running'
    };

    try {
      // Run full health check
      const healthResults = await this.framework.healthCheck.runFullHealthCheck();
      
      // Process results
      healthResults.forEach(result => {
        suite.tests.push({
          name: `Health Check: ${result.service}`,
          status: result.status === 'healthy' ? 'passed' : 'failed',
          duration: result.responseTime,
          details: result
        });
      });

      // Determine overall suite status
      const failedTests = suite.tests.filter(t => t.status === 'failed');
      suite.status = failedTests.length === 0 ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();

      console.log(`${suite.status === 'passed' ? '✅' : '❌'} Health Check Tests: ${suite.status}`);
      console.log(`Services tested: ${suite.tests.length}`);
      console.log(`Failed: ${failedTests.length}\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`❌ Health Check Tests failed: ${error.message}\n`);
    }

    this.results.testSuites.healthCheck = suite;
    this.updateSummary(suite);
  }

  /**
   * Run scenario tests
   * Implements Requirement 9.2: Test scenarios for major workflow validation
   */
  async runScenarioTests() {
    console.log('🧪 Running Scenario Tests...\n');
    
    const startTime = Date.now();
    const suite = {
      name: 'Scenario Tests',
      startTime: new Date(),
      tests: [],
      status: 'running'
    };

    try {
      const scenarios = ['basicOpportunity', 'complexOpportunity', 'fundingAnalysis', 'followOnAnalysis'];
      
      for (const scenarioName of scenarios) {
        try {
          console.log(`Running scenario: ${scenarioName}...`);
          const result = await this.framework.runTestScenario(scenarioName);
          
          suite.tests.push({
            name: `Scenario: ${result.name}`,
            status: result.status,
            duration: result.duration,
            details: result
          });
          
        } catch (error) {
          suite.tests.push({
            name: `Scenario: ${scenarioName}`,
            status: 'error',
            duration: 0,
            error: error.message
          });
        }
      }

      // Determine overall suite status
      const failedTests = suite.tests.filter(t => t.status !== 'passed');
      suite.status = failedTests.length === 0 ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();

      console.log(`${suite.status === 'passed' ? '✅' : '❌'} Scenario Tests: ${suite.status}`);
      console.log(`Scenarios tested: ${suite.tests.length}`);
      console.log(`Failed: ${failedTests.length}\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`❌ Scenario Tests failed: ${error.message}\n`);
    }

    this.results.testSuites.scenarios = suite;
    this.updateSummary(suite);
  }

  /**
   * Run error scenario tests
   * Implements Requirement 9.5: Error scenario testing for validation of error handling
   */
  async runErrorScenarioTests() {
    console.log('⚠️ Running Error Scenario Tests...\n');
    
    const startTime = Date.now();
    const suite = {
      name: 'Error Scenario Tests',
      startTime: new Date(),
      tests: [],
      status: 'running'
    };

    try {
      const errorScenarios = ['invalidInput', 'bedrockTimeout', 'athenaError', 'networkError', 'throttlingError'];
      
      for (const scenarioName of errorScenarios) {
        try {
          console.log(`Running error scenario: ${scenarioName}...`);
          const result = await this.framework.runErrorScenario(scenarioName);
          
          suite.tests.push({
            name: `Error Scenario: ${result.name}`,
            status: result.status,
            duration: result.duration,
            details: result
          });
          
        } catch (error) {
          suite.tests.push({
            name: `Error Scenario: ${scenarioName}`,
            status: 'error',
            duration: 0,
            error: error.message
          });
        }
      }

      // Determine overall suite status
      const failedTests = suite.tests.filter(t => t.status !== 'passed');
      suite.status = failedTests.length === 0 ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();

      console.log(`${suite.status === 'passed' ? '✅' : '❌'} Error Scenario Tests: ${suite.status}`);
      console.log(`Error scenarios tested: ${suite.tests.length}`);
      console.log(`Failed: ${failedTests.length}\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`❌ Error Scenario Tests failed: ${error.message}\n`);
    }

    this.results.testSuites.errorScenarios = suite;
    this.updateSummary(suite);
  }

  /**
   * Run performance tests
   * Implements Requirement 9.4: Performance testing with realistic data loads
   */
  async runPerformanceTests() {
    console.log('⚡ Running Performance Tests...\n');
    
    const startTime = Date.now();
    const suite = {
      name: 'Performance Tests',
      startTime: new Date(),
      tests: [],
      status: 'running'
    };

    try {
      const performanceTests = ['singleUserBaseline', 'lightLoad'];
      
      for (const testName of performanceTests) {
        try {
          console.log(`Running performance test: ${testName}...`);
          const result = await this.framework.runPerformanceTest(testName);
          
          suite.tests.push({
            name: `Performance: ${result.name}`,
            status: result.status,
            duration: result.duration,
            details: result
          });
          
        } catch (error) {
          suite.tests.push({
            name: `Performance: ${testName}`,
            status: 'error',
            duration: 0,
            error: error.message
          });
        }
      }

      // Determine overall suite status
      const failedTests = suite.tests.filter(t => t.status !== 'passed');
      suite.status = failedTests.length === 0 ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();

      console.log(`${suite.status === 'passed' ? '✅' : '❌'} Performance Tests: ${suite.status}`);
      console.log(`Performance tests run: ${suite.tests.length}`);
      console.log(`Failed: ${failedTests.length}\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`❌ Performance Tests failed: ${error.message}\n`);
    }

    this.results.testSuites.performance = suite;
    this.updateSummary(suite);
  }

  /**
   * Run validation tests
   * Implements Requirement 9.6: Automated validation tests for deployment verification
   */
  async runValidationTests() {
    console.log('✅ Running Validation Tests...\n');
    
    const startTime = Date.now();
    const suite = {
      name: 'Validation Tests',
      startTime: new Date(),
      tests: [],
      status: 'running'
    };

    try {
      const validationTests = ['preDeployment', 'postDeployment'];
      
      for (const testName of validationTests) {
        try {
          console.log(`Running validation test: ${testName}...`);
          const result = await this.framework.runValidationTest(testName);
          
          suite.tests.push({
            name: `Validation: ${result.name}`,
            status: result.status,
            duration: result.duration,
            details: result
          });
          
        } catch (error) {
          suite.tests.push({
            name: `Validation: ${testName}`,
            status: 'error',
            duration: 0,
            error: error.message
          });
        }
      }

      // Determine overall suite status
      const failedTests = suite.tests.filter(t => t.status !== 'passed');
      suite.status = failedTests.length === 0 ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();

      console.log(`${suite.status === 'passed' ? '✅' : '❌'} Validation Tests: ${suite.status}`);
      console.log(`Validation tests run: ${suite.tests.length}`);
      console.log(`Failed: ${failedTests.length}\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`❌ Validation Tests failed: ${error.message}\n`);
    }

    this.results.testSuites.validation = suite;
    this.updateSummary(suite);
  }

  /**
   * Run diagnostic tests
   * Implements Requirement 9.3: Diagnostic tools for troubleshooting issues
   */
  async runDiagnosticTests() {
    console.log('🔍 Running Diagnostic Tests...\n');
    
    const startTime = Date.now();
    const suite = {
      name: 'Diagnostic Tests',
      startTime: new Date(),
      tests: [],
      status: 'running'
    };

    try {
      // Run comprehensive diagnostics
      const diagnosticReport = await this.diagnostic.runDiagnostics();
      
      // Save diagnostic report
      await this.diagnostic.saveDiagnosticReport(diagnosticReport, 'comprehensive-diagnostic-report.json');
      
      // Display diagnostic summary
      this.diagnostic.displayDiagnosticSummary(diagnosticReport);
      
      suite.tests.push({
        name: 'Comprehensive Diagnostics',
        status: diagnosticReport.summary.overallHealth === 'healthy' ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: diagnosticReport
      });

      suite.status = diagnosticReport.summary.overallHealth === 'healthy' ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();

      console.log(`${suite.status === 'passed' ? '✅' : '❌'} Diagnostic Tests: ${suite.status}\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`❌ Diagnostic Tests failed: ${error.message}\n`);
    }

    this.results.testSuites.diagnostics = suite;
    this.updateSummary(suite);
  }

  updateSummary(suite) {
    this.results.summary.total++;
    
    switch (suite.status) {
      case 'passed':
        this.results.summary.passed++;
        break;
      case 'failed':
      case 'error':
        this.results.summary.failed++;
        break;
      case 'skipped':
        this.results.summary.skipped++;
        break;
    }
  }

  async generateReport() {
    console.log('📊 Generating Comprehensive Test Report...\n');
    
    try {
      const report = {
        metadata: {
          timestamp: this.results.timestamp.toISOString(),
          version: '1.0.0',
          framework: 'AWS Opportunity Analysis Testing Framework',
          environment: process.env.NODE_ENV || 'development'
        },
        summary: this.results.summary,
        testSuites: this.results.testSuites,
        errors: this.results.errors,
        recommendations: this.generateRecommendations()
      };

      // Save comprehensive report
      const reportsDir = path.join(process.cwd(), 'reports');
      try {
        await fs.access(reportsDir);
      } catch {
        await fs.mkdir(reportsDir, { recursive: true });
      }

      const reportPath = path.join(reportsDir, `comprehensive-test-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`✅ Comprehensive test report saved to: ${reportPath}`);

    } catch (error) {
      console.error(`❌ Failed to generate report: ${error.message}`);
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze test results and generate recommendations
    Object.values(this.results.testSuites).forEach(suite => {
      if (suite.status === 'failed') {
        recommendations.push(`Address failures in ${suite.name} before proceeding`);
      }
    });

    if (this.results.summary.failed === 0) {
      recommendations.push('All tests passed - system is ready for production deployment');
      recommendations.push('Consider running performance tests for production readiness');
      recommendations.push('Set up continuous monitoring and alerting');
    } else {
      recommendations.push('Fix failing tests before deploying to production');
      recommendations.push('Review error logs and diagnostic reports for detailed troubleshooting');
      recommendations.push('Re-run tests after implementing fixes');
    }

    return recommendations;
  }

  displaySummary() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE TESTING FRAMEWORK SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`📅 Execution Time: ${this.results.timestamp.toLocaleString()}`);
    console.log(`🏁 Overall Status: ${this.results.summary.failed === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    
    console.log('\n📈 Test Suite Results:');
    console.log(`  Total Suites: ${this.results.summary.total}`);
    console.log(`  ✅ Passed: ${this.results.summary.passed}`);
    console.log(`  ❌ Failed: ${this.results.summary.failed}`);
    console.log(`  ⏭️ Skipped: ${this.results.summary.skipped}`);
    
    console.log('\n📋 Suite Details:');
    Object.entries(this.results.testSuites).forEach(([name, suite]) => {
      const statusIcon = suite.status === 'passed' ? '✅' : suite.status === 'failed' ? '❌' : '💥';
      console.log(`  ${statusIcon} ${suite.name}: ${suite.status} (${suite.duration}ms)`);
      
      if (suite.tests && suite.tests.length > 0) {
        const failedTests = suite.tests.filter(t => t.status !== 'passed');
        if (failedTests.length > 0) {
          console.log(`    Failed tests: ${failedTests.length}/${suite.tests.length}`);
        }
      }
    });
    
    if (this.results.errors.length > 0) {
      console.log('\n⚠️ Errors Encountered:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.phase}: ${error.error}`);
      });
    }
    
    console.log('\n💡 Recommendations:');
    const recommendations = this.generateRecommendations();
    recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
    
    console.log('='.repeat(80));
  }
}

// CLI interface
async function main() {
  const runner = new TestingFrameworkRunner();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {};
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
AWS Opportunity Analysis - Comprehensive Testing Framework

Usage: node run-testing-framework.js [options]

Options:
  --health-check      Run health check tests (default: true)
  --scenarios         Run scenario tests (default: true)
  --error-scenarios   Run error scenario tests (default: true)
  --performance       Run performance tests (default: false)
  --validation        Run validation tests (default: true)
  --diagnostics       Run diagnostic tests (default: true)
  --all               Run all tests including performance tests
  --help, -h          Show this help message

Examples:
  node run-testing-framework.js                    # Run standard test suite
  node run-testing-framework.js --all              # Run all tests including performance
  node run-testing-framework.js --health-check     # Run only health check tests
  node run-testing-framework.js --performance      # Include performance tests
    `);
    process.exit(0);
  }
  
  if (args.includes('--all')) {
    options.performance = true;
  }
  
  try {
    const success = await runner.run(options);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Framework execution failed:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Testing framework interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Testing framework terminated');
  process.exit(143);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { TestingFrameworkRunner };