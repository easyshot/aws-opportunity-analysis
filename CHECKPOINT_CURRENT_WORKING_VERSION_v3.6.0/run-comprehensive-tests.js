#!/usr/bin/env node

/**
 * Comprehensive Test Runner for AWS Opportunity Analysis Application
 * Orchestrates all types of testing including unit, integration, security, performance, and contract tests
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  targetUrl: process.env.TARGET_URL || 'http://localhost:8123',
  testTimeout: parseInt(process.env.TEST_TIMEOUT) || 300000, // 5 minutes
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 10,
  testDuration: parseInt(process.env.TEST_DURATION) || 60, // seconds
  skipSlowTests: process.env.SKIP_SLOW_TESTS === 'true',
  outputDir: process.env.TEST_OUTPUT_DIR || 'test-results',
  reportFormat: process.env.REPORT_FORMAT || 'json'
};

// Test suites configuration
const testSuites = {
  unit: {
    name: 'Unit Tests',
    command: 'npm',
    args: ['test'],
    timeout: 60000,
    required: true
  },
  security: {
    name: 'Security Tests',
    command: 'node',
    args: ['tests/security-tests.js'],
    timeout: 120000,
    required: true
  },
  contract: {
    name: 'Contract Tests',
    command: 'node',
    args: ['tests/contract-tests.js'],
    timeout: 180000,
    required: true
  },
  performance: {
    name: 'Performance Tests',
    command: 'node',
    args: ['tests/performance-tests.js'],
    timeout: 300000,
    required: false,
    skipIf: () => config.skipSlowTests
  },
  loadTest: {
    name: 'Load Tests',
    command: 'artillery',
    args: ['run', 'tests/load-test-config.yml'],
    timeout: 600000,
    required: false,
    skipIf: () => config.skipSlowTests
  }
};

// Results tracking
const testResults = {
  startTime: new Date(),
  endTime: null,
  duration: 0,
  suites: {},
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  },
  errors: []
};

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
}

/**
 * Run a single test suite
 */
function runTestSuite(suiteName, suiteConfig) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running ${suiteConfig.name}...`);
    
    const startTime = Date.now();
    const result = {
      name: suiteConfig.name,
      status: 'running',
      startTime: new Date(startTime),
      endTime: null,
      duration: 0,
      output: '',
      error: null
    };
    
    // Check if test should be skipped
    if (suiteConfig.skipIf && suiteConfig.skipIf()) {
      result.status = 'skipped';
      result.endTime = new Date();
      result.duration = 0;
      console.log(`⏭️  Skipped ${suiteConfig.name}`);
      resolve(result);
      return;
    }
    
    // Set environment variables
    const env = {
      ...process.env,
      TARGET_URL: config.targetUrl,
      CONCURRENT_USERS: config.concurrentUsers.toString(),
      TEST_DURATION: config.testDuration.toString()
    };
    
    // Spawn test process
    const testProcess = spawn(suiteConfig.command, suiteConfig.args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    testProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });
    
    testProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });
    
    // Set timeout
    const timeout = setTimeout(() => {
      testProcess.kill('SIGTERM');
      result.status = 'timeout';
      result.error = `Test suite timed out after ${suiteConfig.timeout}ms`;
      reject(result);
    }, suiteConfig.timeout);
    
    testProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      const endTime = Date.now();
      result.endTime = new Date(endTime);
      result.duration = endTime - startTime;
      result.output = stdout;
      
      if (code === 0) {
        result.status = 'passed';
        console.log(`✅ ${suiteConfig.name} passed (${result.duration}ms)`);
      } else {
        result.status = 'failed';
        result.error = stderr || `Process exited with code ${code}`;
        console.log(`❌ ${suiteConfig.name} failed (${result.duration}ms)`);
      }
      
      resolve(result);
    });
    
    testProcess.on('error', (error) => {
      clearTimeout(timeout);
      result.status = 'error';
      result.error = error.message;
      result.endTime = new Date();
      result.duration = Date.now() - startTime;
      reject(result);
    });
  });
}

/**
 * Check if target application is running
 */
function checkApplicationHealth() {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Checking application health at ${config.targetUrl}...`);
    
    const healthCheck = spawn('curl', ['-f', '-s', `${config.targetUrl}/api/health`], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    healthCheck.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Application is healthy');
        resolve();
      } else {
        console.log('❌ Application health check failed');
        reject(new Error('Application is not responding'));
      }
    });
    
    healthCheck.on('error', (error) => {
      console.log('❌ Health check error:', error.message);
      reject(error);
    });
  });
}

