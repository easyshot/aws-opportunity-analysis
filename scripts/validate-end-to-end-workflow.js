/**
 * End-to-End Workflow Validation Script
 * Purpose: Validate the complete analysis workflow from form submission to response
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

require('dotenv').config();
const axios = require('axios');

// Test configuration
const TEST_CONFIG = {
  backendUrl: 'http://localhost:8123',
  frontendUrl: 'http://localhost:3123',
  timeout: 60000, // 60 seconds
  retryAttempts: 3,
  retryDelay: 2000 // 2 seconds
};

// Test scenarios
const TEST_SCENARIOS = {
  basic: {
    name: "Basic Opportunity Analysis",
    data: {
      CustomerName: "Test Customer Corp",
      region: "United States",
      closeDate: "2025-06-15",
      oppName: "Cloud Migration Initiative",
      oppDescription: "Large enterprise looking to migrate their on-premises infrastructure to AWS cloud services. They have 500+ servers, multiple databases, and complex networking requirements. The project involves migrating critical business applications, implementing disaster recovery, and establishing cloud governance frameworks.",
      industry: "Technology",
      customerSegment: "Enterprise",
      partnerName: "AWS Partner Solutions"
    }
  },
  novaPremier: {
    name: "Nova Premier Analysis",
    data: {
      CustomerName: "Premium Enterprise Inc",
      region: "Germany",
      closeDate: "2025-08-20",
      oppName: "AI/ML Platform Modernization",
      oppDescription: "Fortune 500 company seeking to build a comprehensive AI/ML platform on AWS. Requirements include real-time data processing, machine learning model training and deployment, advanced analytics, and integration with existing enterprise systems. The solution needs to handle petabyte-scale data processing.",
      industry: "Financial Services",
      customerSegment: "Enterprise",
      partnerName: "AWS Advanced Partner",
      useNovaPremier: true
    }
  },
  complex: {
    name: "Complex Multi-Service Analysis",
    data: {
      CustomerName: "Global Manufacturing Ltd",
      region: "Japan",
      closeDate: "2025-12-31",
      oppName: "IoT and Edge Computing Platform",
      oppDescription: "Manufacturing company implementing IoT sensors across 50+ facilities worldwide. Requires edge computing capabilities, real-time data analytics, predictive maintenance algorithms, supply chain optimization, and integration with existing ERP systems. The platform must support millions of IoT devices and process terabytes of sensor data daily.",
      industry: "Manufacturing",
      customerSegment: "Enterprise",
      partnerName: "AWS IoT Specialist Partner",
      activityFocus: "IoT and Edge Computing",
      businessDescription: "Global manufacturing operations with complex supply chain requirements",
      migrationPhase: "Modernization"
    }
  }
};

class WorkflowValidator {
  constructor() {
    this.results = {
      overall: { passed: 0, failed: 0, errors: [] },
      scenarios: {},
      performance: {},
      errorHandling: {}
    };
  }

  /**
   * Main validation function
   */
  async validateWorkflow() {
    console.log('🚀 Starting End-to-End Workflow Validation');
    console.log('============================================');
    
    try {
      // Step 1: Validate backend health
      await this.validateBackendHealth();
      
      // Step 2: Test each scenario
      for (const [scenarioKey, scenario] of Object.entries(TEST_SCENARIOS)) {
        console.log(`\n📋 Testing Scenario: ${scenario.name}`);
        await this.validateScenario(scenarioKey, scenario);
      }
      
      // Step 3: Test error handling
      await this.validateErrorHandling();
      
      // Step 4: Test performance
      await this.validatePerformance();
      
      // Step 5: Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Critical validation error:', error.message);
      this.results.overall.errors.push(`Critical error: ${error.message}`);
    }
  }

  /**
   * Validate backend health and connectivity
   */
  async validateBackendHealth() {
    console.log('\n🔍 Validating Backend Health...');
    
    try {
      const response = await axios.get(`${TEST_CONFIG.backendUrl}/health`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        console.log('✅ Backend health check passed');
        console.log(`   Status: ${response.data.status}`);
        console.log(`   Mode: ${response.data.mode}`);
        console.log(`   AWS Credentials: ${response.data.environment.hasAwsCredentials ? 'Available' : 'Missing'}`);
        
        // Log service availability
        const services = response.data.services;
        console.log('   Service Status:');
        Object.entries(services).forEach(([service, available]) => {
          console.log(`     ${service}: ${available ? '✅' : '❌'}`);
        });
        
        this.results.overall.passed++;
      } else {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      this.results.overall.failed++;
      this.results.overall.errors.push(`Backend health: ${error.message}`);
    }
  }

  /**
   * Validate a specific test scenario
   */
  async validateScenario(scenarioKey, scenario) {
    const startTime = Date.now();
    
    try {
      console.log(`   📤 Submitting analysis request...`);
      
      const response = await this.submitAnalysisRequest(scenario.data);
      const duration = Date.now() - startTime;
      
      // Validate response structure
      const validation = this.validateAnalysisResponse(response.data, scenario);
      
      this.results.scenarios[scenarioKey] = {
        name: scenario.name,
        passed: validation.passed,
        failed: validation.failed,
        errors: validation.errors,
        duration: duration,
        response: response.data
      };
      
      if (validation.failed === 0) {
        console.log(`   ✅ Scenario passed (${duration}ms)`);
        this.results.overall.passed++;
      } else {
        console.log(`   ❌ Scenario failed with ${validation.failed} errors`);
        validation.errors.forEach(error => console.log(`      - ${error}`));
        this.results.overall.failed++;
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`   ❌ Scenario failed: ${error.message}`);
      
      this.results.scenarios[scenarioKey] = {
        name: scenario.name,
        passed: 0,
        failed: 1,
        errors: [error.message],
        duration: duration,
        response: null
      };
      
      this.results.overall.failed++;
      this.results.overall.errors.push(`${scenario.name}: ${error.message}`);
    }
  }

  /**
   * Submit analysis request with retry logic
   */
  async submitAnalysisRequest(data, attempt = 1) {
    try {
      const response = await axios.post(`${TEST_CONFIG.backendUrl}/api/analyze`, data, {
        timeout: TEST_CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response;
    } catch (error) {
      if (attempt < TEST_CONFIG.retryAttempts && this.isRetryableError(error)) {
        console.log(`   🔄 Retry attempt ${attempt + 1}/${TEST_CONFIG.retryAttempts}`);
        await this.delay(TEST_CONFIG.retryDelay);
        return this.submitAnalysisRequest(data, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Validate analysis response structure and content
   */
  validateAnalysisResponse(response, scenario) {
    const validation = { passed: 0, failed: 0, errors: [] };
    
    // Check response structure
    const requiredFields = [
      'metrics',
      'sections',
      'sessionId',
      'opportunityId',
      'timestamp'
    ];
    
    requiredFields.forEach(field => {
      if (response[field]) {
        validation.passed++;
      } else {
        validation.failed++;
        validation.errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate metrics structure
    if (response.metrics) {
      const requiredMetrics = [
        'predictedArr',
        'predictedMrr',
        'launchDate',
        'predictedProjectDuration',
        'confidence'
      ];
      
      requiredMetrics.forEach(metric => {
        if (response.metrics[metric] && response.metrics[metric] !== 'Error') {
          validation.passed++;
        } else {
          validation.failed++;
          validation.errors.push(`Invalid or missing metric: ${metric}`);
        }
      });
    }
    
    // Validate sections
    if (response.sections && response.sections.similarProjectsRaw) {
      if (response.sections.similarProjectsRaw.includes('Error') || 
          response.sections.similarProjectsRaw.length < 10) {
        validation.failed++;
        validation.errors.push('Similar projects section appears to contain errors or is too short');
      } else {
        validation.passed++;
      }
    }
    
    // Check for fallback mode
    if (response.fallbackMode) {
      validation.errors.push('Response generated in fallback mode - AWS services may not be fully functional');
    }
    
    // Validate Nova Premier specific features
    if (scenario.data.useNovaPremier && !response.fallbackMode) {
      if (response.processingMode !== 'aws-services') {
        validation.failed++;
        validation.errors.push('Nova Premier analysis should use AWS services, not fallback mode');
      } else {
        validation.passed++;
      }
    }
    
    return validation;
  }

  /**
   * Test error handling scenarios
   */
  async validateErrorHandling() {
    console.log('\n🛡️ Validating Error Handling...');
    
    const errorScenarios = [
      {
        name: 'Missing required fields',
        data: { CustomerName: 'Test' }, // Missing required fields
        expectedStatus: 400
      },
      {
        name: 'Invalid date format',
        data: {
          CustomerName: 'Test Customer',
          region: 'United States',
          closeDate: 'invalid-date',
          oppName: 'Test Opportunity',
          oppDescription: 'Test description with sufficient length for validation requirements'
        },
        expectedStatus: 400
      },
      {
        name: 'Empty description',
        data: {
          CustomerName: 'Test Customer',
          region: 'United States',
          closeDate: '2025-06-15',
          oppName: 'Test Opportunity',
          oppDescription: 'Short' // Too short
        },
        expectedStatus: 400
      }
    ];
    
    for (const errorScenario of errorScenarios) {
      try {
        console.log(`   🧪 Testing: ${errorScenario.name}`);
        
        const response = await axios.post(`${TEST_CONFIG.backendUrl}/api/analyze`, errorScenario.data, {
          timeout: 10000,
          validateStatus: () => true // Don't throw on error status codes
        });
        
        if (response.status === errorScenario.expectedStatus) {
          console.log(`   ✅ Error handling correct (${response.status})`);
          this.results.overall.passed++;
        } else {
          console.log(`   ❌ Expected status ${errorScenario.expectedStatus}, got ${response.status}`);
          this.results.overall.failed++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error scenario failed: ${error.message}`);
        this.results.overall.failed++;
      }
    }
  }

  /**
   * Test performance requirements
   */
  async validatePerformance() {
    console.log('\n⚡ Validating Performance...');
    
    const performanceTest = {
      CustomerName: "Performance Test Corp",
      region: "United States",
      closeDate: "2025-07-01",
      oppName: "Performance Test Opportunity",
      oppDescription: "This is a performance test opportunity designed to validate response times and system performance under normal load conditions. The description is sufficiently long to meet validation requirements."
    };
    
    const iterations = 3;
    const times = [];
    
    for (let i = 1; i <= iterations; i++) {
      try {
        console.log(`   🏃 Performance test ${i}/${iterations}`);
        
        const startTime = Date.now();
        const response = await this.submitAnalysisRequest(performanceTest);
        const duration = Date.now() - startTime;
        
        times.push(duration);
        console.log(`   ⏱️ Response time: ${duration}ms`);
        
      } catch (error) {
        console.error(`   ❌ Performance test ${i} failed: ${error.message}`);
        this.results.overall.failed++;
      }
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      this.results.performance = {
        averageTime: avgTime,
        maxTime: maxTime,
        minTime: minTime,
        iterations: times.length
      };
      
      console.log(`   📊 Performance Summary:`);
      console.log(`      Average: ${Math.round(avgTime)}ms`);
      console.log(`      Min: ${minTime}ms`);
      console.log(`      Max: ${maxTime}ms`);
      
      // Performance thresholds (from requirements)
      if (avgTime < 30000) { // 30 seconds
        console.log(`   ✅ Performance meets requirements`);
        this.results.overall.passed++;
      } else {
        console.log(`   ❌ Performance exceeds 30 second threshold`);
        this.results.overall.failed++;
      }
    }
  }

  /**
   * Generate comprehensive validation report
   */
  generateReport() {
    console.log('\n📊 End-to-End Workflow Validation Report');
    console.log('==========================================');
    
    const totalTests = this.results.overall.passed + this.results.overall.failed;
    const successRate = totalTests > 0 ? (this.results.overall.passed / totalTests * 100).toFixed(1) : 0;
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${this.results.overall.passed}`);
    console.log(`   Failed: ${this.results.overall.failed}`);
    console.log(`   Success Rate: ${successRate}%`);
    
    // Scenario results
    console.log(`\n🎯 Scenario Results:`);
    Object.entries(this.results.scenarios).forEach(([key, scenario]) => {
      const status = scenario.failed === 0 ? '✅' : '❌';
      console.log(`   ${status} ${scenario.name}: ${scenario.passed} passed, ${scenario.failed} failed (${scenario.duration}ms)`);
      
      if (scenario.errors.length > 0) {
        scenario.errors.forEach(error => {
          console.log(`      - ${error}`);
        });
      }
    });
    
    // Performance results
    if (this.results.performance.averageTime) {
      console.log(`\n⚡ Performance Results:`);
      console.log(`   Average Response Time: ${Math.round(this.results.performance.averageTime)}ms`);
      console.log(`   Min Response Time: ${this.results.performance.minTime}ms`);
      console.log(`   Max Response Time: ${this.results.performance.maxTime}ms`);
    }
    
    // Overall errors
    if (this.results.overall.errors.length > 0) {
      console.log(`\n❌ Critical Issues:`);
      this.results.overall.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (this.results.overall.failed === 0) {
      console.log(`   ✅ All tests passed! The end-to-end workflow is functioning correctly.`);
    } else {
      console.log(`   🔧 ${this.results.overall.failed} issues need to be addressed before production deployment.`);
    }
    
    if (this.results.performance.averageTime > 20000) {
      console.log(`   ⚡ Consider performance optimization - average response time is ${Math.round(this.results.performance.averageTime)}ms`);
    }
    
    // Check for fallback mode usage
    const fallbackUsage = Object.values(this.results.scenarios).filter(s => s.response && s.response.fallbackMode).length;
    if (fallbackUsage > 0) {
      console.log(`   ⚠️ ${fallbackUsage} scenarios used fallback mode - check AWS service connectivity`);
    }
    
    console.log('\n🏁 Validation Complete');
  }

  /**
   * Helper functions
   */
  isRetryableError(error) {
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' || 
           (error.response && error.response.status >= 500);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new WorkflowValidator();
  validator.validateWorkflow().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { WorkflowValidator, TEST_SCENARIOS, TEST_CONFIG };
// Additi
onal validation methods for WorkflowValidator class
WorkflowValidator.prototype.validateLambdaExecution = async function() {
  console.log('\n⚡ Validating Lambda Function Execution...');
  
  try {
    // Import Lambda automation
    const lambdaAutomation = require('../automations/InvLamFilterAut-v3');
    
    // Test with a simple query
    const testQuery = "SELECT 'Lambda test' as test_result";
    
    console.log(`   📤 Testing Lambda execution with query: ${testQuery}`);
    
    const result = await lambdaAutomation.execute({ query: testQuery });
    
    if (result.status === 'success') {
      console.log(`   ✅ Lambda execution successful`);
      console.log(`      Result: ${JSON.stringify(result.processResults).substring(0, 200)}...`);
      this.results.overall.passed++;
      
      return {
        success: true,
        result: result
      };
    } else {
      throw new Error(`Lambda execution failed: ${result.message}`);
    }
    
  } catch (error) {
    console.error(`   ❌ Lambda execution failed: ${error.message}`);
    this.results.overall.failed++;
    this.results.overall.errors.push(`Lambda execution: ${error.message}`);
    
    return {
      success: false,
      error: error.message
    };
  }
};

WorkflowValidator.prototype.validateBedrockAnalysis = async function() {
  console.log('\n🧠 Validating Bedrock Analysis Models...');
  
  const testData = {
    CustomerName: "Analysis Test Corp",
    region: "United States",
    closeDate: "2025-07-01",
    oppName: "Model Validation Test",
    oppDescription: "This is a test opportunity designed to validate both standard and Nova Premier Bedrock analysis models. The description is sufficiently detailed to provide meaningful analysis results.",
    industry: "Technology",
    customerSegment: "Enterprise",
    queryResults: JSON.stringify([
      {
        customer_name: "Similar Customer 1",
        opportunity_name: "Similar Opportunity 1",
        predicted_arr: 100000,
        launch_date: "2024-01-15",
        industry: "Technology"
      }
    ])
  };
  
  // Test standard model
  try {
    console.log(`   🔍 Testing standard Bedrock analysis...`);
    
    const standardAnalysis = require('../automations/finalBedAnalysisPrompt-v3');
    const standardResult = await standardAnalysis.execute(testData);
    
    if (standardResult.status === 'success') {
      console.log(`   ✅ Standard analysis successful`);
      this.results.overall.passed++;
    } else {
      throw new Error(`Standard analysis failed: ${standardResult.message}`);
    }
    
  } catch (error) {
    console.error(`   ❌ Standard analysis failed: ${error.message}`);
    this.results.overall.failed++;
    this.results.overall.errors.push(`Standard analysis: ${error.message}`);
  }
  
  // Test Nova Premier model
  try {
    console.log(`   🌟 Testing Nova Premier analysis...`);
    
    const novaPremierAnalysis = require('../automations/finalBedAnalysisPromptNovaPremier-v3');
    const novaPremierResult = await novaPremierAnalysis.execute(testData);
    
    if (novaPremierResult.status === 'success') {
      console.log(`   ✅ Nova Premier analysis successful`);
      this.results.overall.passed++;
    } else {
      throw new Error(`Nova Premier analysis failed: ${novaPremierResult.message}`);
    }
    
  } catch (error) {
    console.error(`   ❌ Nova Premier analysis failed: ${error.message}`);
    this.results.overall.failed++;
    this.results.overall.errors.push(`Nova Premier analysis: ${error.message}`);
  }
};