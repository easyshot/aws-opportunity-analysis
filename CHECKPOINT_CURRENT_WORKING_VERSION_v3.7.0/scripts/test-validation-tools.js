#!/usr/bin/env node

/**
 * Test Script for Validation Tools
 * 
 * This script tests the validation tools themselves to ensure they're working correctly.
 * It performs basic functionality tests without requiring actual AWS connectivity.
 */

const fs = require('fs').promises;
const path = require('path');

class ValidationToolsTester {
  constructor() {
    this.testResults = [];
  }

  async runTests() {
    console.log('🧪 Testing AWS Connectivity Validation Tools');
    console.log('============================================\n');

    try {
      // Test 1: Check if all validation scripts exist
      await this.testScriptExistence();

      // Test 2: Check if required dependencies are available
      await this.testDependencies();

      // Test 3: Check if configuration files exist
      await this.testConfigurationFiles();

      // Test 4: Test report generation capabilities
      await this.testReportGeneration();

      // Display results
      this.displayTestResults();

      const allPassed = this.testResults.every(r => r.passed);
      return allPassed;

    } catch (error) {
      console.error('❌ Fatal error during validation tool testing:', error.message);
      return false;
    }
  }

  async testScriptExistence() {
    console.log('1. Testing validation script existence...');
    
    const requiredScripts = [
      'validate-aws-connectivity.js',
      'validate-bedrock-connectivity.js',
      'validate-lambda-functions.js',
      'validate-infrastructure.js',
      'validate-security.js',
      'run-connectivity-tests.js'
    ];

    const scriptTests = [];

    for (const script of requiredScripts) {
      const scriptPath = path.join(__dirname, script);
      try {
        await fs.access(scriptPath);
        scriptTests.push({
          name: `Script: ${script}`,
          passed: true,
          message: 'Script file exists'
        });
      } catch (error) {
        scriptTests.push({
          name: `Script: ${script}`,
          passed: false,
          message: 'Script file missing'
        });
      }
    }

    this.testResults.push({
      category: 'Script Existence',
      passed: scriptTests.every(t => t.passed),
      tests: scriptTests
    });
  }

  async testDependencies() {
    console.log('2. Testing required dependencies...');
    
    const requiredModules = [
      '../lib/health-check-service',
      '../lib/connectivity-reporter',
      '../config/aws-config-v3'
    ];

    const dependencyTests = [];

    for (const module of requiredModules) {
      try {
        require(module);
        dependencyTests.push({
          name: `Module: ${module}`,
          passed: true,
          message: 'Module can be loaded'
        });
      } catch (error) {
        dependencyTests.push({
          name: `Module: ${module}`,
          passed: false,
          message: `Module load failed: ${error.message}`
        });
      }
    }

    this.testResults.push({
      category: 'Dependencies',
      passed: dependencyTests.every(t => t.passed),
      tests: dependencyTests
    });
  }

  async testConfigurationFiles() {
    console.log('3. Testing configuration files...');
    
    const configFiles = [
      { path: '.env.template', required: true },
      { path: '.env', required: false },
      { path: 'config/aws-config-v3.js', required: true },
      { path: 'package.json', required: true }
    ];

    const configTests = [];

    for (const config of configFiles) {
      try {
        await fs.access(config.path);
        configTests.push({
          name: `Config: ${config.path}`,
          passed: true,
          message: 'Configuration file exists'
        });
      } catch (error) {
        configTests.push({
          name: `Config: ${config.path}`,
          passed: !config.required,
          message: config.required ? 'Required configuration file missing' : 'Optional configuration file missing'
        });
      }
    }

    this.testResults.push({
      category: 'Configuration Files',
      passed: configTests.every(t => t.passed),
      tests: configTests
    });
  }

  async testReportGeneration() {
    console.log('4. Testing report generation capabilities...');
    
    const reportTests = [];

    // Test reports directory
    try {
      await fs.access('reports');
      reportTests.push({
        name: 'Reports Directory',
        passed: true,
        message: 'Reports directory exists'
      });
    } catch (error) {
      reportTests.push({
        name: 'Reports Directory',
        passed: false,
        message: 'Reports directory missing'
      });
    }

    // Test ConnectivityReporter class
    try {
      const { ConnectivityReporter } = require('../lib/connectivity-reporter');
      const reporter = new ConnectivityReporter();
      
      // Test report generation with mock data
      const mockResults = [
        {
          service: 'Test Service',
          status: 'healthy',
          responseTime: 100,
          lastChecked: new Date(),
          details: { test: true },
          checks: [
            { name: 'Test Check', passed: true, message: 'Test passed' }
          ]
        }
      ];

      const report = reporter.generateReport(mockResults);
      
      reportTests.push({
        name: 'Report Generation',
        passed: !!report && !!report.summary,
        message: 'Can generate reports from mock data'
      });
    } catch (error) {
      reportTests.push({
        name: 'Report Generation',
        passed: false,
        message: `Report generation failed: ${error.message}`
      });
    }

    this.testResults.push({
      category: 'Report Generation',
      passed: reportTests.every(t => t.passed),
      tests: reportTests
    });
  }

  displayTestResults() {
    console.log('\n📋 VALIDATION TOOLS TEST RESULTS');
    console.log('─'.repeat(50));

    this.testResults.forEach(result => {
      const statusIcon = result.passed ? '✅' : '❌';
      console.log(`\n${statusIcon} ${result.category}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      
      if (result.tests) {
        result.tests.forEach(test => {
          const testIcon = test.passed ? '  ✓' : '  ✗';
          console.log(`${testIcon} ${test.name}: ${test.message}`);
        });
      }
    });

    // Overall summary
    const totalCategories = this.testResults.length;
    const passedCategories = this.testResults.filter(r => r.passed).length;
    
    console.log('\n📊 SUMMARY');
    console.log('─'.repeat(20));
    console.log(`Total Test Categories: ${totalCategories}`);
    console.log(`Passed: ${passedCategories}`);
    console.log(`Failed: ${totalCategories - passedCategories}`);
    
    if (passedCategories === totalCategories) {
      console.log('\n🎉 All validation tools are ready for use!');
      console.log('\nNext steps:');
      console.log('1. Configure your .env file with AWS credentials');
      console.log('2. Run: npm run validate:aws');
      console.log('3. Review the generated reports in the reports/ directory');
    } else {
      console.log('\n⚠️  Some validation tools have issues that need attention.');
      console.log('Please resolve the failed tests before using the validation system.');
    }
  }
}

async function testValidationTools() {
  const tester = new ValidationToolsTester();
  const success = await tester.runTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  testValidationTools().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { ValidationToolsTester, testValidationTools };