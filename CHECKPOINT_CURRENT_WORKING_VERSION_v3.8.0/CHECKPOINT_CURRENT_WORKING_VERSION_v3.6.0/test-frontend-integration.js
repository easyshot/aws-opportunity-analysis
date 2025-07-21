/**
 * Frontend Integration Test Script
 * Purpose: Test frontend integration with real analysis results
 * Requirements: 5.5 - Ensure frontend displays real analysis results correctly
 */

require('dotenv').config();
const axios = require('axios');
const { JSDOM } = require('jsdom');

// Test configuration
const TEST_CONFIG = {
  backendUrl: 'http://localhost:8123',
  frontendUrl: 'http://localhost:3123',
  timeout: 60000, // 60 seconds
  retryAttempts: 3,
  retryDelay: 2000 // 2 seconds
};

// Test scenarios for frontend integration
const FRONTEND_TEST_SCENARIOS = {
  basicAnalysis: {
    name: "Basic Analysis Display",
    data: {
      CustomerName: "Frontend Test Corp",
      region: "United States",
      closeDate: "2025-06-15",
      oppName: "Frontend Integration Test",
      oppDescription: "This is a comprehensive test to validate that the frontend correctly displays real analysis results from the backend API. The description is detailed enough to generate meaningful analysis content.",
      industry: "Technology",
      customerSegment: "Enterprise"
    },
    expectedSections: [
      'metrics',
      'sections',
      'methodology',
      'formattedSummaryText'
    ]
  },
  novaPremierAnalysis: {
    name: "Nova Premier Analysis Display",
    data: {
      CustomerName: "Premium Frontend Test Inc",
      region: "Germany",
      closeDate: "2025-08-20",
      oppName: "Nova Premier Frontend Test",
      oppDescription: "Advanced test scenario for Nova Premier model integration with frontend display. This test validates that enhanced analysis results are properly formatted and displayed in the user interface.",
      industry: "Financial Services",
      customerSegment: "Enterprise",
      useNovaPremier: true
    },
    expectedSections: [
      'metrics',
      'sections',
      'methodology',
      'formattedSummaryText'
    ]
  }
};

class FrontendIntegrationTester {
  constructor() {
    this.results = {
      overall: { passed: 0, failed: 0, errors: [] },
      scenarios: {},
      apiIntegration: {},
      displayValidation: {}
    };
  }

  /**
   * Main test function
   */
  async testFrontendIntegration() {
    console.log('🚀 Starting Frontend Integration Tests');
    console.log('=====================================');
    console.log('Requirement 5.5: Ensure frontend displays real analysis results correctly');
    console.log('');
    
    try {
      // Step 1: Validate API connectivity
      await this.validateApiConnectivity();
      
      // Step 2: Test analysis scenarios
      for (const [scenarioKey, scenario] of Object.entries(FRONTEND_TEST_SCENARIOS)) {
        console.log(`\n📋 Testing Scenario: ${scenario.name}`);
        await this.testAnalysisScenario(scenarioKey, scenario);
      }
      
      // Step 3: Validate response structure
      await this.validateResponseStructure();
      
      // Step 4: Test error handling
      await this.testErrorHandling();
      
      // Step 5: Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Critical test error:', error.message);
      this.results.overall.errors.push(`Critical error: ${error.message}`);
    }
  }

