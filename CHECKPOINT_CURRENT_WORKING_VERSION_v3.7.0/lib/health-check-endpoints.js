/**
 * Health Check Endpoints
 * 
 * Express middleware and routes for health check endpoints.
 * Implements Requirement 9.1: Health check endpoints for all services
 */

const { TestingFramework } = require('./testing-framework');
const { HealthCheckService } = require('./health-check-service');
const { DiagnosticService } = require('./diagnostic-service');
const { ConnectivityReporter } = require('./connectivity-reporter');

class HealthCheckEndpoints {
  constructor() {
    this.framework = new TestingFramework();
    this.healthCheck = new HealthCheckService();
    this.diagnostic = new DiagnosticService();
    this.reporter = new ConnectivityReporter();
    this.initialized = false;
  }

  /**
   * Initialize all services
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.framework.initialize();
      await this.healthCheck.initialize();
      await this.diagnostic.initialize();
      
      this.initialized = true;
      console.log('✅ Health Check Endpoints initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Health Check Endpoints:', error.message);
      throw error;
    }
  }

  /**
   * Register all health check endpoints with Express app
   */
  registerEndpoints(app) {
    if (!app) throw new Error('Express app is required');
    
    console.log('🔄 Registering health check endpoints...');
    
    // Main health check endpoint
    app.get('/api/health', this.handleMainHealthCheck.bind(this));
    
    // Individual service health check endpoints
    app.get('/api/health/aws-credentials', this.handleAWSCredentialsCheck.bind(this));
    app.get('/api/health/bedrock', this.handleBedrockCheck.bind(this));
    app.get('/api/health/bedrock/agent', this.handleBedrockAgentCheck.bind(this));
    app.get('/api/health/bedrock/runtime', this.handleBedrockRuntimeCheck.bind(this));
    app.get('/api/health/bedrock/prompts', this.handleBedrockPromptsCheck.bind(this));
    app.get('/api/health/lambda', this.handleLambdaCheck.bind(this));
    app.get('/api/health/athena', this.handleAthenaCheck.bind(this));
    app.get('/api/health/athena/database', this.handleAthenaDatabaseCheck.bind(this));
    app.get('/api/health/athena/s3', this.handleAthenaS3Check.bind(this));
    app.get('/api/health/dynamodb', this.handleDynamoDBCheck.bind(this));
    app.get('/api/health/eventbridge', this.handleEventBridgeCheck.bind(this));
    app.get('/api/health/s3', this.handleS3Check.bind(this));
    
    // Diagnostic endpoints
    app.get('/api/diagnostics', this.handleDiagnostics.bind(this));
    app.get('/api/diagnostics/full', this.handleFullDiagnostics.bind(this));
    app.get('/api/diagnostics/connectivity', this.handleConnectivityReport.bind(this));
    
    // Testing endpoints
    app.get('/api/test/scenario/:scenarioName', this.handleTestScenario.bind(this));
    app.get('/api/test/error-scenario/:scenarioName', this.handleErrorScenario.bind(this));
    app.get('/api/test/performance/:testName', this.handlePerformanceTest.bind(this));
    app.get('/api/test/validation/:suiteName', this.handleValidationSuite.bind(this));
    
    // Comprehensive testing endpoint
    app.post('/api/test/comprehensive', this.handleComprehensiveTest.bind(this));
    
    console.log('✅ Health check endpoints registered');
  }

