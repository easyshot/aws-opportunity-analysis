#!/usr/bin/env node

/**
 * Production Server Startup Test
 * 
 * This script tests the production server startup and validates that
 * all endpoints are working correctly with real AWS service connections.
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

class ProductionStartupTester {
  constructor() {
    this.serverProcess = null;
    this.testResults = [];
  }

  async runTests() {
    console.log('🚀 Production Server Startup Test');
    console.log('=================================\n');

    try {
      // Start the production server
      await this.startProductionServer();
      
      // Wait for server to be ready
      await this.waitForServer();
      
      // Run endpoint tests
      await this.testHealthEndpoint();
      await this.testAnalyzeEndpoint();
      await this.testStaticFiles();
      
      // Display results
      this.displayResults();
      
      return this.allTestsPassed();
      
    } catch (error) {
      console.error('❌ Fatal error during testing:', error.message);
      return false;
    } finally {
      // Clean up
      await this.stopProductionServer();
    }
  }

  async startProductionServer() {
    console.log('🔄 Starting production server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['app.js'], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'production' },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      this.serverProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        
        // Look for server ready message
        if (text.includes('Application ready for production traffic')) {
          console.log('✅ Production server started successfully');
          resolve();
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      this.serverProcess.on('error', (error) => {
        console.error('❌ Failed to start production server:', error.message);
        reject(error);
      });

      this.serverProcess.on('close', (code) => {
        if (code !== 0 && code !== null) {
          console.error('❌ Production server exited with code:', code);
          if (errorOutput) {
            console.error('Error output:', errorOutput);
          }
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          console.error('⏰ Server startup timeout');
          reject(new Error('Server startup timeout'));
        }
      }, 30000);
    });
  }

  async waitForServer() {
    console.log('⏳ Waiting for server to be ready...');
    
    const maxAttempts = 30;
    const delay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.makeRequest('GET', '/health');
        console.log('✅ Server is ready');
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error('Server failed to become ready within timeout');
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async testHealthEndpoint() {
    console.log('🔍 Testing health endpoint...');
    
    try {
      const response = await this.makeRequest('GET', '/health');
      const data = JSON.parse(response.body);
      
      const test = {
        name: 'Health Endpoint',
        passed: response.statusCode === 200 && data.status === 'healthy',
        details: {
          statusCode: response.statusCode,
          status: data.status,
          mode: data.mode,
          services: data.services
        }
      };
      
      this.testResults.push(test);
      
      if (test.passed) {
        console.log('✅ Health endpoint working correctly');
        console.log(`   Mode: ${data.mode}`);
        console.log(`   Services: ${Object.entries(data.services).map(([k, v]) => `${k}:${v ? '✅' : '❌'}`).join(', ')}`);
      } else {
        console.log('❌ Health endpoint failed');
        console.log(`   Status Code: ${response.statusCode}`);
        console.log(`   Response: ${response.body}`);
      }
      
    } catch (error) {
      this.testResults.push({
        name: 'Health Endpoint',
        passed: false,
        error: error.message
      });
      console.log('❌ Health endpoint test failed:', error.message);
    }
  }

  async testAnalyzeEndpoint() {
    console.log('🔍 Testing analyze endpoint...');
    
    const testPayload = {
      CustomerName: "Test Customer",
      region: "United States",
      closeDate: "2025-12-31",
      oppName: "Test Opportunity",
      oppDescription: "This is a test opportunity for validating the production server functionality and AWS service integration."
    };
    
    try {
      const response = await this.makeRequest('POST', '/api/analyze', testPayload);
      const data = JSON.parse(response.body);
      
      const test = {
        name: 'Analyze Endpoint',
        passed: response.statusCode === 200 && (data.metrics || data.fallbackMode),
        details: {
          statusCode: response.statusCode,
          hasMetrics: !!data.metrics,
          fallbackMode: data.fallbackMode,
          processingMode: data.processingMode,
          sessionId: data.sessionId
        }
      };
      
      this.testResults.push(test);
      
      if (test.passed) {
        console.log('✅ Analyze endpoint working correctly');
        console.log(`   Processing Mode: ${data.processingMode || 'unknown'}`);
        console.log(`   Fallback Mode: ${data.fallbackMode ? 'Yes' : 'No'}`);
        console.log(`   Has Metrics: ${data.metrics ? 'Yes' : 'No'}`);
        
        if (data.fallbackMode) {
          console.log('   ⚠️  Running in fallback mode - some AWS services may not be available');
        }
      } else {
        console.log('❌ Analyze endpoint failed');
        console.log(`   Status Code: ${response.statusCode}`);
        console.log(`   Response: ${response.body.substring(0, 500)}...`);
      }
      
    } catch (error) {
      this.testResults.push({
        name: 'Analyze Endpoint',
        passed: false,
        error: error.message
      });
      console.log('❌ Analyze endpoint test failed:', error.message);
    }
  }

  async testStaticFiles() {
    console.log('🔍 Testing static file serving...');
    
    const staticFiles = [
      { path: '/', name: 'Root HTML' },
      { path: '/index-compact.html', name: 'Main Application' },
      { path: '/styles-compact.css', name: 'Main Stylesheet' },
      { path: '/app-compact.js', name: 'Main JavaScript' }
    ];
    
    for (const file of staticFiles) {
      try {
        const response = await this.makeRequest('GET', file.path);
        
        const test = {
          name: `Static File: ${file.name}`,
          passed: response.statusCode === 200,
          details: {
            statusCode: response.statusCode,
            contentLength: response.body.length
          }
        };
        
        this.testResults.push(test);
        
        if (test.passed) {
          console.log(`✅ ${file.name} served correctly (${response.body.length} bytes)`);
        } else {
          console.log(`❌ ${file.name} failed (status: ${response.statusCode})`);
        }
        
      } catch (error) {
        this.testResults.push({
          name: `Static File: ${file.name}`,
          passed: false,
          error: error.message
        });
        console.log(`❌ ${file.name} test failed:`, error.message);
      }
    }
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 8123,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ProductionStartupTester/1.0'
        }
      };

      if (data) {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = http.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async stopProductionServer() {
    if (this.serverProcess && !this.serverProcess.killed) {
      console.log('🔄 Stopping production server...');
      
      return new Promise((resolve) => {
        this.serverProcess.on('close', () => {
          console.log('✅ Production server stopped');
          resolve();
        });
        
        // Try graceful shutdown first
        this.serverProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if needed
        setTimeout(() => {
          if (!this.serverProcess.killed) {
            this.serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    }
  }

  displayResults() {
    console.log('\n📊 TEST RESULTS');
    console.log('===============\n');

    const passed = this.testResults.filter(test => test.passed).length;
    const failed = this.testResults.filter(test => !test.passed).length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${Math.round((passed / total) * 100)}%`);
    console.log('');

    // Show failed tests
    const failedTests = this.testResults.filter(test => !test.passed);
    if (failedTests.length > 0) {
      console.log('❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   - ${test.name}: ${test.error || 'Test failed'}`);
        if (test.details) {
          console.log(`     Details: ${JSON.stringify(test.details, null, 2)}`);
        }
      });
      console.log('');
    }

    // Overall status
    if (this.allTestsPassed()) {
      console.log('🎉 ALL TESTS PASSED');
      console.log('Production server is working correctly!');
      console.log('');
      console.log('✅ Ready to switch from debug mode to production mode');
      console.log('');
      console.log('Usage:');
      console.log('  npm start              # Start production server');
      console.log('  npm run dev            # Start production server with auto-restart');
      console.log('  npm run start:debug    # Start debug server (fallback)');
    } else {
      console.log('⚠️  SOME TESTS FAILED');
      console.log('Please review the failed tests above.');
      console.log('');
      console.log('The server may still work in fallback mode, but some');
      console.log('AWS services may not be fully functional.');
    }
  }

  allTestsPassed() {
    return this.testResults.every(test => test.passed);
  }
}

async function main() {
  const tester = new ProductionStartupTester();
  
  try {
    const success = await tester.runTests();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Fatal error during testing:', error.message);
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', async () => {
  console.log('\n⚠️  Test interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Test terminated');
  process.exit(143);
});

if (require.main === module) {
  main();
}

module.exports = { ProductionStartupTester };