/**
 * Generate test report
 */
function generateReport() {
  const report = {
    ...testResults,
    config,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      targetUrl: config.targetUrl
    }
  };
  
  // Calculate summary
  Object.values(testResults.suites).forEach(suite => {
    testResults.summary.total++;
    switch (suite.status) {
      case 'passed':
        testResults.summary.passed++;
        break;
      case 'failed':
      case 'error':
      case 'timeout':
        testResults.summary.failed++;
        break;
      case 'skipped':
        testResults.summary.skipped++;
        break;
    }
  });
  
  // Save report
  const reportPath = path.join(config.outputDir, `test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📊 Test report saved to: ${reportPath}`);
  
  return report;
}

/**
 * Display test summary
 */
function displaySummary(report) {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 TEST EXECUTION SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`📅 Start Time: ${report.startTime.toISOString()}`);
  console.log(`📅 End Time: ${report.endTime.toISOString()}`);
  console.log(`⏱️  Duration: ${Math.round(report.duration / 1000)}s`);
  console.log(`🎯 Target URL: ${config.targetUrl}`);
  
  console.log('\n📈 Results:');
  console.log(`  Total Suites: ${report.summary.total}`);
  console.log(`  ✅ Passed: ${report.summary.passed}`);
  console.log(`  ❌ Failed: ${report.summary.failed}`);
  console.log(`  ⏭️  Skipped: ${report.summary.skipped}`);
  
  console.log('\n📋 Suite Details:');
  Object.entries(report.suites).forEach(([name, suite]) => {
    const statusIcon = {
      passed: '✅',
      failed: '❌',
      error: '💥',
      timeout: '⏰',
      skipped: '⏭️'
    }[suite.status] || '❓';
    
    console.log(`  ${statusIcon} ${suite.name}: ${suite.status} (${suite.duration}ms)`);
    if (suite.error) {
      console.log(`    Error: ${suite.error}`);
    }
  });
  
  if (report.summary.failed > 0) {
    console.log('\n⚠️  Some tests failed. Please review the results above.');
    console.log('💡 Consider running individual test suites for more detailed output.');
  } else {
    console.log('\n🎉 All tests passed successfully!');
  }
  
  console.log('='.repeat(80));
}

/**
 * Main test execution function
 */
async function runTests() {
  console.log('🚀 Starting Comprehensive Test Suite');
  console.log(`🎯 Target: ${config.targetUrl}`);
  console.log(`📁 Output: ${config.outputDir}`);
  
  ensureOutputDir();
  
  try {
    // Check application health first
    await checkApplicationHealth();
    
    // Run test suites
    for (const [suiteName, suiteConfig] of Object.entries(testSuites)) {
      try {
        const result = await runTestSuite(suiteName, suiteConfig);
        testResults.suites[suiteName] = result;
        
        // Stop on critical failures if required
        if (result.status === 'failed' && suiteConfig.required) {
          console.log(`\n💥 Critical test suite failed: ${suiteConfig.name}`);
          if (!process.env.CONTINUE_ON_FAILURE) {
            console.log('🛑 Stopping execution due to critical failure');
            break;
          }
        }
      } catch (error) {
        testResults.suites[suiteName] = error;
        testResults.errors.push({
          suite: suiteName,
          error: error.message || error.toString()
        });
        
        if (suiteConfig.required && !process.env.CONTINUE_ON_FAILURE) {
          console.log('🛑 Stopping execution due to critical error');
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Pre-test setup failed:', error.message);
    testResults.errors.push({
      phase: 'setup',
      error: error.message
    });
  }
  
  // Finalize results
  testResults.endTime = new Date();
  testResults.duration = testResults.endTime.getTime() - testResults.startTime.getTime();
  
  // Generate and display report
  const report = generateReport();
  displaySummary(report);
  
  // Exit with appropriate code
  const exitCode = report.summary.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  process.exit(143);
});

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  config,
  testSuites
};