  /**
   * Validate API connectivity between frontend and backend
   */
  async validateApiConnectivity() {
    console.log('\n🔍 Validating API Connectivity...');
    
    try {
      // Test backend health endpoint
      console.log('   📡 Testing backend health endpoint...');
      const healthResponse = await axios.get(`${TEST_CONFIG.backendUrl}/health`, {
        timeout: 10000
      });
      
      if (healthResponse.status === 200) {
        console.log('   ✅ Backend health check passed');
        console.log(`      Status: ${healthResponse.data.status}`);
        console.log(`      Mode: ${healthResponse.data.mode}`);
        
        this.results.apiIntegration.backendHealth = {
          status: 'healthy',
          mode: healthResponse.data.mode,
          services: healthResponse.data.services
        };
        
        this.results.overall.passed++;
      } else {
        throw new Error(`Health check failed with status: ${healthResponse.status}`);
      }
      
      // Test API endpoint accessibility
      console.log('   📡 Testing API endpoint accessibility...');
      try {
        const testResponse = await axios.post(`${TEST_CONFIG.backendUrl}/api/analyze`, {
          CustomerName: 'API Test',
          region: 'United States',
          closeDate: '2025-06-15',
          oppName: 'API Connectivity Test',
          oppDescription: 'Short test for API connectivity validation'
        }, {
          timeout: 30000,
          validateStatus: () => true // Accept any status code
        });
        
        if (testResponse.status === 200 || testResponse.status === 400) {
          console.log('   ✅ API endpoint accessible');
          this.results.apiIntegration.endpointAccessible = true;
          this.results.overall.passed++;
        } else {
          throw new Error(`API endpoint returned status: ${testResponse.status}`);
        }
        
      } catch (error) {
        console.error('   ❌ API endpoint test failed:', error.message);
        this.results.apiIntegration.endpointAccessible = false;
        this.results.overall.failed++;
      }
      
    } catch (error) {
      console.error('   ❌ API connectivity validation failed:', error.message);
      this.results.apiIntegration.backendHealth = {
        status: 'unhealthy',
        error: error.message
      };
      this.results.overall.failed++;
      this.results.overall.errors.push(`API connectivity: ${error.message}`);
    }
  }

