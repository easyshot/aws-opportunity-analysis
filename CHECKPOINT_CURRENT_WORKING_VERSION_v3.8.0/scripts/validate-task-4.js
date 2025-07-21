/**
 * Task 4 Validation Script
 * Purpose: Validate end-to-end analysis workflow
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

require('dotenv').config();
const axios = require('axios');

// Test configuration
const TEST_CONFIG = {
  backendUrl: 'http://localhost:8123',
  timeout: 60000, // 60 seconds
  retryAttempts: 3,
  retryDelay: 2000 // 2 seconds
};

class Task4Validator {
  constructor() {
    this.results = {
      requirements: {
        '5.1': { name: 'Complete workflow validation', passed: false, details: [] },
        '5.2': { name: 'Bedrock query generation', passed: false, details: [] },
        '5.3': { name: 'Lambda function execution', passed: false, details: [] },
        '5.4': { name: 'Bedrock analysis models', passed: false, details: [] },
        '5.5': { name: 'Frontend integration', passed: false, details: [] },
        '5.6': { name: 'Error handling and retry', passed: false, details: [] }
      },
      overall: { passed: 0, failed: 0, errors: [] }
    };
  }

  /**
   * Main validation function
   */
  async validateTask4() {
    console.log('🚀 Task 4 Validation: End-to-End Analysis Workflow');
    console.log('==================================================');
    console.log('Testing complete workflow: form submission → query generation → data retrieval → analysis → response');
    console.log('');
    
    try {
      // Step 1: Validate backend health (Requirement 5.1)
      await this.validateBackendHealth();
      
      // Step 2: Test complete workflow scenarios (Requirements 5.1, 5.2, 5.3, 5.4)
      await this.testCompleteWorkflow();
      
      // Step 3: Test error handling (Requirement 5.6)
      await this.testErrorHandling();
      
      // Step 4: Test frontend integration (Requirement 5.5)
      await this.testFrontendIntegration();
      
      // Step 5: Generate final report
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Critical validation error:', error.message);
      this.results.overall.errors.push(`Critical error: ${error.message}`);
      this.generateFinalReport();
      process.exit(1);
    }
  }

  /**
   * Validate backend health and service availability
   */
  async validateBackendHealth() {
    console.log('🔍 Step 1: Validating Backend Health and Service Availability');
    console.log('------------------------------------------------------------');
    
    try {
      const response = await axios.get(`${TEST_CONFIG.backendUrl}/health`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        console.log('✅ Backend health check passed');
        console.log(`   Status: ${response.data.status}`);
        console.log(`   Mode: ${response.data.mode}`);
        console.log(`   AWS Credentials: ${response.data.environment.hasAwsCredentials ? 'Available' : 'Missing'}`);
        
        // Check service availability
        const services = response.data.services;
        console.log('   Service Status:');
        Object.entries(services).forEach(([service, available]) => {
          console.log(`     ${service}: ${available ? '✅' : '❌'}`);
        });
        
        // Validate requirement 5.1 - basic connectivity
        this.results.requirements['5.1'].passed = true;
        this.results.requirements['5.1'].details.push('Backend health check passed');
        this.results.requirements['5.1'].details.push(`Services available: ${Object.values(services).filter(Boolean).length}/${Object.keys(services).length}`);
        
        this.results.overall.passed++;
      } else {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      this.results.requirements['5.1'].details.push(`Health check failed: ${error.message}`);
      this.results.overall.failed++;
      this.results.overall.errors.push(`Backend health: ${error.message}`);
    }
  }

  /**
   * Test complete workflow scenarios
   */
  async testCompleteWorkflow() {
    console.log('\n🔄 Step 2: Testing Complete Analysis Workflow');
    console.log('---------------------------------------------');
    
    const testScenarios = [
      {
        name: 'Standard Analysis Workflow',
        data: {
          CustomerName: "Workflow Test Corp",
          region: "United States",
          closeDate: "2025-06-15",
          oppName: "Complete Workflow Test",
          oppDescription: "This is a comprehensive test to validate the complete end-to-end analysis workflow including query generation, data retrieval, and analysis processing.",
          industry: "Technology",
          customerSegment: "Enterprise"
        },
        testNovaPremier: false
      },
      {
        name: 'Nova Premier Analysis Workflow',
        data: {
          CustomerName: "Premium Workflow Test Inc",
          region: "Germany",
          closeDate: "2025-08-20",
          oppName: "Nova Premier Workflow Test",
          oppDescription: "Advanced test scenario for Nova Premier model workflow validation including enhanced query generation and premium analysis capabilities.",
          industry: "Financial Services",
          customerSegment: "Enterprise",
          useNovaPremier: true
        },
        testNovaPremier: true
      }
    ];
    
    for (const scenario of testScenarios) {
      console.log(`\n📋 Testing: ${scenario.name}`);
      await this.testWorkflowScenario(scenario);
    }
  }

  /**
   * Test individual workflow scenario
   */
  async testWorkflowScenario(scenario) {
    const startTime = Date.now();
    
    try {
      console.log(`   📤 Submitting analysis request...`);
      
      const response = await this.submitAnalysisRequest(scenario.data);
      const duration = Date.now() - startTime;
      
      console.log(`   ⏱️ Response time: ${duration}ms`);
      
      // Validate response structure and content
      const validation = this.validateWorkflowResponse(response.data, scenario);
      
      if (validation.success) {
        console.log(`   ✅ Workflow completed successfully`);
        console.log(`      Processing mode: ${response.data.processingMode || 'unknown'}`);
        console.log(`      Fallback mode: ${response.data.fallbackMode ? 'Yes' : 'No'}`);
        
        // Update requirement validations
        this.updateRequirementValidation(response.data, scenario, duration);
        
      } else {
        console.log(`   ❌ Workflow validation failed`);
        validation.errors.forEach(error => console.log(`      - ${error}`));
        this.results.overall.failed++;
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`   ❌ Workflow failed: ${error.message}`);
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
   * Validate workflow response
   */
  validateWorkflowResponse(response, scenario) {
    const validation = { success: true, errors: [] };
    
    // Check required response fields
    const requiredFields = ['metrics', 'sections', 'sessionId', 'opportunityId', 'timestamp'];
    
    requiredFields.forEach(field => {
      if (!response[field]) {
        validation.success = false;
        validation.errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate metrics
    if (response.metrics) {
      const requiredMetrics = ['predictedArr', 'predictedMrr', 'launchDate', 'predictedProjectDuration', 'confidence'];
      
      requiredMetrics.forEach(metric => {
        if (!response.metrics[metric] || response.metrics[metric] === 'Error') {
          validation.success = false;
          validation.errors.push(`Invalid or missing metric: ${metric}`);
        }
      });
    }
    
    // Validate sections
    if (response.sections && response.sections.similarProjectsRaw) {
      if (response.sections.similarProjectsRaw.includes('Error') || 
          response.sections.similarProjectsRaw.length < 10) {
        validation.success = false;
        validation.errors.push('Analysis sections appear to contain errors or are too short');
      }
    }
    
    return validation;
  }

  /**
   * Update requirement validation based on response
   */
  updateRequirementValidation(response, scenario, duration) {
    // Requirement 5.1: Complete workflow
    if (response.metrics && response.sections) {
      this.results.requirements['5.1'].passed = true;
      this.results.requirements['5.1'].details.push(`${scenario.name} completed in ${duration}ms`);
    }
    
    // Requirement 5.2: Bedrock query generation
    if (!response.fallbackMode && response.processingMode === 'aws-services') {
      this.results.requirements['5.2'].passed = true;
      this.results.requirements['5.2'].details.push('Real Bedrock query generation confirmed');
    }
    
    // Requirement 5.3: Lambda function execution
    if (!response.fallbackMode && response.sections && response.sections.similarProjectsRaw) {
      this.results.requirements['5.3'].passed = true;
      this.results.requirements['5.3'].details.push('Lambda function execution with Athena confirmed');
    }
    
    // Requirement 5.4: Bedrock analysis models
    if (scenario.testNovaPremier && response.processingMode === 'aws-services') {
      this.results.requirements['5.4'].passed = true;
      this.results.requirements['5.4'].details.push('Nova Premier model analysis confirmed');
    } else if (!scenario.testNovaPremier && response.processingMode === 'aws-services') {
      this.results.requirements['5.4'].passed = true;
      this.results.requirements['5.4'].details.push('Standard Bedrock analysis confirmed');
    }
  }

  /**
   * Test error handling and retry mechanisms
   */
  async testErrorHandling() {
    console.log('\n🛡️ Step 3: Testing Error Handling and Retry Mechanisms');
    console.log('------------------------------------------------------');
    
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
          oppDescription: 'Test description with sufficient length for validation'
        },
        expectedStatus: 400
      }
    ];
    
    let errorHandlingPassed = true;
    
    for (const errorScenario of errorScenarios) {
      try {
        console.log(`   🧪 Testing: ${errorScenario.name}`);
        
        const response = await axios.post(`${TEST_CONFIG.backendUrl}/api/analyze`, errorScenario.data, {
          timeout: 10000,
          validateStatus: () => true // Don't throw on error status codes
        });
        
        if (response.status === errorScenario.expectedStatus) {
          console.log(`   ✅ Error handling correct (${response.status})`);
          
          // Check for user-friendly error messages
          if (response.data.error && response.data.message) {
            console.log(`      Error message: ${response.data.message}`);
          } else {
            console.log(`   ⚠️ Error response could be more user-friendly`);
          }
        } else {
          console.log(`   ❌ Expected status ${errorScenario.expectedStatus}, got ${response.status}`);
          errorHandlingPassed = false;
        }
        
      } catch (error) {
        console.error(`   ❌ Error scenario failed: ${error.message}`);
        errorHandlingPassed = false;
      }
    }
    
    // Update requirement 5.6
    if (errorHandlingPassed) {
      this.results.requirements['5.6'].passed = true;
      this.results.requirements['5.6'].details.push('Error handling and validation working correctly');
    } else {
      this.results.requirements['5.6'].details.push('Error handling issues detected');
    }
  }

  /**
   * Test frontend integration
   */
  async testFrontendIntegration() {
    console.log('\n🖥️ Step 4: Testing Frontend Integration');
    console.log('--------------------------------------');
    
    try {
      // Test a simple analysis request to validate frontend-compatible response
      const testData = {
        CustomerName: "Frontend Integration Test",
        region: "United States",
        closeDate: "2025-07-01",
        oppName: "Frontend Test",
        oppDescription: "Test to validate that the response format is suitable for frontend display and integration"
      };
      
      console.log('   📤 Testing frontend-compatible response format...');
      
      const response = await this.submitAnalysisRequest(testData);
      
      // Validate response structure for frontend compatibility
      const frontendValidation = this.validateFrontendCompatibility(response.data);
      
      if (frontendValidation.success) {
        console.log('   ✅ Frontend integration validation passed');
        console.log(`      Response structure: Compatible`);
        console.log(`      Display-ready metrics: ${frontendValidation.metricsReady ? 'Yes' : 'No'}`);
        console.log(`      Analysis sections: ${frontendValidation.sectionsReady ? 'Yes' : 'No'}`);
        
        this.results.requirements['5.5'].passed = true;
        this.results.requirements['5.5'].details.push('Response format compatible with frontend display');
        this.results.requirements['5.5'].details.push(`Metrics formatted for display: ${frontendValidation.metricsReady}`);
        
      } else {
        console.log('   ❌ Frontend integration issues detected');
        frontendValidation.errors.forEach(error => console.log(`      - ${error}`));
        this.results.requirements['5.5'].details.push('Frontend compatibility issues detected');
      }
      
    } catch (error) {
      console.error('   ❌ Frontend integration test failed:', error.message);
      this.results.requirements['5.5'].details.push(`Frontend test failed: ${error.message}`);
    }
  }

  /**
   * Validate frontend compatibility
   */
  validateFrontendCompatibility(response) {
    const validation = { success: true, errors: [], metricsReady: false, sectionsReady: false };
    
    // Check metrics formatting
    if (response.metrics) {
      const hasFormattedArr = response.metrics.predictedArr && response.metrics.predictedArr.includes('$');
      const hasFormattedMrr = response.metrics.predictedMrr && response.metrics.predictedMrr.includes('$');
      const hasConfidence = response.metrics.confidence && ['LOW', 'MEDIUM', 'HIGH'].includes(response.metrics.confidence);
      
      if (hasFormattedArr && hasFormattedMrr && hasConfidence) {
        validation.metricsReady = true;
      } else {
        validation.errors.push('Metrics not properly formatted for frontend display');
      }
    }
    
    // Check sections content
    if (response.sections && response.sections.similarProjectsRaw) {
      if (response.sections.similarProjectsRaw.length > 50 && !response.sections.similarProjectsRaw.includes('Error')) {
        validation.sectionsReady = true;
      } else {
        validation.errors.push('Analysis sections not ready for frontend display');
      }
    }
    
    // Check required fields for frontend
    const requiredForFrontend = ['sessionId', 'opportunityId', 'timestamp'];
    requiredForFrontend.forEach(field => {
      if (!response[field]) {
        validation.success = false;
        validation.errors.push(`Missing field required for frontend: ${field}`);
      }
    });
    
    return validation;
  }

  /**
   * Generate final validation report
   */
  generateFinalReport() {
    console.log('\n📊 Task 4 Validation Report');
    console.log('===========================');
    
    const passedRequirements = Object.values(this.results.requirements).filter(req => req.passed).length;
    const totalRequirements = Object.keys(this.results.requirements).length;
    const completionRate = (passedRequirements / totalRequirements * 100).toFixed(1);
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Requirements Met: ${passedRequirements}/${totalRequirements} (${completionRate}%)`);
    console.log(`   Total Tests: ${this.results.overall.passed + this.results.overall.failed}`);
    console.log(`   Passed: ${this.results.overall.passed}`);
    console.log(`   Failed: ${this.results.overall.failed}`);
    
    // Requirement-by-requirement results
    console.log(`\n📋 Requirement Validation Results:`);
    Object.entries(this.results.requirements).forEach(([reqId, req]) => {
      const status = req.passed ? '✅' : '❌';
      console.log(`   ${status} ${reqId}: ${req.name}`);
      
      if (req.details.length > 0) {
        req.details.forEach(detail => {
          console.log(`      - ${detail}`);
        });
      }
    });
    
    // Critical issues
    if (this.results.overall.errors.length > 0) {
      console.log(`\n❌ Critical Issues:`);
      this.results.overall.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    // Task completion status
    console.log(`\n🎯 Task 4 Completion Status:`);
    
    if (passedRequirements === totalRequirements) {
      console.log('   ✅ TASK 4 COMPLETED SUCCESSFULLY');
      console.log('   🚀 End-to-end analysis workflow is fully validated');
      console.log('   📝 Ready to update task status to completed in tasks.md');
      console.log('   ➡️ Proceed to Task 5: Test and validate frontend integration with real data');
    } else {
      console.log('   ⚠️ TASK 4 PARTIALLY COMPLETED');
      console.log(`   🔧 ${totalRequirements - passedRequirements} requirements still need attention`);
      console.log('   📋 Address the failed requirements before marking task as complete');
    }
    
    // Next steps
    console.log(`\n💡 Next Steps:`);
    if (passedRequirements === totalRequirements) {
      console.log('   1. Update .kiro/specs/aws-integration-mvp/tasks.md to mark Task 4 as completed');
      console.log('   2. Begin Task 5: Test and validate frontend integration with real data');
      console.log('   3. Continue with remaining tasks in the implementation plan');
    } else {
      const failedReqs = Object.entries(this.results.requirements)
        .filter(([_, req]) => !req.passed)
        .map(([reqId, _]) => reqId);
      
      console.log(`   1. Address failed requirements: ${failedReqs.join(', ')}`);
      console.log('   2. Re-run this validation script to confirm fixes');
      console.log('   3. Update task status once all requirements are met');
    }
    
    console.log('\n🏁 Task 4 Validation Complete');
    
    // Set exit code based on completion
    if (passedRequirements < totalRequirements) {
      process.exitCode = 1;
    }
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
  const validator = new Task4Validator();
  validator.validateTask4().catch(error => {
    console.error('❌ Task 4 validation failed:', error);
    process.exit(1);
  });
}

module.exports = { Task4Validator };