  /**
   * Main health check endpoint
   */
  async handleMainHealthCheck(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const results = await this.healthCheck.runFullHealthCheck();
      const summary = this.healthCheck.getHealthSummary();
      
      const response = {
        status: summary.overall,
        timestamp: new Date().toISOString(),
        summary: {
          total: summary.total,
          healthy: summary.healthy,
          degraded: summary.degraded,
          unhealthy: summary.unhealthy
        },
        services: results.map(r => ({
          name: r.service,
          status: r.status,
          responseTime: r.responseTime,
          error: r.error || undefined
        }))
      };
      
      const statusCode = summary.overall === 'healthy' ? 200 : 
                        summary.overall === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * AWS Credentials health check
   */
  async handleAWSCredentialsCheck(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const result = await this.healthCheck.checkAWSCredentials();
      
      res.status(result.status === 'healthy' ? 200 : 503).json({
        service: 'AWS Credentials',
        status: result.status,
        timestamp: new Date().toISOString(),
        details: result.details,
        error: result.error
      });
    } catch (error) {
      res.status(500).json({
        service: 'AWS Credentials',
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Bedrock service health check (all components)
   */
  async handleBedrockCheck(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const [agentResult, runtimeResult, promptsResult] = await Promise.all([
        this.healthCheck.checkBedrockAgent(),
        this.healthCheck.checkBedrockRuntime(),
        this.healthCheck.checkBedrockPrompts()
      ]);
      
      const overallStatus = this.calculateServiceGroupHealth([
        agentResult, runtimeResult, promptsResult
      ]);
      
      res.status(overallStatus === 'healthy' ? 200 : 503).json({
        service: 'Bedrock',
        status: overallStatus,
        timestamp: new Date().toISOString(),
        components: {
          agent: {
            status: agentResult.status,
            responseTime: agentResult.responseTime,
            error: agentResult.error
          },
          runtime: {
            status: runtimeResult.status,
            responseTime: runtimeResult.responseTime,
            error: runtimeResult.error
          },
          prompts: {
            status: promptsResult.status,
            responseTime: promptsResult.responseTime,
            error: promptsResult.error,
            details: promptsResult.details
          }
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
  }

  /**
   * Bedrock Agent health check
   */
  async handleBedrockAgentCheck(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const result = await this.healthCheck.checkBedrockAgent();
      
      res.status(result.status === 'healthy' ? 200 : 503).json({
        service: 'Bedrock Agent',
        status: result.status,
        timestamp: new Date().toISOString(),
        responseTime: result.responseTime,
        details: result.details,
        error: result.error
      });
    } catch (error) {
      res.status(500).json({
        service: 'Bedrock Agent',
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Bedrock Runtime health check
   */
  async handleBedrockRuntimeCheck(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const result = await this.healthCheck.checkBedrockRuntime();
      
      res.status(result.status === 'healthy' ? 200 : 503).json({
        service: 'Bedrock Runtime',
        status: result.status,
        timestamp: new Date().toISOString(),
        responseTime: result.responseTime,
        details: result.details,
        error: result.error
      });
    } catch (error) {
      res.status(500).json({
        service: 'Bedrock Runtime',
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Bedrock Prompts health check
   */
  async handleBedrockPromptsCheck(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const result = await this.healthCheck.checkBedrockPrompts();
      
      res.status(result.status === 'healthy' ? 200 : 503).json({
        service: 'Bedrock Prompts',
        status: result.status,
        timestamp: new Date().toISOString(),
        responseTime: result.responseTime,
        details: result.details,
        error: result.error
      });
    } catch (error) {
      res.status(500).json({
        service: 'Bedrock Prompts',
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Lambda function health check
   */
  async handleLambdaCheck(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const result = await this.healthCheck.checkLambdaFunction();
      
      res.status(result.status === 'healthy' ? 200 : 503).json({
        service: 'Lambda Function',
        status: result.status,
        timestamp: new Date().toISOString(),
        responseTime: result.responseTime,
        details: result.details,
        error: result.error
      });
    } catch (error) {
      res.status(500).json({
        service: 'Lambda Function',
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Athena service health check (all components)
   */
  async handleAthenaCheck(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const [databaseResult, s3Result] = await Promise.all([
        this.healthCheck.checkAthenaDatabase(),
        this.healthCheck.checkAthenaS3Access()
      ]);
      
      const overallStatus = this.calculateServiceGroupHealth([
        databaseResult, s3Result
      ]);
      
      res.status(overallStatus === 'healthy' ? 200 : 503).json({
        service: 'Athena',
        status: overallStatus,
        timestamp: new Date().toISOString(),
        components: {
          database: {
            status: databaseResult.status,
            responseTime: databaseResult.responseTime,
            error: databaseResult.error,
            details: databaseResult.details
          },
          s3Access: {
            status: s3Result.status,
            responseTime: s3Result.responseTime,
            error: s3Result.error,
            details: s3Result.details
          }
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
  }

  /**
   * Athena Database health check
   */
  async handleAthenaDatabaseCheck(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const result = await this.healthCheck.checkAthenaDatabase();
      
      res.status(result.status === 'healthy' ? 200 : 503).json({
        service: 'Athena Database',
        status: result.status,
        timestamp: new Date().toISOString(),
        responseTime: result.responseTime,
        details: result.details,
        error: result.error
      });
    } catch (error) {
      res.status(500).json({
        service: 'Athena Database',
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Athena S3 Access health check
   */
  async handleAthenaS3Check(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const result = await this.healthCheck.checkAthenaS3Access();
      
      res.status(result.status === 'healthy' ? 200 : 503).json({
        service: 'Athena S3 Access',
        status: result.status,
        timestamp: new Date().toISOString(),
        responseTime: result.responseTime,
        details: result.details,
        error: result.error
      });
    } catch (error) {
      res.status(500).json({
        service: 'Athena S3 Access',
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * DynamoDB health check
   */
  async handleDynamoDBCheck(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const result = await this.healthCheck.checkDynamoDBTables();
      
      res.status(result.status === 'healthy' ? 200 : 503).json({
        service: 'DynamoDB Tables',
        status: result.status,
        timestamp: new Date().toISOString(),
        responseTime: result.responseTime,
        details: result.details,
        error: result.error
      });
    } catch (error) {
      res.status(500).json({
        service: 'DynamoDB Tables',
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * EventBridge health check
   */
  async handleEventBridgeCheck(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const result = await this.healthCheck.checkEventBridge();
      
      res.status(result.status === 'healthy' ? 200 : 503).json({
        service: 'EventBridge',
        status: result.status,
        timestamp: new Date().toISOString(),
        responseTime: result.responseTime,
        details: result.details,
        error: result.error
      });
    } catch (error) {
      res.status(500).json({
        service: 'EventBridge',
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * S3 Access health check
   */
  async handleS3Check(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const result = await this.healthCheck.checkS3Access();
      
      res.status(result.status === 'healthy' ? 200 : 503).json({
        service: 'S3 Access',
        status: result.status,
        timestamp: new Date().toISOString(),
        responseTime: result.responseTime,
        details: result.details,
        error: result.error
      });
    } catch (error) {
      res.status(500).json({
        service: 'S3 Access',
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Diagnostics endpoint
   */
  async handleDiagnostics(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const report = await this.diagnostic.runDiagnostics();
      
      res.status(200).json({
        status: 'success',
        timestamp: new Date().toISOString(),
        report: {
          summary: report.summary,
          recommendations: report.recommendations.slice(0, 5) // Limit for API response
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Full diagnostics endpoint
   */
  async handleFullDiagnostics(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
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
  }

  /**
   * Connectivity report endpoint
   */
  async handleConnectivityReport(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const healthResults = await this.healthCheck.runFullHealthCheck();
      const connectivityReport = this.reporter.generateReport(healthResults);
      
      res.status(200).json({
        status: 'success',
        timestamp: new Date().toISOString(),
        report: connectivityReport
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test scenario endpoint
   */
  async handleTestScenario(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const { scenarioName } = req.params;
      const result = await this.framework.runTestScenario(scenarioName);
      
      res.status(200).json({
        status: 'success',
        timestamp: new Date().toISOString(),
        result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Error scenario endpoint
   */
  async handleErrorScenario(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const { scenarioName } = req.params;
      const result = await this.framework.runErrorScenario(scenarioName);
      
      res.status(200).json({
        status: 'success',
        timestamp: new Date().toISOString(),
        result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Performance test endpoint
   */
  async handlePerformanceTest(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const { testName } = req.params;
      const result = await this.framework.runPerformanceTest(testName);
      
      res.status(200).json({
        status: 'success',
        timestamp: new Date().toISOString(),
        result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Validation suite endpoint
   */
  async handleValidationSuite(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const { suiteName } = req.params;
      const result = await this.framework.runValidationSuite(suiteName);
      
      res.status(200).json({
        status: 'success',
        timestamp: new Date().toISOString(),
        result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Comprehensive test endpoint
   */
  async handleComprehensiveTest(req, res) {
    try {
      if (!this.initialized) await this.initialize();
      
      const options = req.body || {};
      
      // Run comprehensive testing framework
      const { ComprehensiveTestingFramework } = require('../scripts/run-comprehensive-testing-framework');
      const comprehensiveFramework = new ComprehensiveTestingFramework();
      
      const success = await comprehensiveFramework.run(options);
      
      res.status(200).json({
        status: success ? 'success' : 'failed',
        timestamp: new Date().toISOString(),
        results: comprehensiveFramework.results
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Utility methods
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
}

module.exports = { HealthCheckEndpoints };