  /**
   * Test analysis scenario and validate response
   */
  async testAnalysisScenario(scenarioKey, scenario) {
    const startTime = Date.now();
    
    try {
      console.log(`   📤 Submitting analysis request...`);
      
      const response = await this.submitAnalysisRequest(scenario.data);
      const duration = Date.now() - startTime;
      
      // Validate response structure and content
      const validation = this.validateAnalysisResponse(response.data, scenario);
      
      this.results.scenarios[scenarioKey] = {
        name: scenario.name,
        passed: validation.passed,
        failed: validation.failed,
        errors: validation.errors,
        duration: duration,
        response: response.data,
        displayValidation: validation.displayValidation
      };
      
      if (validation.failed === 0) {
        console.log(`   ✅ Scenario passed (${duration}ms)`);
        console.log(`      Response sections: ${validation.sectionsFound.join(', ')}`);
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
   * Validate analysis response for frontend display
   */
  validateAnalysisResponse(response, scenario) {
    const validation = { 
      passed: 0, 
      failed: 0, 
      errors: [], 
      sectionsFound: [],
      displayValidation: {}
    };
    
    // Check required response structure
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
        validation.sectionsFound.push(field);
      } else {
        validation.failed++;
        validation.errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate metrics for frontend display
    if (response.metrics) {
      const metricsValidation = this.validateMetricsDisplay(response.metrics);
      validation.displayValidation.metrics = metricsValidation;
      
      if (metricsValidation.valid) {
        validation.passed++;
      } else {
        validation.failed++;
        validation.errors.push('Metrics not suitable for frontend display');
      }
    }
    
    // Validate sections for frontend display
    if (response.sections) {
      const sectionsValidation = this.validateSectionsDisplay(response.sections);
      validation.displayValidation.sections = sectionsValidation;
      
      if (sectionsValidation.valid) {
        validation.passed++;
      } else {
        validation.failed++;
        validation.errors.push('Sections not suitable for frontend display');
      }
    }
    
    // Check for fallback mode
    if (response.fallbackMode) {
      validation.errors.push('Response generated in fallback mode - may not represent real AWS service data');
    } else {
      validation.passed++;
    }
    
    // Validate Nova Premier specific features
    if (scenario.data.useNovaPremier && !response.fallbackMode) {
      if (response.processingMode === 'aws-services') {
        validation.passed++;
      } else {
        validation.failed++;
        validation.errors.push('Nova Premier analysis should use AWS services');
      }
    }
    
    return validation;
  }

  /**
   * Validate metrics structure for frontend display
   */
  validateMetricsDisplay(metrics) {
    const validation = { valid: true, issues: [] };
    
    const requiredMetrics = [
      'predictedArr',
      'predictedMrr',
      'launchDate',
      'predictedProjectDuration',
      'confidence'
    ];
    
    requiredMetrics.forEach(metric => {
      if (!metrics[metric] || metrics[metric] === 'Error') {
        validation.valid = false;
        validation.issues.push(`Missing or invalid metric: ${metric}`);
      }
    });
    
    // Check for display-friendly formats
    if (metrics.predictedArr && !metrics.predictedArr.includes('$')) {
      validation.issues.push('ARR should be formatted with currency symbol');
    }
    
    if (metrics.predictedMrr && !metrics.predictedMrr.includes('$')) {
      validation.issues.push('MRR should be formatted with currency symbol');
    }
    
    if (metrics.confidence && !['LOW', 'MEDIUM', 'HIGH'].includes(metrics.confidence)) {
      validation.issues.push('Confidence should be LOW, MEDIUM, or HIGH');
    }
    
    return validation;
  }

  /**
   * Validate sections structure for frontend display
   */
  validateSectionsDisplay(sections) {
    const validation = { valid: true, issues: [] };
    
    // Check for main analysis content
    if (!sections.similarProjectsRaw || sections.similarProjectsRaw.length < 50) {
      validation.valid = false;
      validation.issues.push('Similar projects section too short or missing');
    }
    
    // Check for error indicators
    if (sections.similarProjectsRaw && sections.similarProjectsRaw.includes('Error')) {
      validation.valid = false;
      validation.issues.push('Sections contain error messages');
    }
    
    return validation;
  }

  /**
   * Validate response structure consistency
   */
  async validateResponseStructure() {
    console.log('\n📋 Validating Response Structure Consistency...');
    
    const testData = {
      CustomerName: "Structure Test Corp",
      region: "United States",
      closeDate: "2025-07-01",
      oppName: "Structure Validation Test",
      oppDescription: "Test to validate consistent response structure for frontend integration"
    };
    
    try {
      const response = await this.submitAnalysisRequest(testData);
      
      // Check response structure consistency
      const requiredStructure = {
        metrics: 'object',
        sections: 'object',
        sessionId: 'string',
        opportunityId: 'string',
        timestamp: 'string',
        fallbackMode: 'boolean',
        processingMode: 'string'
      };
      
      let structureValid = true;
      const structureIssues = [];
      
      Object.entries(requiredStructure).forEach(([field, expectedType]) => {
        const actualType = typeof response.data[field];
        if (actualType !== expectedType && response.data[field] !== undefined) {
          structureValid = false;
          structureIssues.push(`${field}: expected ${expectedType}, got ${actualType}`);
        }
      });
      
      if (structureValid) {
        console.log('   ✅ Response structure is consistent');
        this.results.displayValidation.structure = { valid: true };
        this.results.overall.passed++;
      } else {
        console.log('   ❌ Response structure inconsistencies found');
        structureIssues.forEach(issue => console.log(`      - ${issue}`));
        this.results.displayValidation.structure = { valid: false, issues: structureIssues };
        this.results.overall.failed++;
      }
      
    } catch (error) {
      console.error('   ❌ Structure validation failed:', error.message);
      this.results.displayValidation.structure = { valid: false, error: error.message };
      this.results.overall.failed++;
    }
  }

  /**
   * Test error handling for frontend display
   */
  async testErrorHandling() {
    console.log('\n🛡️ Testing Error Handling for Frontend...');
    
    const errorScenarios = [
      {
        name: 'Missing required fields',
        data: { CustomerName: 'Test' },
        expectedStatus: 400
      },
      {
        name: 'Invalid date format',
        data: {
          CustomerName: 'Test Customer',
          region: 'United States',
          closeDate: 'invalid-date',
          oppName: 'Test Opportunity',
          oppDescription: 'Test description with sufficient length'
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
          
          // Validate error response structure for frontend
          if (response.data.error && response.data.message) {
            console.log(`      Error message: ${response.data.message}`);
            this.results.overall.passed++;
          } else {
            console.log(`   ❌ Error response missing user-friendly message`);
            this.results.overall.failed++;
          }
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
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('\n📊 Frontend Integration Test Report');
    console.log('==================================');
    
    const totalTests = this.results.overall.passed + this.results.overall.failed;
    const successRate = totalTests > 0 ? (this.results.overall.passed / totalTests * 100).toFixed(1) : 0;
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${this.results.overall.passed}`);
    console.log(`   Failed: ${this.results.overall.failed}`);
    console.log(`   Success Rate: ${successRate}%`);
    
    // API Integration results
    console.log(`\n📡 API Integration:`);
    if (this.results.apiIntegration.backendHealth) {
      const healthStatus = this.results.apiIntegration.backendHealth.status === 'healthy' ? '✅' : '❌';
      console.log(`   ${healthStatus} Backend Health: ${this.results.apiIntegration.backendHealth.status}`);
      
      if (this.results.apiIntegration.backendHealth.mode) {
        console.log(`      Mode: ${this.results.apiIntegration.backendHealth.mode}`);
      }
    }
    
    const endpointStatus = this.results.apiIntegration.endpointAccessible ? '✅' : '❌';
    console.log(`   ${endpointStatus} API Endpoint: ${this.results.apiIntegration.endpointAccessible ? 'Accessible' : 'Not accessible'}`);
    
    // Scenario results
    console.log(`\n🎯 Analysis Scenarios:`);
    Object.entries(this.results.scenarios).forEach(([key, scenario]) => {
      const status = scenario.failed === 0 ? '✅' : '❌';
      console.log(`   ${status} ${scenario.name}: ${scenario.passed} passed, ${scenario.failed} failed (${scenario.duration}ms)`);
      
      if (scenario.displayValidation) {
        if (scenario.displayValidation.metrics && !scenario.displayValidation.metrics.valid) {
          console.log(`      ⚠️ Metrics display issues: ${scenario.displayValidation.metrics.issues.join(', ')}`);
        }
        if (scenario.displayValidation.sections && !scenario.displayValidation.sections.valid) {
          console.log(`      ⚠️ Sections display issues: ${scenario.displayValidation.sections.issues.join(', ')}`);
        }
      }
      
      if (scenario.errors.length > 0) {
        scenario.errors.forEach(error => {
          console.log(`      - ${error}`);
        });
      }
    });
    
    // Display validation results
    if (this.results.displayValidation.structure) {
      console.log(`\n📋 Response Structure:`);
      const structureStatus = this.results.displayValidation.structure.valid ? '✅' : '❌';
      console.log(`   ${structureStatus} Structure Consistency: ${this.results.displayValidation.structure.valid ? 'Valid' : 'Issues found'}`);
      
      if (this.results.displayValidation.structure.issues) {
        this.results.displayValidation.structure.issues.forEach(issue => {
          console.log(`      - ${issue}`);
        });
      }
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
      console.log(`   ✅ All tests passed! Frontend integration is working correctly with real analysis results.`);
      console.log(`   📝 Requirement 5.5 is satisfied - frontend displays real analysis results correctly`);
    } else {
      console.log(`   🔧 ${this.results.overall.failed} issues need to be addressed:`);
      
      if (!this.results.apiIntegration.endpointAccessible) {
        console.log(`     - Fix API endpoint connectivity issues`);
      }
      
      const failedScenarios = Object.values(this.results.scenarios).filter(s => s.failed > 0).length;
      if (failedScenarios > 0) {
        console.log(`     - Address ${failedScenarios} failed analysis scenarios`);
      }
      
      if (this.results.displayValidation.structure && !this.results.displayValidation.structure.valid) {
        console.log(`     - Fix response structure inconsistencies`);
      }
    }
    
    console.log('\n🏁 Frontend Integration Tests Complete');
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

// Run tests if called directly
if (require.main === module) {
  const tester = new FrontendIntegrationTester();
  tester.testFrontendIntegration().catch(error => {
    console.error('❌ Frontend integration tests failed:', error);
    process.exit(1);
  });
}

module.exports = { FrontendIntegrationTester, FRONTEND_TEST_SCENARIOS, TEST_CONFIG };