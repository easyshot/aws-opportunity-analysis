#!/usr/bin/env node

/**
 * Comprehensive AWS Connectivity Test Runner
 * 
 * Orchestrates all connectivity validation tests and provides
 * a unified interface for running different test suites.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class ConnectivityTestRunner {
  constructor() {
    this.testSuites = {
      'full': {
        name: 'Full Connectivity Validation',
        description: 'Complete validation of all AWS services',
        script: 'validate-aws-connectivity.js',
        timeout: 120000 // 2 minutes
      },
      'bedrock': {
        name: 'Bedrock Services Validation',
        description: 'Focused validation of AWS Bedrock services',
        script: 'validate-bedrock-connectivity.js',
        timeout: 60000 // 1 minute
      },
      'lambda': {
        name: 'Lambda Functions Validation',
        description: 'Validation of Lambda function connectivity and performance',
        script: 'validate-lambda-functions.js',
        timeout: 90000 // 1.5 minutes
      },
      'infrastructure': {
        name: 'Infrastructure Validation',
        description: 'Comprehensive infrastructure readiness assessment',
        script: 'validate-infrastructure.js',
        timeout: 150000 // 2.5 minutes
      }
    };
  }

  async runTests(suiteNames = ['full']) {
    console.log('🧪 AWS Connectivity Test Runner');
    console.log('===============================\n');

    const results = [];
    
    for (const suiteName of suiteNames) {
      const suite = this.testSuites[suiteName];
      
      if (!suite) {
        console.error(`❌ Unknown test suite: ${suiteName}`);
        console.log(`Available suites: ${Object.keys(this.testSuites).join(', ')}`);
        continue;
      }

      console.log(`🔍 Running ${suite.name}...`);
      console.log(`   ${suite.description}`);
      console.log('─'.repeat(50));

      const result = await this.runTestSuite(suite);
      results.push({ suite: suiteName, ...result });

      console.log(''); // Add spacing between test suites
    }

    // Display summary
    this.displaySummary(results);
    
    // Save combined results
    await this.saveCombinedResults(results);

    // Return overall success
    return results.every(r => r.success);
  }

  async runTestSuite(suite) {
    const scriptPath = path.join(__dirname, suite.script);
    
    try {
      // Check if script exists
      await fs.access(scriptPath);
    } catch (error) {
      console.error(`❌ Test script not found: ${suite.script}`);
      return { success: false, error: 'Script not found', duration: 0 };
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const child = spawn('node', [scriptPath], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      // Set timeout
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        console.error(`⏰ Test suite timed out after ${suite.timeout / 1000}s`);
        resolve({ 
          success: false, 
          error: 'Timeout', 
          duration: Date.now() - startTime 
        });
      }, suite.timeout);

      child.on('close', (code) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          console.log(`✅ ${suite.name} completed successfully (${duration}ms)`);
          resolve({ success: true, duration });
        } else {
          console.log(`❌ ${suite.name} failed with exit code ${code} (${duration}ms)`);
          resolve({ success: false, error: `Exit code ${code}`, duration });
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`❌ Failed to run ${suite.name}: ${error.message}`);
        resolve({ 
          success: false, 
          error: error.message, 
          duration: Date.now() - startTime 
        });
      });
    });
  }

  displaySummary(results) {
    console.log('📋 TEST SUMMARY');
    console.log('===============');
    
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total Test Suites: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log('');

    // Detailed results
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      const suite = this.testSuites[result.suite];
      console.log(`${icon} ${suite.name}: ${result.success ? 'PASSED' : 'FAILED'} (${Math.round(result.duration / 1000)}s)`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('');

    // Overall status
    if (passedTests === totalTests) {
      console.log('🎉 All connectivity tests passed! AWS services are ready.');
    } else {
      console.log('⚠️  Some connectivity tests failed. Review the results above.');
    }
  }

  async saveCombinedResults(results) {
    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      
      // Create reports directory if it doesn't exist
      try {
        await fs.access(reportsDir);
      } catch {
        await fs.mkdir(reportsDir, { recursive: true });
      }

      const combinedReport = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        region: process.env.AWS_REGION || 'us-east-1',
        testRunner: 'connectivity-test-runner',
        summary: {
          totalSuites: results.length,
          passedSuites: results.filter(r => r.success).length,
          failedSuites: results.filter(r => !r.success).length,
          totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
        },
        results: results.map(result => ({
          suite: result.suite,
          name: this.testSuites[result.suite].name,
          success: result.success,
          duration: result.duration,
          error: result.error || null
        }))
      };

      const reportPath = path.join(reportsDir, 'connectivity-test-summary.json');
      await fs.writeFile(reportPath, JSON.stringify(combinedReport, null, 2));
      
      console.log(`📄 Combined test results saved to: ${reportPath}`);
    } catch (error) {
      console.error(`⚠️  Failed to save combined results: ${error.message}`);
    }
  }

  displayHelp() {
    console.log('🧪 AWS Connectivity Test Runner');
    console.log('===============================\n');
    
    console.log('Usage:');
    console.log('  node run-connectivity-tests.js [suite1] [suite2] ...\n');
    
    console.log('Available test suites:');
    Object.entries(this.testSuites).forEach(([key, suite]) => {
      console.log(`  ${key.padEnd(15)} - ${suite.description}`);
    });
    
    console.log('\nExamples:');
    console.log('  node run-connectivity-tests.js                    # Run full validation');
    console.log('  node run-connectivity-tests.js bedrock lambda     # Run specific suites');
    console.log('  node run-connectivity-tests.js infrastructure     # Run infrastructure check');
    console.log('');
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    const runner = new ConnectivityTestRunner();
    runner.displayHelp();
    return;
  }

  const testSuites = args.length > 0 ? args : ['full'];
  const runner = new ConnectivityTestRunner();
  
  try {
    const success = await runner.runTests(testSuites);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Fatal error in test runner:', error.message);
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Test runner interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test runner terminated');
  process.exit(143);
});

if (require.main === module) {
  main();
}

module.exports = { ConnectivityTestRunner };