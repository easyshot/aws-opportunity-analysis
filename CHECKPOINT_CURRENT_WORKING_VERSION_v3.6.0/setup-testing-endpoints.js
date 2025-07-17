#!/usr/bin/env node

/**
 * Setup Testing Endpoints
 * 
 * This script sets up health check endpoints and testing endpoints
 * for the Express application to support the comprehensive testing framework.
 * 
 * Implements Requirement 9.1: Health check endpoints for all services
 */

const express = require('express');
const { TestingFramework } = require('../lib/testing-framework');
const { DiagnosticService } = require('../lib/diagnostic-service');

/**
 * Setup testing endpoints on an Express app
 */
function setupTestingEndpoints(app) {
  const framework = new TestingFramework();
  const diagnostic = new DiagnosticService();
  
  console.log('🔧 Setting up testing endpoints...');
  
  // Initialize services
  let initialized = false;
  const initializeServices = async () => {
    if (!initialized) {
      await framework.initialize();
      await diagnostic.initialize();
      initialized = true;
    }
  };

  // Register health check endpoints
  framework.registerHealthCheckEndpoints(app);

  // Testing framework endpoints
  app.get('/api/test/scenarios', async (req, res) => {
    try {
      await initializeServices();
      
      const scenarios = Object.keys(framework.testScenarios).map(key => ({
        name: key,
        description: framework.testScenarios[key].description,
        input: framework.testScenarios[key].input
      }));
      
      res.json({
        status: 'success',
        scenarios,
        total: scenarios.length
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  app.post('/api/test/scenarios/:scenarioName', async (req, res) => {
    try {
      await initializeServices();
      
      const { scenarioName } = req.params;
      const result = await framework.runTestScenario(scenarioName);
      
      res.json({
        status: 'success',
        result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  app.get('/api/test/error-scenarios', async (req, res) => {
    try {
      await initializeServices();
      
      const scenarios = Object.keys(framework.errorScenarios).map(key => ({
        name: key,
        description: framework.errorScenarios[key].description,
        expectedErrors: framework.errorScenarios[key].expectedErrors
      }));
      
      res.json({
        status: 'success',
        scenarios,
        total: scenarios.length
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  app.post('/api/test/error-scenarios/:scenarioName', async (req, res) => {
    try {
      await initializeServices();
      
      const { scenarioName } = req.params;
      const result = await framework.runErrorScenario(scenarioName);
      
      res.json({
        status: 'success',
        result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  app.get('/api/test/performance', async (req, res) => {
    try {
      await initializeServices();
      
      const tests = Object.keys(framework.performanceTests).map(key => ({
        name: key,
        description: framework.performanceTests[key].description,
        concurrentUsers: framework.performanceTests[key].concurrentUsers,
        duration: framework.performanceTests[key].duration
      }));
      
      res.json({
        status: 'success',
        tests,
        total: tests.length
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  app.post('/api/test/performance/:testName', async (req, res) => {
    try {
      await initializeServices();
      
      const { testName } = req.params;
      
      // Set a longer timeout for performance tests
      req.setTimeout(600000); // 10 minutes
      res.setTimeout(600000);
      
      const result = await framework.runPerformanceTest(testName);
      
      res.json({
        status: 'success',
        result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  app.get('/api/test/validation', async (req, res) => {
    try {
      await initializeServices();
      
      const tests = Object.keys(framework.validationTests).map(key => ({
        name: key,
        description: framework.validationTests[key].description,
        tests: framework.validationTests[key].tests.length,
        requiredPassRate: framework.validationTests[key].requiredPassRate
      }));
      
      res.json({
        status: 'success',
        tests,
        total: tests.length
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  app.post('/api/test/validation/:testName', async (req, res) => {
    try {
      await initializeServices();
      
      const { testName } = req.params;
      const result = await framework.runValidationTest(testName);
      
      res.json({
        status: 'success',
        result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // Comprehensive test runner endpoint
  app.post('/api/test/comprehensive', async (req, res) => {
    try {
      await initializeServices();
      
      const options = req.body || {};
      
      // Set a very long timeout for comprehensive tests
      req.setTimeout(1800000); // 30 minutes
      res.setTimeout(1800000);
      
      const { TestingFrameworkRunner } = require('./run-testing-framework');
      const runner = new TestingFrameworkRunner();
      
      const success = await runner.run(options);
      
      res.json({
        status: success ? 'success' : 'failed',
        results: runner.results
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // Test status endpoint
  app.get('/api/test/status', async (req, res) => {
    try {
      await initializeServices();
      
      res.json({
        status: 'ready',
        framework: 'AWS Opportunity Analysis Testing Framework',
        version: '1.0.0',
        capabilities: {
          healthChecks: true,
          scenarios: true,
          errorScenarios: true,
          performance: true,
          validation: true,
          diagnostics: true
        },
        endpoints: {
          health: '/api/health',
          scenarios: '/api/test/scenarios',
          errorScenarios: '/api/test/error-scenarios',
          performance: '/api/test/performance',
          validation: '/api/test/validation',
          comprehensive: '/api/test/comprehensive',
          diagnostics: '/api/diagnostics'
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  console.log('✅ Testing endpoints configured');
  console.log('Available endpoints:');
  console.log('  GET  /api/health - Overall health check');
  console.log('  GET  /api/health/{service} - Individual service health');
  console.log('  GET  /api/test/status - Testing framework status');
  console.log('  GET  /api/test/scenarios - List available test scenarios');
  console.log('  POST /api/test/scenarios/{name} - Run specific scenario');
  console.log('  GET  /api/test/error-scenarios - List error scenarios');
  console.log('  POST /api/test/error-scenarios/{name} - Run error scenario');
  console.log('  GET  /api/test/performance - List performance tests');
  console.log('  POST /api/test/performance/{name} - Run performance test');
  console.log('  GET  /api/test/validation - List validation tests');
  console.log('  POST /api/test/validation/{name} - Run validation test');
  console.log('  POST /api/test/comprehensive - Run comprehensive test suite');
  console.log('  GET  /api/diagnostics - Run diagnostics');
  console.log('  GET  /api/diagnostics/full - Full diagnostic report');
}

/**
 * Create a standalone testing server
 */
function createTestingServer(port = 8124) {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // CORS for testing
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  // Setup testing endpoints
  setupTestingEndpoints(app);
  
  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'AWS Opportunity Analysis Testing Framework',
      version: '1.0.0',
      status: 'running',
      endpoints: '/api/test/status'
    });
  });
  
  // Start server
  const server = app.listen(port, () => {
    console.log(`🚀 Testing Framework Server running on port ${port}`);
    console.log(`📊 Access testing dashboard at: http://localhost:${port}/api/test/status`);
  });
  
  return server;
}

// CLI interface
if (require.main === module) {
  const port = process.env.TESTING_PORT || 8124;
  createTestingServer(port);
}

module.exports = {
  setupTestingEndpoints,
  createTestingServer
};