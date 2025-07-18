/**
 * Comprehensive End-to-End Validation Runner
 * Purpose: Orchestrate all validation tests for Task 4
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

require('dotenv').config();

// Import test modules
const { BedrockQueryTester } = require('./test-bedrock-query-generation');
const { WorkflowValidator } = require('./validate-end-to-end-workflow');

class ComprehensiveValidator {
  constructor() {
    this.results = {
      overall: { passed: 0, failed: 0, errors: [] },
      bedrockQuery: null,
      endToEndWorkflow: null,
      summary: {}
    };
  }

  /**
   * Run all validation tests
   */
  async runAllValidations() {
    console.log('🚀 Starting Comprehensive End-to-End Validation');
    console.log('===============================================');
    console.log('Task 4: Validate end-to-end analysis workflow');
    console.log('Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6');
    console.log('');
    
    const startTime = Date.now();
    
    try {
      // Test 1: Bedrock Query Generation (Requirement 5.2)
      console.log('📋 Phase 1: Bedrock Query Generation Validation');
      console.log('Requirement 5.2: Validate Bedrock query generation with real prompts and models');
      await this.runBedrockQueryTests();
      
      // Test 2: End-to-End Workflow (Requirements 5.1, 5.3, 5.4, 5.5, 5.6)
      console.log('\n📋 Phase 2: End-to-End Workflow Validation');
      console.log('Requirements 5.1, 5.3, 5.4, 5.5, 5.6: Complete workflow validation');
      await this.runWorkflowTests();
      
      // Generate comprehensive report
      const totalTime = Date.now() - startTime;
      this.generateComprehensiveReport(totalTime);
      
    } catch (error) {
      console.error('❌ Critical validation error:', error.message);
      this.results.overall.errors.push(`Critical error: ${error.message}`);
      this.generateComprehensiveReport(Date.now() - startTime);
      process.exit(1);
    }
  }

  /**
   * Run Bedrock query generation tests
   */
  async runBedrockQueryTests() {
    try {
      const bedrockTester = new BedrockQueryTester();
      
      // Capture console output for results
      const originalLog = console.log;
      let capturedOutput = '';
      console.log = (...args) => {
        capturedOutput += args.join(' ') + '\n';
        originalLog(...args);
      };
      
      await bedrockTester.testBedrockQueryGeneration();
      
      // Restore console.log
      console.log = originalLog;
      
      this.results.bedrockQuery = {
        passed: bedrockTester.results.overall.passed,
        failed: bedrockTester.results.overall.failed,
        errors: bedrockTester.results.overall.errors,
        scenarios: bedrockTester.results.scenarios,
        promptValidation: bedrockTester.results.promptValidation,
        modelValidation: bedrockTester.results.modelValidation,
        output: capturedOutput
      };
      
      this.results.overall.passed += bedrockTester.results.overall.passed;
      this.results.overall.failed += bedrockTester.results.overall.failed;
      this.results.overall.errors.push(...bedrockTester.results.overall.errors);
      
    } catch (error) {
      console.error('❌ Bedrock query tests failed:', error.message);
      this.results.bedrockQuery = {
        passed: 0,
        failed: 1,
        errors: [error.message],
        scenarios: {},
        promptValidation: {},
        modelValidation: {}
      };
      this.results.overall.failed++;
      this.results.overall.errors.push(`Bedrock query tests: ${error.message}`);
    }
  }

  /**
   * Run end-to-end workflow tests
   */
  async runWorkflowTests() {
    try {
      const workflowValidator = new WorkflowValidator();
      
      // Capture console output for results
      const originalLog = console.log;
      let capturedOutput = '';
      console.log = (...args) => {
        capturedOutput += args.join(' ') + '\n';
        originalLog(...args);
      };
      
      await workflowValidator.validateWorkflow();
      
      // Restore console.log
      console.log = originalLog;
      
      this.results.endToEndWorkflow = {
        passed: workflowValidator.results.overall.passed,
        failed: workflowValidator.results.overall.failed,
        errors: workflowValidator.results.overall.errors,
        scenarios: workflowValidator.results.scenarios,
        performance: workflowValidator.results.performance,
        output: capturedOutput
      };
      
      this.results.overall.passed += workflowValidator.results.overall.passed;
      this.results.overall.failed += workflowValidator.results.overall.failed;
      this.results.overall.errors.push(...workflowValidator.results.overall.errors);
      
    } catch (error) {
      console.error('❌ End-to-end workflow tests failed:', error.message);
      this.results.endToEndWorkflow = {
        passed: 0,
        failed: 1,
        errors: [error.message],
        scenarios: {},
        performance: {}
      };
      this.results.overall.failed++;
      this.results.overall.errors.push(`End-to-end workflow tests: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive validation report
   */
  generateComprehensiveReport(totalTime) {
    console.log('\n📊 Comprehensive End-to-End Validation Report');
    console.log('==============================================');
    console.log('Task 4: Validate end-to-end analysis workflow');
    console.log('');
    
    const totalTests = this.results.overall.passed + this.results.overall.failed;
    const successRate = totalTests > 0 ? (this.results.overall.passed / totalTests * 100).toFixed(1) : 0;
    
    // Overall summary
    console.log('📈 Overall Results:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${this.results.overall.passed}`);
    console.log(`   Failed: ${this.results.overall.failed}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Total Time: ${Math.round(totalTime / 1000)}s`);
    console.log('');
    
    // Requirement validation status
    console.log('📋 Requirement Validation Status:');
    
    // Requirement 5.1: Complete workflow validation
    const workflowPassed = this.results.endToEndWorkflow && this.results.endToEndWorkflow.failed === 0;
    console.log(`   ${workflowPassed ? '✅' : '❌'} 5.1: Complete workflow (form submission → query generation → data retrieval → analysis → response)`);
    
    // Requirement 5.2: Bedrock query generation
    const queryPassed = this.results.bedrockQuery && this.results.bedrockQuery.failed === 0;
    console.log(`   ${queryPassed ? '✅' : '❌'} 5.2: Bedrock query generation with real prompts and models`);
    
    // Requirement 5.3: Lambda function execution
    const lambdaPassed = this.results.endToEndWorkflow && 
                         Object.values(this.results.endToEndWorkflow.scenarios || {}).some(s => s.passed > 0);
    console.log(`   ${lambdaPassed ? '✅' : '❌'} 5.3: Lambda function execution with Athena query processing`);
    
    // Requirement 5.4: Bedrock analysis models
    const analysisPassed = this.results.bedrockQuery && 
                           Object.keys(this.results.bedrockQuery.modelValidation || {}).length > 0;
    console.log(`   ${analysisPassed ? '✅' : '❌'} 5.4: Bedrock analysis with both standard and Nova Premier models`);
    
    // Requirement 5.5: Frontend integration
    const frontendPassed = this.results.endToEndWorkflow && 
                           Object.values(this.results.endToEndWorkflow.scenarios || {}).some(s => s.response);
    console.log(`   ${frontendPassed ? '✅' : '❌'} 5.5: Frontend displays real analysis results correctly`);
    
    // Requirement 5.6: Error handling and retry mechanisms
    const errorHandlingPassed = this.results.endToEndWorkflow && this.results.endToEndWorkflow.passed > 0;
    console.log(`   ${errorHandlingPassed ? '✅' : '❌'} 5.6: Error handling and retry mechanisms throughout workflow`);
    
    console.log('');
    
    // Phase results
    if (this.results.bedrockQuery) {
      console.log('🧠 Bedrock Query Generation Results:');
      console.log(`   Tests: ${this.results.bedrockQuery.passed + this.results.bedrockQuery.failed}`);
      console.log(`   Passed: ${this.results.bedrockQuery.passed}`);
      console.log(`   Failed: ${this.results.bedrockQuery.failed}`);
      
      // Prompt validation summary
      const promptResults = this.results.bedrockQuery.promptValidation || {};
      const accessiblePrompts = Object.values(promptResults).filter(p => p.accessible).length;
      const totalPrompts = Object.keys(promptResults).length;
      console.log(`   Prompts Accessible: ${accessiblePrompts}/${totalPrompts}`);
      
      // Model validation summary
      const modelResults = this.results.bedrockQuery.modelValidation || {};
      const accessibleModels = Object.values(modelResults).filter(m => m.accessible).length;
      const totalModels = Object.keys(modelResults).length;
      console.log(`   Models Accessible: ${accessibleModels}/${totalModels}`);
      
      console.log('');
    }
    
    if (this.results.endToEndWorkflow) {
      console.log('🔄 End-to-End Workflow Results:');
      console.log(`   Tests: ${this.results.endToEndWorkflow.passed + this.results.endToEndWorkflow.failed}`);
      console.log(`   Passed: ${this.results.endToEndWorkflow.passed}`);
      console.log(`   Failed: ${this.results.endToEndWorkflow.failed}`);
      
      // Scenario results
      const scenarios = this.results.endToEndWorkflow.scenarios || {};
      console.log(`   Scenarios Tested: ${Object.keys(scenarios).length}`);
      
      // Performance summary
      if (this.results.endToEndWorkflow.performance && this.results.endToEndWorkflow.performance.averageTime) {
        const avgTime = Math.round(this.results.endToEndWorkflow.performance.averageTime);
        console.log(`   Average Response Time: ${avgTime}ms`);
      }
      
      console.log('');
    }
    
    // Critical issues
    if (this.results.overall.errors.length > 0) {
      console.log('❌ Critical Issues:');
      this.results.overall.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
      console.log('');
    }
    
    // Task completion assessment
    console.log('🎯 Task 4 Completion Assessment:');
    
    const requirementsPassed = [
      workflowPassed,
      queryPassed,
      lambdaPassed,
      analysisPassed,
      frontendPassed,
      errorHandlingPassed
    ].filter(Boolean).length;
    
    const totalRequirements = 6;
    const completionRate = (requirementsPassed / totalRequirements * 100).toFixed(1);
    
    console.log(`   Requirements Met: ${requirementsPassed}/${totalRequirements} (${completionRate}%)`);
    
    if (requirementsPassed === totalRequirements) {
      console.log('   ✅ Task 4 COMPLETED: End-to-end analysis workflow validated successfully');
      console.log('   🚀 Ready for production deployment');
    } else {
      console.log('   ⚠️ Task 4 PARTIALLY COMPLETED: Some requirements need attention');
      console.log('   🔧 Address the failed requirements before marking task as complete');
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (this.results.overall.failed === 0) {
      console.log('   ✅ All validations passed! The end-to-end workflow is ready for production.');
      console.log('   📝 Update task status to completed in tasks.md');
      console.log('   ➡️ Proceed to Task 5: Test and validate frontend integration with real data');
    } else {
      console.log('   🔧 Address the following issues before completing Task 4:');
      
      if (!queryPassed) {
        console.log('     - Fix Bedrock query generation issues (check prompt IDs and model permissions)');
      }
      if (!lambdaPassed) {
        console.log('     - Resolve Lambda function execution problems (check function deployment and permissions)');
      }
      if (!analysisPassed) {
        console.log('     - Fix Bedrock analysis model access (verify model permissions and configurations)');
      }
      if (!frontendPassed) {
        console.log('     - Test frontend integration with backend API endpoints');
      }
      if (!errorHandlingPassed) {
        console.log('     - Improve error handling and retry mechanisms');
      }
    }
    
    console.log('\n🏁 Comprehensive Validation Complete');
    
    // Set exit code based on results
    if (this.results.overall.failed > 0) {
      process.exitCode = 1;
    }
  }
}

// Run comprehensive validation if called directly
if (require.main === module) {
  const validator = new ComprehensiveValidator();
  validator.runAllValidations().catch(error => {
    console.error('❌ Comprehensive validation failed:', error);
    process.exit(1);
  });
}

module.exports = { ComprehensiveValidator };// Ad
d frontend integration testing
ComprehensiveValidator.prototype.runFrontendTests = async function() {
  try {
    const { FrontendIntegrationTester } = require('./test-frontend-integration');
    const frontendTester = new FrontendIntegrationTester();
    
    // Capture console output for results
    const originalLog = console.log;
    let capturedOutput = '';
    console.log = (...args) => {
      capturedOutput += args.join(' ') + '\n';
      originalLog(...args);
    };
    
    await frontendTester.testFrontendIntegration();
    
    // Restore console.log
    console.log = originalLog;
    
    this.results.frontendIntegration = {
      passed: frontendTester.results.overall.passed,
      failed: frontendTester.results.overall.failed,
      errors: frontendTester.results.overall.errors,
      scenarios: frontendTester.results.scenarios,
      apiIntegration: frontendTester.results.apiIntegration,
      displayValidation: frontendTester.results.displayValidation,
      output: capturedOutput
    };
    
    this.results.overall.passed += frontendTester.results.overall.passed;
    this.results.overall.failed += frontendTester.results.overall.failed;
    this.results.overall.errors.push(...frontendTester.results.overall.errors);
    
  } catch (error) {
    console.error('❌ Frontend integration tests failed:', error.message);
    this.results.frontendIntegration = {
      passed: 0,
      failed: 1,
      errors: [error.message],
      scenarios: {},
      apiIntegration: {},
      displayValidation: {}
    };
    this.results.overall.failed++;
    this.results.overall.errors.push(`Frontend integration tests: ${error.message}`);
  }
};