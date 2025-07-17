/**
 * Bedrock Query Generation Test Script
 * Purpose: Test Bedrock query generation functionality with real prompts and models
 * Requirements: 5.2 - Validate Bedrock query generation with real prompts and models
 */

require('dotenv').config();
const { bedrockAgent, bedrockRuntime, config } = require('../config/aws-config-v3');
const { GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 2000 // 2 seconds
};

// Test scenarios for query generation
const QUERY_TEST_SCENARIOS = {
  basic: {
    name: "Basic Query Generation",
    data: {
      CustomerName: "Test Customer Corp",
      region: "United States",
      closeDate: "2025-06-15",
      oppName: "Cloud Migration Initiative",
      oppDescription: "Large enterprise looking to migrate their on-premises infrastructure to AWS cloud services. They have 500+ servers, multiple databases, and complex networking requirements.",
      industry: "Technology",
      customerSegment: "Enterprise"
    }
  },
  complex: {
    name: "Complex Multi-Service Query",
    data: {
      CustomerName: "Global Manufacturing Ltd",
      region: "Japan",
      closeDate: "2025-12-31",
      oppName: "IoT and Edge Computing Platform",
      oppDescription: "Manufacturing company implementing IoT sensors across 50+ facilities worldwide. Requires edge computing capabilities, real-time data analytics, predictive maintenance algorithms, supply chain optimization, and integration with existing ERP systems.",
      industry: "Manufacturing",
      customerSegment: "Enterprise",
      activityFocus: "IoT and Edge Computing",
      businessDescription: "Global manufacturing operations with complex supply chain requirements"
    }
  },
  financial: {
    name: "Financial Services Query",
    data: {
      CustomerName: "Premium Financial Inc",
      region: "Germany",
      closeDate: "2025-08-20",
      oppName: "AI/ML Platform Modernization",
      oppDescription: "Fortune 500 financial services company seeking to build a comprehensive AI/ML platform on AWS. Requirements include real-time fraud detection, risk analytics, regulatory compliance, and integration with existing trading systems.",
      industry: "Financial Services",
      customerSegment: "Enterprise",
      migrationPhase: "Modernization"
    }
  }
};

class BedrockQueryTester {
  constructor() {
    this.results = {
      overall: { passed: 0, failed: 0, errors: [] },
      scenarios: {},
      promptValidation: {},
      modelValidation: {}
    };
  }

