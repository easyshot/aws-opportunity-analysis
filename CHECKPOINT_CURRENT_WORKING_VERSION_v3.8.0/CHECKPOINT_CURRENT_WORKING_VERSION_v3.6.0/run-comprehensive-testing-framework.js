#!/usr/bin/env node

/**
 * Comprehensive Testing Framework Runner
 * 
 * Implements Task 9: Create comprehensive testing and validation framework
 * 
 * This is the main entry point for running all types of tests and validations:
 * - Health check endpoints for all AWS services (Requirement 9.1)
 * - Test scenarios for major workflow validation (Requirement 9.2)
 * - Diagnostic tools for troubleshooting issues (Requirement 9.3)
 * - Performance testing with realistic data loads (Requirement 9.4)
 * - Error scenario testing for validation of error handling (Requirement 9.5)
 * - Automated validation tests for deployment verification (Requirement 9.6)
 */

const { TestingFramework } = require('../lib/testing-framework');
const { HealthCheckService } = require('../lib/health-check-service');
const { DiagnosticService } = require('../lib/diagnostic-service');
const { ConnectivityReporter } = require('../lib/connectivity-reporter');
const fs = require('fs').promises;
const path = require('path');

class ComprehensiveTestingFramework {
  constructor() {
    this.framework = new TestingFramework();
    this.healthCheck = new HealthCheckService();
    this.diagnostic = new DiagnosticService();
    this.reporter = new ConnectivityReporter();
    
    this.results = {
      timestamp: new Date(),
      testSuites: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        errors: 0
      },
      errors: [],
      recommendations: []
    };
  }

  /**
   * Main execution method
   */
  async run(options = {}) {
    console.log('🚀 Starting Comprehensive Testing Framework');
    console.log('==========================================\n');

    try {
      // Initialize all services
      await this.initialize();

      // Parse command line options
      const testOptions = this.parseOptions(options);
      
      console.log('📋 Test Configuration:');
      console.log(`  Health Checks: ${testOptions.healthCheck ? '✅' : '❌'}`);
      console.log(`  Scenarios: ${testOptions.scenarios ? '✅' : '❌'}`);
      console.log(`  Error Scenarios: ${testOptions.errorScenarios ? '✅' : '❌'}`);
      console.log(`  Performance Tests: ${testOptions.performance ? '✅' : '❌'}`);
      console.log(`  Validation Tests: ${testOptions.validation ? '✅' : '❌'}`);
      console.log(`  Diagnostics: ${testOptions.diagnostics ? '✅' : '❌'}\n`);

      // Run selected test suites
      if (testOptions.healthCheck) {
        await this.runHealthCheckSuite();
      }
      
      if (testOptions.scenarios) {
        await this.runScenarioSuite();
      }
      
      if (testOptions.errorScenarios) {
        await this.runErrorScenarioSuite();
      }
      
      if (testOptions.performance) {
        await this.runPerformanceSuite();
      }
      
      if (testOptions.validation) {
        await this.runValidationSuite();
      }
      
      if (testOptions.diagnostics) {
        await this.runDiagnosticSuite();
      }

      // Generate comprehensive report
      await this.generateComprehensiveReport();
      
      // Display final summary
      this.displayFinalSummary();
      
      // Return success/failure status
      return this.results.summary.failed === 0 && this.results.summary.errors === 0;

    } catch (error) {
      console.error('❌ Testing framework execution failed:', error.message);
      this.results.errors.push({
        phase: 'framework_execution',
        error: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
      return false;
    }
  }

  /**
   * Initialize all services
   */
  async initialize() {
    console.log('🔄 Initializing Testing Framework Components...');
    
    try {
      await this.framework.initialize();
      await this.healthCheck.initialize();
      await this.diagnostic.initialize();
      
      console.log('✅ All components initialized successfully\n');
    } catch (error) {
      console.error('❌ Failed to initialize components:', error.message);
      throw error;
    }
  }

  /**
   * Parse command line options
   */
  parseOptions(options) {
    // Default configuration
    const defaultOptions = {
      healthCheck: true,
      scenarios: true,
      errorScenarios: true,
      performance: false, // Skip by default due to time
      validation: true,
      diagnostics: true
    };

    // Override from command line arguments
    const cliOptions = {
      healthCheck: process.argv.includes('--health-check') || !process.argv.includes('--no-health-check'),
      scenarios: process.argv.includes('--scenarios') || !process.argv.includes('--no-scenarios'),
      errorScenarios: process.argv.includes('--error-scenarios') || !process.argv.includes('--no-error-scenarios'),
      performance: process.argv.includes('--performance'),
      validation: process.argv.includes('--validation') || !process.argv.includes('--no-validation'),
      diagnostics: process.argv.includes('--diagnostics') || !process.argv.includes('--no-diagnostics')
    };

    // Special flags
    if (process.argv.includes('--all')) {
      Object.keys(cliOptions).forEach(key => {
        cliOptions[key] = true;
      });
    }

    if (process.argv.includes('--quick')) {
      cliOptions.performance = false;
      cliOptions.errorScenarios = false;
    }

    return {
      ...defaultOptions,
      ...options,
      ...cliOptions
    };
  }

  /**
   * Run health check test suite
   * Implements Requirement 9.1: Health check endpoints for all services
   */
  async runHealthCheckSuite() {
    console.log('🏥 Running Health Check Test Suite...\n');
    
    const startTime = Date.now();
    const suite = {
      name: 'Health Check Tests',
      startTime: new Date(),
      tests: [],
      status: 'running'
    };

    try {
      // Run comprehensive health check
      console.log('  🔍 Checking AWS service connectivity...');
      const healthResults = await this.healthCheck.runFullHealthCheck();
      
      // Generate connectivity report
      const connectivityReport = this.reporter.generateReport(healthResults);
      
      // Process results into test format
      healthResults.forEach(result => {
        suite.tests.push({
          name: `Health Check: ${result.service}`,
          status: result.status === 'healthy' ? 'passed' : 'failed',
          duration: result.responseTime,
          details: result,
          error: result.error
        });
      });

      // Save connectivity report
      await this.reporter.saveReport(connectivityReport, `connectivity-report-${Date.now()}.json`);

      // Determine overall suite status
      const failedTests = suite.tests.filter(t => t.status === 'failed');
      suite.status = failedTests.length === 0 ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      suite.connectivityReport = connectivityReport;

      console.log(`  ${suite.status === 'passed' ? '✅' : '❌'} Health Check Suite: ${suite.status}`);
      console.log(`  Services tested: ${suite.tests.length}`);
      console.log(`  Failed: ${failedTests.length}`);
      console.log(`  Average response time: ${connectivityReport.summary.averageResponseTime}ms\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`  ❌ Health Check Suite failed: ${error.message}\n`);
    }

    this.results.testSuites.healthCheck = suite;
    this.updateSummary(suite);
  }

  /**
   * Run scenario test suite
   * Implements Requirement 9.2: Test scenarios for major workflow validation
   */
  async runScenarioSuite() {
    console.log('🧪 Running Scenario Test Suite...\n');
    
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
          console.log(`  🧪 Running scenario: ${scenarioName}...`);
          const result = await this.framework.runTestScenario(scenarioName);
          
          suite.tests.push({
            name: `Scenario: ${result.name}`,
            status: result.status,
            duration: result.duration,
            details: result,
            error: result.error
          });
          
          console.log(`    ${result.status === 'passed' ? '✅' : '❌'} ${result.name}: ${result.status} (${result.duration}ms)`);
          
        } catch (error) {
          suite.tests.push({
            name: `Scenario: ${scenarioName}`,
            status: 'error',
            duration: 0,
            error: error.message
          });
          
          console.log(`    ❌ ${scenarioName}: error - ${error.message}`);
        }
      }

      // Determine overall suite status
      const failedTests = suite.tests.filter(t => t.status !== 'passed');
      suite.status = failedTests.length === 0 ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();

      console.log(`  ${suite.status === 'passed' ? '✅' : '❌'} Scenario Suite: ${suite.status}`);
      console.log(`  Scenarios tested: ${suite.tests.length}`);
      console.log(`  Failed: ${failedTests.length}\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`  ❌ Scenario Suite failed: ${error.message}\n`);
    }

    this.results.testSuites.scenarios = suite;
    this.updateSummary(suite);
  }

  /**
   * Run error scenario test suite
   * Implements Requirement 9.5: Error scenario testing for validation of error handling
   */
  async runErrorScenarioSuite() {
    console.log('⚠️ Running Error Scenario Test Suite...\n');
    
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
          console.log(`  ⚠️ Running error scenario: ${scenarioName}...`);
          const result = await this.framework.runErrorScenario(scenarioName);
          
          suite.tests.push({
            name: `Error Scenario: ${result.name}`,
            status: result.status,
            duration: result.duration,
            details: result,
            error: result.error
          });
          
          console.log(`    ${result.status === 'passed' ? '✅' : '❌'} ${result.name}: ${result.status} (${result.duration}ms)`);
          
        } catch (error) {
          suite.tests.push({
            name: `Error Scenario: ${scenarioName}`,
            status: 'error',
            duration: 0,
            error: error.message
          });
          
          console.log(`    ❌ ${scenarioName}: error - ${error.message}`);
        }
      }

      // Determine overall suite status
      const failedTests = suite.tests.filter(t => t.status !== 'passed');
      suite.status = failedTests.length === 0 ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();

      console.log(`  ${suite.status === 'passed' ? '✅' : '❌'} Error Scenario Suite: ${suite.status}`);
      console.log(`  Error scenarios tested: ${suite.tests.length}`);
      console.log(`  Failed: ${failedTests.length}\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`  ❌ Error Scenario Suite failed: ${error.message}\n`);
    }

    this.results.testSuites.errorScenarios = suite;
    this.updateSummary(suite);
  }

  /**
   * Run performance test suite
   * Implements Requirement 9.4: Performance testing with realistic data loads
   */
  async runPerformanceSuite() {
    console.log('⚡ Running Performance Test Suite...\n');
    
    const startTime = Date.now();
    const suite = {
      name: 'Performance Tests',
      startTime: new Date(),
      tests: [],
      status: 'running'
    };

    try {
      // Run lighter performance tests for comprehensive framework
      const performanceTests = ['singleUserBaseline', 'lightLoad'];
      
      for (const testName of performanceTests) {
        try {
          console.log(`  ⚡ Running performance test: ${testName}...`);
          const result = await this.framework.runPerformanceTest(testName);
          
          suite.tests.push({
            name: `Performance: ${result.name}`,
            status: result.status,
            duration: result.duration,
            details: result,
            error: result.error
          });
          
          console.log(`    ${result.status === 'passed' ? '✅' : '❌'} ${result.name}: ${result.status}`);
          if (result.metrics) {
            console.log(`      Samples: ${result.metrics.samples}, Success Rate: ${result.metrics.successRate.toFixed(1)}%`);
            console.log(`      Response Time (p95): ${result.metrics.responseTime.p95}ms`);
          }
          
        } catch (error) {
          suite.tests.push({
            name: `Performance: ${testName}`,
            status: 'error',
            duration: 0,
            error: error.message
          });
          
          console.log(`    ❌ ${testName}: error - ${error.message}`);
        }
      }

      // Determine overall suite status
      const failedTests = suite.tests.filter(t => t.status !== 'passed');
      suite.status = failedTests.length === 0 ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();

      console.log(`  ${suite.status === 'passed' ? '✅' : '❌'} Performance Suite: ${suite.status}`);
      console.log(`  Performance tests run: ${suite.tests.length}`);
      console.log(`  Failed: ${failedTests.length}\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`  ❌ Performance Suite failed: ${error.message}\n`);
    }

    this.results.testSuites.performance = suite;
    this.updateSummary(suite);
  }

  /**
   * Run validation test suite
   * Implements Requirement 9.6: Automated validation tests for deployment verification
   */
  async runValidationSuite() {
    console.log('✅ Running Validation Test Suite...\n');
    
    const startTime = Date.now();
    const suite = {
      name: 'Validation Tests',
      startTime: new Date(),
      tests: [],
      status: 'running'
    };

    try {
      const validationSuites = ['preDeployment', 'postDeployment'];
      
      for (const suiteName of validationSuites) {
        try {
          console.log(`  ✅ Running validation suite: ${suiteName}...`);
          const result = await this.framework.runValidationSuite(suiteName);
          
          suite.tests.push({
            name: `Validation: ${result.name}`,
            status: result.status,
            duration: result.duration,
            details: result,
            error: result.error
          });
          
          console.log(`    ${result.status === 'passed' ? '✅' : '❌'} ${result.name}: ${result.status}`);
          console.log(`      Pass Rate: ${result.summary.passRate.toFixed(1)}% (${result.summary.passed}/${result.summary.total})`);
          
        } catch (error) {
          suite.tests.push({
            name: `Validation: ${suiteName}`,
            status: 'error',
            duration: 0,
            error: error.message
          });
          
          console.log(`    ❌ ${suiteName}: error - ${error.message}`);
        }
      }

      // Determine overall suite status
      const failedTests = suite.tests.filter(t => t.status !== 'passed');
      suite.status = failedTests.length === 0 ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();

      console.log(`  ${suite.status === 'passed' ? '✅' : '❌'} Validation Suite: ${suite.status}`);
      console.log(`  Validation suites run: ${suite.tests.length}`);
      console.log(`  Failed: ${failedTests.length}\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`  ❌ Validation Suite failed: ${error.message}\n`);
    }

    this.results.testSuites.validation = suite;
    this.updateSummary(suite);
  }

  /**
   * Run diagnostic test suite
   * Implements Requirement 9.3: Diagnostic tools for troubleshooting issues
   */
  async runDiagnosticSuite() {
    console.log('🔍 Running Diagnostic Test Suite...\n');
    
    const startTime = Date.now();
    const suite = {
      name: 'Diagnostic Tests',
      startTime: new Date(),
      tests: [],
      status: 'running'
    };

    try {
      console.log('  🔍 Running comprehensive diagnostics...');
      
      // Run comprehensive diagnostics
      const diagnosticReport = await this.diagnostic.runDiagnostics();
      
      // Save diagnostic report
      const reportPath = await this.diagnostic.saveDiagnosticReport(
        diagnosticReport, 
        `diagnostic-report-${Date.now()}.json`
      );
      
      // Display diagnostic summary
      this.diagnostic.displayDiagnosticSummary(diagnosticReport);
      
      suite.tests.push({
        name: 'Comprehensive Diagnostics',
        status: diagnosticReport.summary.overallHealth === 'healthy' ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: {
          overallHealth: diagnosticReport.summary.overallHealth,
          criticalIssues: diagnosticReport.summary.criticalIssues,
          warnings: diagnosticReport.summary.warnings,
          reportPath: reportPath
        }
      });

      suite.status = diagnosticReport.summary.overallHealth === 'healthy' ? 'passed' : 'failed';
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      suite.diagnosticReport = diagnosticReport;

      console.log(`  ${suite.status === 'passed' ? '✅' : '❌'} Diagnostic Suite: ${suite.status}`);
      console.log(`  Overall Health: ${diagnosticReport.summary.overallHealth}`);
      console.log(`  Critical Issues: ${diagnosticReport.summary.criticalIssues}`);
      console.log(`  Warnings: ${diagnosticReport.summary.warnings}\n`);

    } catch (error) {
      suite.status = 'error';
      suite.error = error.message;
      suite.duration = Date.now() - startTime;
      suite.endTime = new Date();
      
      console.log(`  ❌ Diagnostic Suite failed: ${error.message}\n`);
    }

    this.results.testSuites.diagnostics = suite;
    this.updateSummary(suite);
  }

  /**
   * Update summary statistics
   */
  updateSummary(suite) {
    this.results.summary.total++;
    
    switch (suite.status) {
      case 'passed':
        this.results.summary.passed++;
        break;
      case 'failed':
        this.results.summary.failed++;
        break;
      case 'error':
        this.results.summary.errors++;
        break;
      case 'skipped':
        this.results.summary.skipped++;
        break;
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateComprehensiveReport() {
    console.log('📊 Generating Comprehensive Test Report...\n');
    
    try {
      const report = {
        metadata: {
          timestamp: this.results.timestamp.toISOString(),
          version: '1.0.0',
          framework: 'AWS Opportunity Analysis Comprehensive Testing Framework',
          environment: process.env.NODE_ENV || 'development',
          region: process.env.AWS_REGION || 'us-east-1'
        },
        summary: this.results.summary,
        testSuites: this.results.testSuites,
        errors: this.results.errors,
        recommendations: this.generateRecommendations(),
        nextSteps: this.generateNextSteps()
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

      // Also save a summary report in markdown format
      const summaryPath = path.join(reportsDir, `test-summary-${Date.now()}.md`);
      await this.generateMarkdownSummary(report, summaryPath);
      
      console.log(`✅ Test summary saved to: ${summaryPath}`);

    } catch (error) {
      console.error(`❌ Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Analyze test results and generate recommendations
    Object.values(this.results.testSuites).forEach(suite => {
      if (suite.status === 'failed') {
        recommendations.push({
          priority: 'High',
          category: 'Test Failure',
          issue: `${suite.name} failed`,
          action: `Address failures in ${suite.name} before proceeding`,
          details: suite.error || 'Check individual test results for details'
        });
      }
      
      if (suite.status === 'error') {
        recommendations.push({
          priority: 'Critical',
          category: 'System Error',
          issue: `${suite.name} encountered errors`,
          action: `Fix system errors in ${suite.name}`,
          details: suite.error || 'Check error logs for details'
        });
      }
    });

    // Overall recommendations
    if (this.results.summary.failed === 0 && this.results.summary.errors === 0) {
      recommendations.push({
        priority: 'Info',
        category: 'Success',
        issue: 'All tests passed successfully',
        action: 'System is ready for production deployment',
        details: 'Consider running performance tests for production readiness'
      });
    } else {
      recommendations.push({
        priority: 'High',
        category: 'Action Required',
        issue: 'Some tests failed or encountered errors',
        action: 'Fix failing tests before deploying to production',
        details: 'Review error logs and diagnostic reports for detailed troubleshooting'
      });
    }

    return recommendations;
  }

  /**
   * Generate next steps based on results
   */
  generateNextSteps() {
    const nextSteps = [];
    
    if (this.results.summary.failed > 0 || this.results.summary.errors > 0) {
      nextSteps.push('1. Review failed tests and error details');
      nextSteps.push('2. Fix identified issues');
      nextSteps.push('3. Re-run tests after implementing fixes');
      nextSteps.push('4. Review diagnostic reports for system optimization');
    } else {
      nextSteps.push('1. Review performance test results');
      nextSteps.push('2. Set up continuous monitoring and alerting');
      nextSteps.push('3. Schedule regular health checks');
      nextSteps.push('4. Proceed with production deployment');
    }
    
    nextSteps.push('5. Implement automated testing in CI/CD pipeline');
    nextSteps.push('6. Set up regular diagnostic reports');
    
    return nextSteps;
  }

  /**
   * Generate markdown summary report
   */
  async generateMarkdownSummary(report, filePath) {
    const markdown = `# Comprehensive Testing Framework Report

## Summary

- **Timestamp**: ${new Date(report.metadata.timestamp).toLocaleString()}
- **Environment**: ${report.metadata.environment}
- **AWS Region**: ${report.metadata.region}
- **Overall Status**: ${this.results.summary.failed === 0 && this.results.summary.errors === 0 ? '✅ PASSED' : '❌ FAILED'}

## Test Suite Results

| Suite | Status | Duration | Tests |
|-------|--------|----------|-------|
${Object.entries(report.testSuites).map(([name, suite]) => 
  `| ${suite.name} | ${this.getStatusIcon(suite.status)} ${suite.status} | ${suite.duration}ms | ${suite.tests?.length || 0} |`
).join('\n')}

## Statistics

- **Total Suites**: ${report.summary.total}
- **✅ Passed**: ${report.summary.passed}
- **❌ Failed**: ${report.summary.failed}
- **💥 Errors**: ${report.summary.errors}
- **⏭️ Skipped**: ${report.summary.skipped}

## Recommendations

${report.recommendations.map((rec, index) => 
  `${index + 1}. **[${rec.priority}]** ${rec.issue}\n   - Action: ${rec.action}\n   - Details: ${rec.details}`
).join('\n\n')}

## Next Steps

${report.nextSteps.map((step, index) => `${step}`).join('\n')}

---
*Generated by AWS Opportunity Analysis Comprehensive Testing Framework*
`;

    await fs.writeFile(filePath, markdown);
  }

  /**
   * Display final summary
   */
  displayFinalSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE TESTING FRAMEWORK SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`📅 Execution Time: ${this.results.timestamp.toLocaleString()}`);
    console.log(`🏁 Overall Status: ${this.results.summary.failed === 0 && this.results.summary.errors === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    
    console.log('\n📈 Test Suite Results:');
    console.log(`  Total Suites: ${this.results.summary.total}`);
    console.log(`  ✅ Passed: ${this.results.summary.passed}`);
    console.log(`  ❌ Failed: ${this.results.summary.failed}`);
    console.log(`  💥 Errors: ${this.results.summary.errors}`);
    console.log(`  ⏭️ Skipped: ${this.results.summary.skipped}`);
    
    console.log('\n📋 Suite Details:');
    Object.entries(this.results.testSuites).forEach(([name, suite]) => {
      const statusIcon = this.getStatusIcon(suite.status);
      console.log(`  ${statusIcon} ${suite.name}: ${suite.status} (${suite.duration}ms)`);
      
      if (suite.tests && suite.tests.length > 0) {
        const failedTests = suite.tests.filter(t => t.status !== 'passed');
        if (failedTests.length > 0) {
          console.log(`    Failed tests: ${failedTests.length}/${suite.tests.length}`);
        }
      }
    });
    
    if (this.results.errors.length > 0) {
      console.log('\n⚠️ Framework Errors:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.phase}: ${error.error}`);
      });
    }
    
    console.log('\n💡 Key Recommendations:');
    const recommendations = this.generateRecommendations();
    recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.priority}] ${rec.action}`);
    });
    
    console.log('\n📋 Next Steps:');
    const nextSteps = this.generateNextSteps();
    nextSteps.slice(0, 4).forEach((step, index) => {
      console.log(`  ${step}`);
    });
    
    console.log('='.repeat(80));
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    const icons = {
      passed: '✅',
      failed: '❌',
      error: '💥',
      skipped: '⏭️',
      running: '🔄'
    };
    return icons[status] || '❓';
  }
}

// CLI interface
async function main() {
  const framework = new ComprehensiveTestingFramework();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
AWS Opportunity Analysis - Comprehensive Testing Framework

Usage: node run-comprehensive-testing-framework.js [options]

Options:
  --health-check      Run health check tests (default: true)
  --scenarios         Run scenario tests (default: true)
  --error-scenarios   Run error scenario tests (default: true)
  --performance       Run performance tests (default: false)
  --validation        Run validation tests (default: true)
  --diagnostics       Run diagnostic tests (default: true)
  
  --all               Run all tests including performance tests
  --quick             Run only essential tests (skip performance and error scenarios)
  
  --no-health-check   Skip health check tests
  --no-scenarios      Skip scenario tests
  --no-error-scenarios Skip error scenario tests
  --no-validation     Skip validation tests
  --no-diagnostics    Skip diagnostic tests
  
  --help, -h          Show this help message

Examples:
  node run-comprehensive-testing-framework.js                    # Run standard test suite
  node run-comprehensive-testing-framework.js --all              # Run all tests including performance
  node run-comprehensive-testing-framework.js --quick            # Run only essential tests
  node run-comprehensive-testing-framework.js --health-check     # Run only health check tests
  node run-comprehensive-testing-framework.js --performance      # Include performance tests
    `);
    process.exit(0);
  }
  
  try {
    const success = await framework.run();
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

module.exports = { ComprehensiveTestingFramework };