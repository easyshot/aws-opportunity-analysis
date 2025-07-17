/**
 * Testing Framework
 * 
 * Comprehensive testing and validation framework for AWS Opportunity Analysis application.
 * Implements Requirement 9: Comprehensive testing and validation tools
 */

const express = require('express');
const { HealthCheckService } = require('./health-check-service');
const { DiagnosticService } = require('./diagnostic-service');
const { ConnectivityReporter } = require('./connectivity-reporter');
const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');

class TestingFramework {
  constructor() {
    this.healthCheck = new HealthCheckService();
    this.diagnostic = new DiagnosticService();
    this.reporter = new ConnectivityReporter();
    this.testScenarios = {};
    this.errorScenarios = {};
    this.performanceTests = {};
    this.validationTests = {};
    this.initialized = false;
  }

  /**
   * Initialize the testing framework
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🚀 Initializing Testing Framework...');
    
    await this.healthCheck.initialize();
    await this.diagnostic.initialize();
    
    // Load test scenarios
    await this.loadTestScenarios();
    
    // Load error scenarios
    await this.loadErrorScenarios();
    
    // Load performance tests
    await this.loadPerformanceTests();
    
    // Load validation tests
    await this.loadValidationTests();
    
    this.initialized = true;
    console.log('✅ Testing Framework initialized successfully');
  }

  /**
   * Register health check endpoints with Express app
   * Implements Requirement 9.1: Health check endpoints for all services
   */
  registerHealthCheckEndpoints(app) {
    if (!app) throw new Error('Express app is required');
    
    console.log('🔄 Registering health check endpoints...');
    
    // Main health check endpoint
    app.get('/api/health', async (req, res) => {
      try {
        const results = await this.healthCheck.runFullHealthCheck();
        const overallHealth = this.calculateOverallHealth(results);
        
        res.status(overallHealth === 'healthy' ? 200 : 503).json({
          status: overallHealth,
          timestamp: new Date().toISOString(),
          services: results.map(r => ({
            name: r.service,
            status: r.status,
            responseTime: r.responseTime
          }))
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Individual service health check endpoints
    app.get('/api/health/bedrock', async (req, res) => {
      try {
        const bedrockAgentResult = await this.healthCheck.checkBedrockAgent();
        const bedrockRuntimeResult = await this.healthCheck.checkBedrockRuntime();
        const bedrockPromptsResult = await this.healthCheck.checkBedrockPrompts();
        
        const overallStatus = this.calculateServiceGroupHealth([
          bedrockAgentResult, bedrockRuntimeResult, bedrockPromptsResult
        ]);
        
        res.status(overallStatus === 'healthy' ? 200 : 503).json({
          service: 'Bedrock',
          status: overallStatus,
          timestamp: new Date().toISOString(),
          components: {
            agent: bedrockAgentResult,
            runtime: bedrockRuntimeResult,
            prompts: bedrockPromptsResult
          }
        });
      } catch (error) {
        res.status(500).json({
          service: 'Bedrock',
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    app.get('/api/health/lambda', async (req, res) => {
      try {
        const result = await this.healthCheck.checkLambdaFunction();
        
        res.status(result.status === 'healthy' ? 200 : 503).json({
          service: 'Lambda',
          status: result.status,
          timestamp: new Date().toISOString(),
          details: result
        });
      } catch (error) {
        res.status(500).json({
          service: 'Lambda',
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    app.get('/api/health/athena', async (req, res) => {
      try {
        const databaseResult = await this.healthCheck.checkAthenaDatabase();
        const s3Result = await this.healthCheck.checkAthenaS3Access();
        
        const overallStatus = this.calculateServiceGroupHealth([
          databaseResult, s3Result
        ]);
        
        res.status(overallStatus === 'healthy' ? 200 : 503).json({
          service: 'Athena',
          status: overallStatus,
          timestamp: new Date().toISOString(),
          components: {
            database: databaseResult,
            s3Access: s3Result
          }
        });
      } catch (error) {
        res.status(500).json({
          service: 'Athena',
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    app.get('/api/health/dynamodb', async (req, res) => {
      try {
        const result = await this.healthCheck.checkDynamoDBTables();
        
        res.status(result.status === 'healthy' ? 200 : 503).json({
          service: 'DynamoDB',
          status: result.status,
          timestamp: new Date().toISOString(),
          details: result
        });
      } catch (error) {
        res.status(500).json({
          service: 'DynamoDB',
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    app.get('/api/health/eventbridge', async (req, res) => {
      try {
        const result = await this.healthCheck.checkEventBridge();
        
        res.status(result.status === 'healthy' ? 200 : 503).json({
          service: 'EventBridge',
          status: result.status,
          timestamp: new Date().toISOString(),
          details: result
        });
      } catch (error) {
        res.status(500).json({
          service: 'EventBridge',
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Diagnostic endpoint
    app.get('/api/diagnostics', async (req, res) => {
      try {
        const report = await this.diagnostic.runDiagnostics();
        
        res.status(200).json({
          status: 'success',
          timestamp: new Date().toISOString(),
          report: {
            summary: report.summary,
            recommendations: report.recommendations
          }
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Full diagnostic report endpoint
    app.get('/api/diagnostics/full', async (req, res) => {
      try {
        const report = await this.diagnostic.runDiagnostics();
        
        res.status(200).json({
          status: 'success',
          timestamp: new Date().toISOString(),
          report
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    console.log('✅ Health check endpoints registered');
  }

  /**
   * Load test scenarios from configuration
   * Implements Requirement 9.2: Test scenarios for major workflow validation
   */
  async loadTestScenarios() {
    console.log('📚 Loading test scenarios...');
    
    // Define standard test scenarios
    this.testScenarios = {
      basicOpportunity: {
        name: 'Basic Opportunity Analysis',
        description: 'Tests the basic opportunity analysis workflow with minimal inputs',
        input: {
          customerName: 'Acme Corporation',
          customerRegion: 'United States',
          closeDate: '2025-12-31',
          description: 'Standard enterprise cloud migration project with focus on cost optimization and performance improvements.',
          timeToLaunch: 6,
          useNovaPremier: false
        },
        validations: [
          { field: 'methodology', type: 'required' },
          { field: 'findings', type: 'required' },
          { field: 'riskFactors', type: 'required' },
          { field: 'similarProjects', type: 'required' },
          { field: 'rationale', type: 'required' },
          { field: 'fullAnalysis', type: 'required' }
        ],
        performance: {
          maxResponseTime: 30000 // 30 seconds
        }
      },
      
      complexOpportunity: {
        name: 'Complex Opportunity Analysis',
        description: 'Tests the full opportunity analysis workflow with all features',
        input: {
          customerName: 'Global Enterprises Inc.',
          customerRegion: 'Germany',
          closeDate: '2026-06-30',
          description: 'Comprehensive digital transformation initiative involving migration of legacy systems to cloud-native architecture with focus on AI/ML capabilities, real-time analytics, and global scalability requirements. Project includes data lake implementation and business intelligence dashboards.',
          timeToLaunch: 12,
          useNovaPremier: true
        },
        validations: [
          { field: 'methodology', type: 'required' },
          { field: 'findings', type: 'required' },
          { field: 'riskFactors', type: 'required' },
          { field: 'similarProjects', type: 'required' },
          { field: 'rationale', type: 'required' },
          { field: 'fullAnalysis', type: 'required' },
          { field: 'fundingOptions', type: 'required' },
          { field: 'followOnOpportunities', type: 'required' }
        ],
        performance: {
          maxResponseTime: 45000 // 45 seconds
        }
      },
      
      fundingAnalysis: {
        name: 'Funding Analysis',
        description: 'Tests the funding analysis workflow',
        input: {
          customerName: 'Startup Innovations',
          customerRegion: 'United States',
          closeDate: '2025-09-30',
          description: 'Early-stage startup seeking cloud infrastructure for new SaaS product launch with limited initial budget but plans for rapid scaling.',
          timeToLaunch: 3,
          useNovaPremier: true,
          requestFundingAnalysis: true
        },
        validations: [
          { field: 'fundingOptions', type: 'required' },
          { field: 'fundingOptions.recommendations', type: 'required' },
          { field: 'fundingOptions.timeline', type: 'required' },
          { field: 'fundingOptions.budgetImpact', type: 'required' }
        ],
        performance: {
          maxResponseTime: 35000 // 35 seconds
        }
      },
      
      followOnAnalysis: {
        name: 'Follow-On Opportunity Analysis',
        description: 'Tests the follow-on opportunity identification workflow',
        input: {
          customerName: 'Tech Solutions Ltd',
          customerRegion: 'Japan',
          closeDate: '2025-10-15',
          description: 'Established technology company expanding their existing cloud footprint with new data analytics capabilities and machine learning models.',
          timeToLaunch: 8,
          useNovaPremier: true,
          requestFollowOnAnalysis: true
        },
        validations: [
          { field: 'followOnOpportunities', type: 'required' },
          { field: 'followOnOpportunities.recommendations', type: 'required' },
          { field: 'followOnOpportunities.timeline', type: 'required' },
          { field: 'followOnOpportunities.potentialValue', type: 'required' }
        ],
        performance: {
          maxResponseTime: 35000 // 35 seconds
        }
      }
    };
    
    // Try to load custom scenarios if available
    try {
      const customScenariosPath = path.join(process.cwd(), 'tests', 'scenarios.json');
      const customScenarios = JSON.parse(await fs.readFile(customScenariosPath, 'utf8'));
      
      // Merge custom scenarios with standard ones
      this.testScenarios = {
        ...this.testScenarios,
        ...customScenarios
      };
      
      console.log(`✅ Loaded ${Object.keys(customScenarios).length} custom test scenarios`);
    } catch (error) {
      console.log('ℹ️ No custom test scenarios found, using standard scenarios');
    }
    
    console.log(`✅ Loaded ${Object.keys(this.testScenarios).length} test scenarios`);
  }

  /**
   * Load error scenarios for testing error handling
   * Implements Requirement 9.5: Error scenario testing
   */
  async loadErrorScenarios() {
    console.log('⚠️ Loading error scenarios...');
    
    // Define standard error scenarios
    this.errorScenarios = {
      invalidInput: {
        name: 'Invalid Input Validation',
        description: 'Tests input validation error handling',
        input: {
          customerName: '',
          customerRegion: '',
          closeDate: 'invalid-date',
          description: 'Too short',
          timeToLaunch: -1
        },
        expectedErrors: [
          { field: 'customerName', type: 'required' },
          { field: 'customerRegion', type: 'required' },
          { field: 'closeDate', type: 'format' },
          { field: 'description', type: 'minLength' },
          { field: 'timeToLaunch', type: 'range' }
        ]
      },
      
      bedrockTimeout: {
        name: 'Bedrock Timeout Handling',
        description: 'Tests handling of Bedrock service timeouts',
        input: {
          customerName: 'Timeout Test Corp',
          customerRegion: 'United States',
          closeDate: '2025-12-31',
          description: 'This description contains the special token SIMULATE_BEDROCK_TIMEOUT that should trigger a simulated timeout in the test environment.',
          timeToLaunch: 6
        },
        expectedErrors: [
          { service: 'bedrock', type: 'timeout' }
        ],
        expectedBehavior: {
          shouldFallback: true,
          maxResponseTime: 45000 // 45 seconds (including timeout and fallback)
        }
      },
      
      athenaError: {
        name: 'Athena Query Error Handling',
        description: 'Tests handling of Athena query execution errors',
        input: {
          customerName: 'Query Error Inc',
          customerRegion: 'United States',
          closeDate: '2025-12-31',
          description: 'This description contains the special token SIMULATE_ATHENA_ERROR that should trigger a simulated query error in the test environment.',
          timeToLaunch: 6
        },
        expectedErrors: [
          { service: 'athena', type: 'queryExecution' }
        ],
        expectedBehavior: {
          shouldRetry: true,
          shouldFallback: true,
          maxResponseTime: 60000 // 60 seconds (including retries and fallback)
        }
      },
      
      networkError: {
        name: 'Network Error Handling',
        description: 'Tests handling of network connectivity issues',
        input: {
          customerName: 'Network Issues LLC',
          customerRegion: 'United States',
          closeDate: '2025-12-31',
          description: 'This description contains the special token SIMULATE_NETWORK_ERROR that should trigger a simulated network error in the test environment.',
          timeToLaunch: 6
        },
        expectedErrors: [
          { type: 'network' }
        ],
        expectedBehavior: {
          shouldRetry: true,
          shouldFallback: true,
          maxResponseTime: 60000 // 60 seconds (including retries and fallback)
        }
      },
      
      throttlingError: {
        name: 'Service Throttling Handling',
        description: 'Tests handling of AWS service throttling',
        input: {
          customerName: 'Throttled Services Co',
          customerRegion: 'United States',
          closeDate: '2025-12-31',
          description: 'This description contains the special token SIMULATE_THROTTLING that should trigger a simulated throttling error in the test environment.',
          timeToLaunch: 6
        },
        expectedErrors: [
          { type: 'throttling' }
        ],
        expectedBehavior: {
          shouldRetry: true,
          shouldBackoff: true,
          maxResponseTime: 90000 // 90 seconds (including backoff and retries)
        }
      }
    };
    
    // Try to load custom error scenarios if available
    try {
      const customScenariosPath = path.join(process.cwd(), 'tests', 'error-scenarios.json');
      const customScenarios = JSON.parse(await fs.readFile(customScenariosPath, 'utf8'));
      
      // Merge custom scenarios with standard ones
      this.errorScenarios = {
        ...this.errorScenarios,
        ...customScenarios
      };
      
      console.log(`✅ Loaded ${Object.keys(customScenarios).length} custom error scenarios`);
    } catch (error) {
      console.log('ℹ️ No custom error scenarios found, using standard scenarios');
    }
    
    console.log(`✅ Loaded ${Object.keys(this.errorScenarios).length} error scenarios`);
  }

  /**
   * Load performance tests
   * Implements Requirement 9.4: Performance testing with realistic data loads
   */
  async loadPerformanceTests() {
    console.log('⚡ Loading performance tests...');
    
    // Define standard performance tests
    this.performanceTests = {
      singleUserBaseline: {
        name: 'Single User Baseline',
        description: 'Establishes baseline performance with a single user',
        concurrentUsers: 1,
        duration: 60, // seconds
        scenarios: ['basicOpportunity'],
        thresholds: {
          responseTime: {
            p50: 15000, // 15 seconds
            p90: 25000, // 25 seconds
            p95: 30000  // 30 seconds
          },
          errorRate: {
            max: 1 // 1%
          }
        }
      },
      
      lightLoad: {
        name: 'Light Load Test',
        description: 'Tests performance under light load conditions',
        concurrentUsers: 5,
        duration: 300, // 5 minutes
        scenarios: ['basicOpportunity', 'complexOpportunity'],
        thresholds: {
          responseTime: {
            p50: 20000, // 20 seconds
            p90: 30000, // 30 seconds
            p95: 40000  // 40 seconds
          },
          errorRate: {
            max: 5 // 5%
          }
        }
      },
      
      moderateLoad: {
        name: 'Moderate Load Test',
        description: 'Tests performance under moderate load conditions',
        concurrentUsers: 10,
        duration: 600, // 10 minutes
        scenarios: ['basicOpportunity', 'complexOpportunity', 'fundingAnalysis'],
        thresholds: {
          responseTime: {
            p50: 25000, // 25 seconds
            p90: 40000, // 40 seconds
            p95: 50000  // 50 seconds
          },
          errorRate: {
            max: 10 // 10%
          }
        }
      },
      
      peakLoad: {
        name: 'Peak Load Test',
        description: 'Tests performance under peak load conditions',
        concurrentUsers: 20,
        duration: 900, // 15 minutes
        scenarios: ['basicOpportunity', 'complexOpportunity', 'fundingAnalysis', 'followOnAnalysis'],
        thresholds: {
          responseTime: {
            p50: 30000, // 30 seconds
            p90: 50000, // 50 seconds
            p95: 60000  // 60 seconds
          },
          errorRate: {
            max: 15 // 15%
          }
        }
      },
      
      enduranceTest: {
        name: 'Endurance Test',
        description: 'Tests system stability over an extended period',
        concurrentUsers: 5,
        duration: 3600, // 1 hour
        scenarios: ['basicOpportunity', 'complexOpportunity'],
        thresholds: {
          responseTime: {
            p50: 25000, // 25 seconds
            p90: 40000, // 40 seconds
            p95: 50000  // 50 seconds
          },
          errorRate: {
            max: 5 // 5%
          },
          stability: {
            maxResponseTimeIncrease: 20 // 20% increase over time is acceptable
          }
        }
      }
    };
    
    // Try to load custom performance tests if available
    try {
      const customTestsPath = path.join(process.cwd(), 'tests', 'performance-tests.json');
      const customTests = JSON.parse(await fs.readFile(customTestsPath, 'utf8'));
      
      // Merge custom tests with standard ones
      this.performanceTests = {
        ...this.performanceTests,
        ...customTests
      };
      
      console.log(`✅ Loaded ${Object.keys(customTests).length} custom performance tests`);
    } catch (error) {
      console.log('ℹ️ No custom performance tests found, using standard tests');
    }
    
    console.log(`✅ Loaded ${Object.keys(this.performanceTests).length} performance tests`);
  }

  /**
   * Load validation tests for deployment verification
   * Implements Requirement 9.6: Automated validation tests for deployment verification
   */
  async loadValidationTests() {
    console.log('✅ Loading validation tests...');
    
    // Define standard validation tests
    this.validationTests = {
      preDeployment: {
        name: 'Pre-Deployment Validation',
        description: 'Validates system readiness before deployment',
        tests: [
          { name: 'AWS Credentials', test: 'checkAWSCredentials' },
          { name: 'Environment Variables', test: 'validateEnvironmentVariables' },
          { name: 'Required Dependencies', test: 'validateDependencies' },
          { name: 'Service Connectivity', test: 'runFullHealthCheck' }
        ],
        requiredPassRate: 100 // All tests must pass
      },
      
      postDeployment: {
        name: 'Post-Deployment Validation',
        description: 'Validates system functionality after deployment',
        tests: [
          { name: 'Service Health', test: 'runFullHealthCheck' },
          { name: 'Basic Workflow', test: 'testScenario', params: { scenario: 'basicOpportunity' } },
          { name: 'Error Handling', test: 'testErrorScenario', params: { scenario: 'invalidInput' } },
          { name: 'Performance Baseline', test: 'runPerformanceTest', params: { test: 'singleUserBaseline' } }
        ],
        requiredPassRate: 100 // All tests must pass
      },
      
      dailyHealthCheck: {
        name: 'Daily Health Check',
        description: 'Daily automated health check for monitoring',
        tests: [
          { name: 'Service Health', test: 'runFullHealthCheck' },
          { name: 'Basic Workflow', test: 'testScenario', params: { scenario: 'basicOpportunity' } }
        ],
        requiredPassRate: 100 // All tests must pass
      },
      
      weeklyFullCheck: {
        name: 'Weekly Full Validation',
        description: 'Comprehensive weekly validation of all functionality',
        tests: [
          { name: 'Service Health', test: 'runFullHealthCheck' },
          { name: 'Basic Workflow', test: 'testScenario', params: { scenario: 'basicOpportunity' } },
          { name: 'Complex Workflow', test: 'testScenario', params: { scenario: 'complexOpportunity' } },
          { name: 'Funding Analysis', test: 'testScenario', params: { scenario: 'fundingAnalysis' } },
          { name: 'Follow-On Analysis', test: 'testScenario', params: { scenario: 'followOnAnalysis' } },
          { name: 'Error Handling', test: 'testErrorScenario', params: { scenario: 'invalidInput' } },
          { name: 'Performance Check', test: 'runPerformanceTest', params: { test: 'lightLoad' } }
        ],
        requiredPassRate: 90 // 90% of tests must pass
      }
    };
    
    // Try to load custom validation tests if available
    try {
      const customTestsPath = path.join(process.cwd(), 'tests', 'validation-tests.json');
      const customTests = JSON.parse(await fs.readFile(customTestsPath, 'utf8'));
      
      // Merge custom tests with standard ones
      this.validationTests = {
        ...this.validationTests,
        ...customTests
      };
      
      console.log(`✅ Loaded ${Object.keys(customTests).length} custom validation tests`);
    } catch (error) {
      console.log('ℹ️ No custom validation tests found, using standard tests');
    }
    
    console.log(`✅ Loaded ${Object.keys(this.validationTests).length} validation tests`);
  }

  /**
   * Run a specific test scenario
   * Implements Requirement 9.2: Test scenarios for major workflow validation
   */
  async runTestScenario(scenarioName) {
    if (!this.initialized) await this.initialize();
    
    const scenario = this.testScenarios[scenarioName];
    if (!scenario) {
      throw new Error(`Test scenario '${scenarioName}' not found`);
    }
    
    console.log(`🧪 Running test scenario: ${scenario.name}`);
    console.log(`Description: ${scenario.description}`);
    
    const startTime = Date.now();
    const result = {
      scenario: scenarioName,
      name: scenario.name,
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'running',
      validations: [],
      performance: {}
    };
    
    try {
      // Make API request to analyze endpoint
      const response = await this.makeAnalysisRequest(scenario.input);
      
      // Record response time
      const responseTime = Date.now() - startTime;
      result.duration = responseTime;
      
      // Check performance requirements
      const performanceValid = !scenario.performance?.maxResponseTime || 
                              responseTime <= scenario.performance.maxResponseTime;
      
      result.performance = {
        responseTime,
        threshold: scenario.performance?.maxResponseTime,
        valid: performanceValid
      };
      
      // Validate response against expected validations
      if (scenario.validations) {
        for (const validation of scenario.validations) {
          const fieldValue = this.getNestedValue(response, validation.field);
          const isValid = this.validateField(fieldValue, validation.type);
          
          result.validations.push({
            field: validation.field,
            type: validation.type,
            valid: isValid,
            value: typeof fieldValue === 'object' ? '[Object]' : fieldValue
          });
        }
      }
      
      // Determine overall status
      const allValidationsPass = result.validations.every(v => v.valid);
      result.status = allValidationsPass && performanceValid ? 'passed' : 'failed';
      
      console.log(`${result.status === 'passed' ? '✅' : '❌'} Test scenario ${result.status}`);
      console.log(`Response time: ${responseTime}ms`);
      
      return result;
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      result.duration = Date.now() - startTime;
      
      console.log(`❌ Test scenario failed with error: ${error.message}`);
      
      return result;
    }
  }

  /**
   * Run an error scenario test
   * Implements Requirement 9.5: Error scenario testing
   */
  async runErrorScenario(scenarioName) {
    if (!this.initialized) await this.initialize();
    
    const scenario = this.errorScenarios[scenarioName];
    if (!scenario) {
      throw new Error(`Error scenario '${scenarioName}' not found`);
    }
    
    console.log(`⚠️ Running error scenario: ${scenario.name}`);
    console.log(`Description: ${scenario.description}`);
    
    const startTime = Date.now();
    const result = {
      scenario: scenarioName,
      name: scenario.name,
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'running',
      expectedErrors: scenario.expectedErrors,
      actualErrors: [],
      behaviorValidation: {}
    };
    
    try {
      // Make API request to analyze endpoint
      const response = await this.makeAnalysisRequest(scenario.input);
      
      // Record response time
      const responseTime = Date.now() - startTime;
      result.duration = responseTime;
      
      // Check if expected errors were returned
      if (response.errors && Array.isArray(response.errors)) {
        result.actualErrors = response.errors;
        
        // Validate that all expected errors were found
        const allErrorsFound = scenario.expectedErrors.every(expected => {
          return response.errors.some(actual => 
            (expected.field && actual.field === expected.field) ||
            (expected.service && actual.service === expected.service) ||
            (expected.type && actual.type === expected.type)
          );
        });
        
        result.errorsValidation = {
          expected: scenario.expectedErrors,
          actual: response.errors,
          valid: allErrorsFound
        };
      } else {
        // No errors were returned
        result.errorsValidation = {
          expected: scenario.expectedErrors,
          actual: [],
          valid: false
        };
      }
      
      // Check expected behavior
      if (scenario.expectedBehavior) {
        const behaviorValid = this.validateErrorBehavior(scenario.expectedBehavior, response, responseTime);
        result.behaviorValidation = {
          expected: scenario.expectedBehavior,
          actual: {
            responseTime,
            fallbackUsed: response.fallbackUsed || false,
            retryAttempts: response.retryAttempts || 0
          },
          valid: behaviorValid
        };
      }
      
      // Determine overall status
      const errorsValid = result.errorsValidation?.valid || false;
      const behaviorValid = result.behaviorValidation?.valid !== false; // If not checked, consider valid
      
      result.status = errorsValid && behaviorValid ? 'passed' : 'failed';
      
      console.log(`${result.status === 'passed' ? '✅' : '❌'} Error scenario ${result.status}`);
      console.log(`Response time: ${responseTime}ms`);
      
      return result;
    } catch (error) {
      // For error scenarios, an exception might be expected
      const isExpectedError = scenario.expectedErrors.some(expected => 
        error.message.includes(expected.type) || 
        error.message.includes(expected.service)
      );
      
      result.status = isExpectedError ? 'passed' : 'error';
      result.error = error.message;
      result.duration = Date.now() - startTime;
      
      if (isExpectedError) {
        console.log(`✅ Error scenario passed (expected error thrown)`);
      } else {
        console.log(`❌ Error scenario failed with unexpected error: ${error.message}`);
      }
      
      return result;
    }
  }

  /**
   * Run a performance test
   * Implements Requirement 9.4: Performance testing with realistic data loads
   */
  async runPerformanceTest(testName) {
    if (!this.initialized) await this.initialize();
    
    const test = this.performanceTests[testName];
    if (!test) {
      throw new Error(`Performance test '${testName}' not found`);
    }
    
    console.log(`⚡ Running performance test: ${test.name}`);
    console.log(`Description: ${test.description}`);
    console.log(`Configuration: ${test.concurrentUsers} concurrent users, ${test.duration} seconds`);
    
    const startTime = Date.now();
    const result = {
      test: testName,
      name: test.name,
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'running',
      metrics: {
        samples: 0,
        successRate: 0,
        errorRate: 0,
        responseTime: {
          min: 0,
          max: 0,
          mean: 0,
          median: 0,
          p90: 0,
          p95: 0,
          p99: 0
        }
      },
      thresholds: {
        responseTime: {
          valid: false,
          details: {}
        },
        errorRate: {
          valid: false,
          details: {}
        }
      }
    };
    
    try {
      // Create a pool of virtual users
      const userCount = test.concurrentUsers;
      const testDuration = test.duration * 1000; // Convert to milliseconds
      const endTime = startTime + testDuration;
      
      console.log(`🧑‍🤝‍🧑 Spawning ${userCount} virtual users...`);
      
      // Track all response times
      const responseTimes = [];
      let successCount = 0;
      let errorCount = 0;
      
      // Create promises for all virtual users
      const userPromises = [];
      
      for (let i = 0; i < userCount; i++) {
        userPromises.push((async () => {
          const userId = `user-${i + 1}`;
          console.log(`👤 ${userId} started`);
          
          // Keep making requests until the test duration is reached
          while (Date.now() < endTime) {
            try {
              // Select a random scenario from the test's scenarios
              const scenarioName = test.scenarios[Math.floor(Math.random() * test.scenarios.length)];
              const scenario = this.testScenarios[scenarioName];
              
              if (!scenario) {
                console.error(`❌ ${userId}: Scenario '${scenarioName}' not found`);
                continue;
              }
              
              // Make the request and measure response time
              const requestStart = Date.now();
              await this.makeAnalysisRequest(scenario.input);
              const responseTime = Date.now() - requestStart;
              
              // Record the response time
              responseTimes.push(responseTime);
              successCount++;
              
              console.log(`✅ ${userId}: Request completed in ${responseTime}ms`);
              
              // Add some randomness to avoid all users making requests at the same time
              await this.sleep(Math.random() * 1000);
            } catch (error) {
              errorCount++;
              console.error(`❌ ${userId}: Request failed - ${error.message}`);
              
              // Wait a bit before retrying
              await this.sleep(2000);
            }
          }
          
          console.log(`👤 ${userId} finished`);
        })());
      }
      
      // Wait for all users to complete
      await Promise.all(userPromises);
      
      // Calculate metrics
      const totalRequests = successCount + errorCount;
      const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
      
      // Sort response times for percentile calculations
      responseTimes.sort((a, b) => a - b);
      
      const getPercentile = (arr, p) => {
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[index];
      };
      
      result.metrics = {
        samples: totalRequests,
        successRate,
        errorRate,
        responseTime: {
          min: responseTimes[0] || 0,
          max: responseTimes[responseTimes.length - 1] || 0,
          mean: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          median: getPercentile(responseTimes, 50),
          p90: getPercentile(responseTimes, 90),
          p95: getPercentile(responseTimes, 95),
          p99: getPercentile(responseTimes, 99)
        }
      };
      
      // Validate against thresholds
      if (test.thresholds) {
        // Response time thresholds
        if (test.thresholds.responseTime) {
          const rtThresholds = test.thresholds.responseTime;
          const rtResults = {};
          
          for (const [percentile, threshold] of Object.entries(rtThresholds)) {
            const actual = result.metrics.responseTime[percentile];
            rtResults[percentile] = {
              threshold,
              actual,
              valid: actual <= threshold
            };
          }
          
          result.thresholds.responseTime = {
            valid: Object.values(rtResults).every(r => r.valid),
            details: rtResults
          };
        }
        
        // Error rate threshold
        if (test.thresholds.errorRate) {
          const erThreshold = test.thresholds.errorRate.max;
          result.thresholds.errorRate = {
            valid: errorRate <= erThreshold,
            details: {
              threshold: erThreshold,
              actual: errorRate
            }
          };
        }
      }
      
      // Determine overall status
      const responseTimeValid = result.thresholds.responseTime?.valid !== false;
      const errorRateValid = result.thresholds.errorRate?.valid !== false;
      
      result.status = responseTimeValid && errorRateValid ? 'passed' : 'failed';
      result.duration = Date.now() - startTime;
      
      console.log(`${result.status === 'passed' ? '✅' : '❌'} Performance test ${result.status}`);
      console.log(`Total requests: ${totalRequests}`);
      console.log(`Success rate: ${successRate.toFixed(2)}%`);
      console.log(`Error rate: ${errorRate.toFixed(2)}%`);
      console.log(`Response time (p95): ${result.metrics.responseTime.p95}ms`);
      
      return result;
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      result.duration = Date.now() - startTime;
      
      console.log(`❌ Performance test failed with error: ${error.message}`);
      
      return result;
    }
  }

  /**
   * Run a validation test suite
   * Implements Requirement 9.6: Automated validation tests for deployment verification
   */
  async runValidationSuite(suiteName) {
    if (!this.initialized) await this.initialize();
    
    const suite = this.validationTests[suiteName];
    if (!suite) {
      throw new Error(`Validation suite '${suiteName}' not found`);
    }
    
    console.log(`🧪 Running validation suite: ${suite.name}`);
    console.log(`Description: ${suite.description}`);
    
    const startTime = Date.now();
    const result = {
      suite: suiteName,
      name: suite.name,
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'running',
      tests: [],
      summary: {
        total: suite.tests.length,
        passed: 0,
        failed: 0,
        error: 0,
        passRate: 0
      }
    };
    
    try {
      // Run each test in the suite
      for (const test of suite.tests) {
        console.log(`🧪 Running test: ${test.name}`);
        
        const testResult = {
          name: test.name,
          status: 'running',
          duration: 0,
          details: {}
        };
        
        const testStartTime = Date.now();
        
        try {
          // Execute the appropriate test function
          let testOutput;
          
          switch (test.test) {
            case 'checkAWSCredentials':
              testOutput = await this.healthCheck.checkAWSCredentials();
              testResult.status = testOutput.status === 'healthy' ? 'passed' : 'failed';
              break;
              
            case 'validateEnvironmentVariables':
              const envVars = this.diagnostic.validateEnvironmentVariables();
              testResult.status = envVars.missing.length === 0 && envVars.invalid.length === 0 ? 'passed' : 'failed';
              testResult.details = envVars;
              break;
              
            case 'validateDependencies':
              const deps = await this.diagnostic.validateDependencies();
              testResult.status = deps.missing.length === 0 ? 'passed' : 'failed';
              testResult.details = deps;
              break;
              
            case 'runFullHealthCheck':
              const healthResults = await this.healthCheck.runFullHealthCheck();
              const allHealthy = healthResults.every(r => r.status === 'healthy');
              testResult.status = allHealthy ? 'passed' : 'failed';
              testResult.details = {
                services: healthResults.length,
                healthy: healthResults.filter(r => r.status === 'healthy').length,
                unhealthy: healthResults.filter(r => r.status === 'unhealthy').length
              };
              break;
              
            case 'testScenario':
              const scenarioResult = await this.runTestScenario(test.params.scenario);
              testResult.status = scenarioResult.status === 'passed' ? 'passed' : 'failed';
              testResult.details = scenarioResult;
              break;
              
            case 'testErrorScenario':
              const errorResult = await this.runErrorScenario(test.params.scenario);
              testResult.status = errorResult.status === 'passed' ? 'passed' : 'failed';
              testResult.details = errorResult;
              break;
              
            case 'runPerformanceTest':
              const perfResult = await this.runPerformanceTest(test.params.test);
              testResult.status = perfResult.status === 'passed' ? 'passed' : 'failed';
              testResult.details = perfResult;
              break;
              
            default:
              throw new Error(`Unknown test type: ${test.test}`);
          }
          
        } catch (error) {
          testResult.status = 'error';
          testResult.error = error.message;
        }
        
        testResult.duration = Date.now() - testStartTime;
        result.tests.push(testResult);
        
        console.log(`${testResult.status === 'passed' ? '✅' : '❌'} Test ${testResult.status} in ${testResult.duration}ms`);
      }
      
      // Calculate summary
      result.summary.passed = result.tests.filter(t => t.status === 'passed').length;
      result.summary.failed = result.tests.filter(t => t.status === 'failed').length;
      result.summary.error = result.tests.filter(t => t.status === 'error').length;
      result.summary.passRate = (result.summary.passed / result.summary.total) * 100;
      
      // Determine overall status
      result.status = result.summary.passRate >= suite.requiredPassRate ? 'passed' : 'failed';
      result.duration = Date.now() - startTime;
      
      console.log(`${result.status === 'passed' ? '✅' : '❌'} Validation suite ${result.status}`);
      console.log(`Pass rate: ${result.summary.passRate.toFixed(2)}% (required: ${suite.requiredPassRate}%)`);
      console.log(`Total duration: ${result.duration}ms`);
      
      return result;
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      result.duration = Date.now() - startTime;
      
      console.log(`❌ Validation suite failed with error: ${error.message}`);
      
      return result;
    }
  }

  /**
   * Save test results to a file
   */
  async saveTestResults(results, filename) {
    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      
      // Create reports directory if it doesn't exist
      try {
        await fs.access(reportsDir);
      } catch {
        await fs.mkdir(reportsDir, { recursive: true });
      }
      
      const filePath = path.join(reportsDir, filename);
      await fs.writeFile(filePath, JSON.stringify(results, null, 2));
      
      console.log(`✅ Test results saved to: ${filePath}`);
      
      return filePath;
    } catch (error) {
      console.error(`❌ Failed to save test results: ${error.message}`);
      throw error;
    }
  }

  // Helper methods
  
  calculateOverallHealth(results) {
    if (!results || results.length === 0) return 'unknown';
    
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;
    
    if (unhealthyCount > 0) {
      return 'unhealthy';
    } else if (degradedCount > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }
  
  calculateServiceGroupHealth(results) {
    if (!results || results.length === 0) return 'unknown';
    
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;
    
    if (unhealthyCount > 0) {
      return 'unhealthy';
    } else if (degradedCount > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }
  
  async makeAnalysisRequest(input) {
    // This is a mock implementation - in a real system, this would make an actual HTTP request
    // For testing purposes, we'll simulate the API call
    
    console.log(`📡 Making analysis request with input:`, input);
    
    // Simulate API call delay
    await this.sleep(1000);
    
    // Check for special tokens that trigger error scenarios
    if (input.description) {
      if (input.description.includes('SIMULATE_BEDROCK_TIMEOUT')) {
        await this.sleep(10000); // Simulate a long delay
        throw new Error('Bedrock service timeout');
      }
      
      if (input.description.includes('SIMULATE_ATHENA_ERROR')) {
        throw new Error('Athena query execution failed: SYNTAX_ERROR: line 1:8: Table does not exist');
      }
      
      if (input.description.includes('SIMULATE_NETWORK_ERROR')) {
        throw new Error('Network error: ECONNRESET');
      }
      
      if (input.description.includes('SIMULATE_THROTTLING')) {
        throw new Error('ThrottlingException: Rate exceeded');
      }
    }
    
    // For invalid input scenario
    if (!input.customerName || !input.customerRegion) {
      return {
        success: false,
        errors: [
          { field: 'customerName', type: 'required', message: 'Customer name is required' },
          { field: 'customerRegion', type: 'required', message: 'Customer region is required' }
        ]
      };
    }
    
    // Simulate a successful response
    return {
      success: true,
      timestamp: new Date().toISOString(),
      request: {
        customerName: input.customerName,
        customerRegion: input.customerRegion,
        closeDate: input.closeDate,
        timeToLaunch: input.timeToLaunch
      },
      methodology: 'This analysis uses a combination of historical data matching and AI-powered predictive analytics...',
      findings: 'Based on the analysis of similar projects, we predict this opportunity has a 78% chance of success...',
      riskFactors: ['Limited technical resources', 'Aggressive timeline', 'Complex integration requirements'],
      similarProjects: [
        { name: 'Project Alpha', similarity: 0.89, outcome: 'Success' },
        { name: 'Project Beta', similarity: 0.76, outcome: 'Partial Success' }
      ],
      rationale: 'The recommendation is based on the strong alignment with previous successful projects...',
      fullAnalysis: 'Comprehensive analysis of the opportunity reveals several key factors that contribute to the high confidence score...',
      fundingOptions: input.requestFundingAnalysis ? {
        recommendations: ['AWS Credits', 'Proof of Concept Funding', 'Enterprise Discount Program'],
        timeline: '3-6 months',
        budgetImpact: 'Potential 15-20% reduction in initial costs'
      } : undefined,
      followOnOpportunities: input.requestFollowOnAnalysis ? {
        recommendations: ['Managed Services Expansion', 'Data Analytics Implementation', 'Security Assessment'],
        timeline: '6-12 months after initial implementation',
        potentialValue: '$250,000 - $500,000 ARR'
      } : undefined
    };
  }
  
  getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }
    
    return value;
  }
  
  validateField(value, type) {
    if (type === 'required') {
      return value !== undefined && value !== null && value !== '';
    }
    
    if (type === 'array') {
      return Array.isArray(value) && value.length > 0;
    }
    
    if (type === 'object') {
      return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
    }
    
    return true;
  }
  
  validateErrorBehavior(expectedBehavior, response, responseTime) {
    let valid = true;
    
    if (expectedBehavior.maxResponseTime && responseTime > expectedBehavior.maxResponseTime) {
      valid = false;
    }
    
    if (expectedBehavior.shouldFallback && !response.fallbackUsed) {
      valid = false;
    }
    
    if (expectedBehavior.shouldRetry && (!response.retryAttempts || response.retryAttempts === 0)) {
      valid = false;
    }
    
    return valid;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { TestingFramework };