  /**
   * Main test function
   */
  async testBedrockQueryGeneration() {
    console.log('🚀 Starting Bedrock Query Generation Tests');
    console.log('==========================================');
    
    try {
      // Step 1: Validate prompt access
      await this.validatePromptAccess();
      
      // Step 2: Validate model access
      await this.validateModelAccess();
      
      // Step 3: Test query generation scenarios
      for (const [scenarioKey, scenario] of Object.entries(QUERY_TEST_SCENARIOS)) {
        console.log(`\n📋 Testing Scenario: ${scenario.name}`);
        await this.testQueryScenario(scenarioKey, scenario);
      }
      
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
   * Validate prompt access and configuration
   */
  async validatePromptAccess() {
    console.log('\n🔍 Validating Prompt Access...');
    
    const promptIds = [
      { id: config.promptIds.queryPrompt, name: 'Query Generation Prompt' },
      { id: config.promptIds.analysisPrompt, name: 'Analysis Prompt' },
      { id: config.promptIds.analysisPromptNovaPremier, name: 'Nova Premier Analysis Prompt' }
    ];
    
    for (const prompt of promptIds) {
      try {
        console.log(`   📝 Testing prompt: ${prompt.name} (${prompt.id})`);
        
        const command = new GetPromptCommand({
          promptIdentifier: prompt.id
        });
        
        const response = await bedrockAgent.send(command);
        
        if (response.name && response.variants) {
          console.log(`   ✅ Prompt accessible: ${response.name}`);
          console.log(`      Variants: ${response.variants.length}`);
          console.log(`      Created: ${response.createdAt}`);
          
          this.results.promptValidation[prompt.id] = {
            name: prompt.name,
            accessible: true,
            variants: response.variants.length,
            createdAt: response.createdAt
          };
          
          this.results.overall.passed++;
        } else {
          throw new Error('Invalid prompt response structure');
        }
        
      } catch (error) {
        console.error(`   ❌ Prompt access failed: ${error.message}`);
        
        this.results.promptValidation[prompt.id] = {
          name: prompt.name,
          accessible: false,
          error: error.message
        };
        
        this.results.overall.failed++;
        this.results.overall.errors.push(`Prompt ${prompt.name}: ${error.message}`);
      }
    }
  }

  /**
   * Validate model access
   */
  async validateModelAccess() {
    console.log('\n🤖 Validating Model Access...');
    
    const models = [
      { id: 'amazon.titan-text-premier-v1:0', name: 'Titan Text Premier' },
      { id: 'amazon.nova-premier-v1:0', name: 'Nova Premier' },
      { id: 'amazon.titan-text-lite-v1', name: 'Titan Text Lite' }
    ];
    
    for (const model of models) {
      try {
        console.log(`   🧠 Testing model: ${model.name}`);
        
        const testMessage = {
          role: 'user',
          content: [{ text: 'Test message for model validation' }]
        };
        
        const command = new ConverseCommand({
          modelId: model.id,
          messages: [testMessage],
          inferenceConfig: {
            maxTokens: 10,
            temperature: 0.1
          }
        });
        
        const response = await bedrockRuntime.send(command);
        
        if (response.output && response.output.message) {
          console.log(`   ✅ Model accessible: ${model.name}`);
          console.log(`      Usage: ${response.usage.inputTokens} input, ${response.usage.outputTokens} output tokens`);
          
          this.results.modelValidation[model.id] = {
            name: model.name,
            accessible: true,
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens
          };
          
          this.results.overall.passed++;
        } else {
          throw new Error('Invalid model response structure');
        }
        
      } catch (error) {
        console.error(`   ❌ Model access failed: ${error.message}`);
        
        this.results.modelValidation[model.id] = {
          name: model.name,
          accessible: false,
          error: error.message
        };
        
        this.results.overall.failed++;
        this.results.overall.errors.push(`Model ${model.name}: ${error.message}`);
      }
    }
  }

  /**
   * Test query generation scenario
   */
  async testQueryScenario(scenarioKey, scenario) {
    const startTime = Date.now();
    
    try {
      console.log(`   📤 Generating query for scenario...`);
      
      // Import and execute the query generation automation
      const queryAutomation = require('../automations/invokeBedrockQueryPrompt-v3');
      const result = await queryAutomation.execute(scenario.data);
      
      const duration = Date.now() - startTime;
      
      // Validate query generation result
      const validation = this.validateQueryResult(result, scenario);
      
      this.results.scenarios[scenarioKey] = {
        name: scenario.name,
        passed: validation.passed,
        failed: validation.failed,
        errors: validation.errors,
        duration: duration,
        result: result
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
        result: null
      };
      
      this.results.overall.failed++;
      this.results.overall.errors.push(`${scenario.name}: ${error.message}`);
    }
  }

  /**
   * Validate query generation result
   */
  validateQueryResult(result, scenario) {
    const validation = { passed: 0, failed: 0, errors: [] };
    
    // Check result structure
    if (result.status === 'success') {
      validation.passed++;
    } else {
      validation.failed++;
      validation.errors.push(`Query generation failed: ${result.message || 'Unknown error'}`);
    }
    
    // Check for SQL query in results
    if (result.processResults) {
      try {
        let queryData;
        if (typeof result.processResults === 'string') {
          queryData = JSON.parse(result.processResults);
        } else {
          queryData = result.processResults;
        }
        
        if (queryData.sql_query && queryData.sql_query.includes('SELECT')) {
          validation.passed++;
          console.log(`      Generated SQL: ${queryData.sql_query.substring(0, 100)}...`);
        } else {
          validation.failed++;
          validation.errors.push('Generated query does not contain valid SQL SELECT statement');
        }
        
        // Check for query complexity based on scenario
        if (scenario.data.industry && queryData.sql_query.toLowerCase().includes('industry')) {
          validation.passed++;
        } else if (scenario.data.industry) {
          validation.errors.push('Query does not appear to consider industry parameter');
        }
        
      } catch (error) {
        validation.failed++;
        validation.errors.push(`Invalid query result format: ${error.message}`);
      }
    } else {
      validation.failed++;
      validation.errors.push('No query results returned');
    }
    
    return validation;
  }

  /**
   * Test error handling scenarios
   */
  async testErrorHandling() {
    console.log('\n🛡️ Testing Error Handling...');
    
    const errorScenarios = [
      {
        name: 'Missing required fields',
        data: { CustomerName: 'Test' }, // Missing required fields
      },
      {
        name: 'Invalid prompt ID',
        data: {
          CustomerName: 'Test Customer',
          region: 'United States',
          closeDate: '2025-06-15',
          oppName: 'Test Opportunity',
          oppDescription: 'Test description with sufficient length for validation requirements'
        },
        modifyConfig: () => {
          // Temporarily modify config to use invalid prompt ID
          const originalPromptId = config.promptIds.queryPrompt;
          config.promptIds.queryPrompt = 'INVALID_PROMPT_ID';
          return () => { config.promptIds.queryPrompt = originalPromptId; };
        }
      }
    ];
    
    for (const errorScenario of errorScenarios) {
      try {
        console.log(`   🧪 Testing: ${errorScenario.name}`);
        
        let restoreConfig = null;
        if (errorScenario.modifyConfig) {
          restoreConfig = errorScenario.modifyConfig();
        }
        
        const queryAutomation = require('../automations/invokeBedrockQueryPrompt-v3');
        const result = await queryAutomation.execute(errorScenario.data);
        
        if (restoreConfig) {
          restoreConfig();
        }
        
        if (result.status === 'error') {
          console.log(`   ✅ Error handling correct: ${result.message}`);
          this.results.overall.passed++;
        } else {
          console.log(`   ❌ Expected error but got success`);
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
    console.log('\n📊 Bedrock Query Generation Test Report');
    console.log('=======================================');
    
    const totalTests = this.results.overall.passed + this.results.overall.failed;
    const successRate = totalTests > 0 ? (this.results.overall.passed / totalTests * 100).toFixed(1) : 0;
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${this.results.overall.passed}`);
    console.log(`   Failed: ${this.results.overall.failed}`);
    console.log(`   Success Rate: ${successRate}%`);
    
    // Prompt validation results
    console.log(`\n📝 Prompt Validation:`);
    Object.entries(this.results.promptValidation).forEach(([promptId, result]) => {
      const status = result.accessible ? '✅' : '❌';
      console.log(`   ${status} ${result.name}: ${result.accessible ? 'Accessible' : result.error}`);
    });
    
    // Model validation results
    console.log(`\n🤖 Model Validation:`);
    Object.entries(this.results.modelValidation).forEach(([modelId, result]) => {
      const status = result.accessible ? '✅' : '❌';
      console.log(`   ${status} ${result.name}: ${result.accessible ? 'Accessible' : result.error}`);
    });
    
    // Scenario results
    console.log(`\n🎯 Query Generation Scenarios:`);
    Object.entries(this.results.scenarios).forEach(([key, scenario]) => {
      const status = scenario.failed === 0 ? '✅' : '❌';
      console.log(`   ${status} ${scenario.name}: ${scenario.passed} passed, ${scenario.failed} failed (${scenario.duration}ms)`);
      
      if (scenario.errors.length > 0) {
        scenario.errors.forEach(error => {
          console.log(`      - ${error}`);
        });
      }
    });
    
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
      console.log(`   ✅ All tests passed! Bedrock query generation is functioning correctly.`);
    } else {
      console.log(`   🔧 ${this.results.overall.failed} issues need to be addressed.`);
    }
    
    const accessiblePrompts = Object.values(this.results.promptValidation).filter(p => p.accessible).length;
    const totalPrompts = Object.keys(this.results.promptValidation).length;
    if (accessiblePrompts < totalPrompts) {
      console.log(`   ⚠️ Only ${accessiblePrompts}/${totalPrompts} prompts are accessible - check prompt IDs in environment variables`);
    }
    
    const accessibleModels = Object.values(this.results.modelValidation).filter(m => m.accessible).length;
    const totalModels = Object.keys(this.results.modelValidation).length;
    if (accessibleModels < totalModels) {
      console.log(`   ⚠️ Only ${accessibleModels}/${totalModels} models are accessible - check model permissions`);
    }
    
    console.log('\n🏁 Bedrock Query Generation Tests Complete');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new BedrockQueryTester();
  tester.testBedrockQueryGeneration().catch(error => {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  });
}

module.exports = { BedrockQueryTester, QUERY_TEST_SCENARIOS, TEST_CONFIG };