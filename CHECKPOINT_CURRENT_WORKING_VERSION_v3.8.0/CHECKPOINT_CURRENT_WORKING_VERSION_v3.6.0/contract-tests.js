const axios = require('axios');
const { expect } = require('@jest/globals');

/**
 * API Contract Tests for AWS Opportunity Analysis Application
 * Tests API endpoints against defined contracts and schemas
 */

const BASE_URL = process.env.TARGET_URL || 'http://localhost:8123';
const API_TIMEOUT = 30000; // 30 seconds

// Test data
const validOpportunityData = {
  customerName: 'Contract Test Customer',
  region: 'us-east-1',
  closeDate: '2024-12-31',
  opportunityName: 'Contract Test Opportunity',
  description: 'This is a contract test opportunity for API validation'
};

const invalidOpportunityData = {
  customerName: '',
  region: 'invalid-region',
  closeDate: 'invalid-date',
  opportunityName: '',
  description: ''
};

// Expected response schemas
const analysisResponseSchema = {
  success: 'boolean',
  data: {
    predictedArr: 'string',
    predictedMrr: 'string',
    launchDate: 'string',
    timeToLaunch: 'number',
    confidence: 'string',
    topServices: 'string',
    analysisMethodology: 'string',
    similarProjects: 'array',
    detailedFindings: 'string',
    predictionRationale: 'string',
    riskFactors: 'string',
    generatedSql: 'string',
    queryResults: 'string'
  }
};

const errorResponseSchema = {
  success: 'boolean',
  error: {
    code: 'string',
    message: 'string',
    timestamp: 'string'
  }
};

/**
 * Validate response against schema
 */
function validateSchema(response, schema, path = '') {
  const errors = [];
  
  for (const [key, expectedType] of Object.entries(schema)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (!(key in response)) {
      errors.push(`Missing required field: ${currentPath}`);
      continue;
    }
    
    const value = response[key];
    
    if (typeof expectedType === 'string') {
      // Primitive type check
      if (expectedType === 'array' && !Array.isArray(value)) {
        errors.push(`Field ${currentPath} should be array, got ${typeof value}`);
      } else if (expectedType !== 'array' && typeof value !== expectedType) {
        errors.push(`Field ${currentPath} should be ${expectedType}, got ${typeof value}`);
      }
    } else if (typeof expectedType === 'object' && value !== null) {
      // Nested object validation
      const nestedErrors = validateSchema(value, expectedType, currentPath);
      errors.push(...nestedErrors);
    }
  }
  
  return errors;
}

/**
 * Make HTTP request with timeout and error handling
 */
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return {
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        error: true
      };
    }
    throw error;
  }
}

/**
 * Test Suite: Health Check Endpoint
 */
async function testHealthEndpoint() {
  console.log('Testing health endpoint...');
  
  const response = await makeRequest('GET', '/api/health');
  
  if (response.status !== 200) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  
  if (!response.data || typeof response.data.status !== 'string') {
    throw new Error('Health check response missing status field');
  }
  
  console.log('✓ Health endpoint test passed');
}

/**
 * Test Suite: Analyze Endpoint - Valid Request
 */
async function testAnalyzeEndpointValid() {
  console.log('Testing analyze endpoint with valid data...');
  
  const response = await makeRequest('POST', '/api/analyze', validOpportunityData);
  
  if (response.status !== 200) {
    throw new Error(`Analyze endpoint failed with status ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  // Validate response schema
  const schemaErrors = validateSchema(response.data, analysisResponseSchema);
  if (schemaErrors.length > 0) {
    throw new Error(`Schema validation failed: ${schemaErrors.join(', ')}`);
  }
  
  // Validate specific business logic
  const { data } = response.data;
  
  if (!data.predictedArr || data.predictedArr === 'N/A') {
    console.warn('Warning: No predicted ARR returned');
  }
  
  if (!data.topServices || data.topServices.trim() === '') {
    console.warn('Warning: No top services returned');
  }
  
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(data.confidence)) {
    throw new Error(`Invalid confidence level: ${data.confidence}`);
  }
  
  console.log('✓ Analyze endpoint valid request test passed');
}

/**
 * Test Suite: Analyze Endpoint - Invalid Request
 */
async function testAnalyzeEndpointInvalid() {
  console.log('Testing analyze endpoint with invalid data...');
  
  const response = await makeRequest('POST', '/api/analyze', invalidOpportunityData);
  
  if (response.status === 200) {
    console.warn('Warning: Analyze endpoint accepted invalid data');
    return;
  }
  
  if (response.status !== 400 && response.status !== 422) {
    throw new Error(`Expected 400 or 422 status for invalid data, got ${response.status}`);
  }
  
  // Validate error response schema
  if (response.data && response.data.success === false) {
    const schemaErrors = validateSchema(response.data, errorResponseSchema);
    if (schemaErrors.length > 0) {
      console.warn(`Error response schema validation failed: ${schemaErrors.join(', ')}`);
    }
  }
  
  console.log('✓ Analyze endpoint invalid request test passed');
}

/**
 * Test Suite: Analyze Endpoint - Missing Fields
 */
async function testAnalyzeEndpointMissingFields() {
  console.log('Testing analyze endpoint with missing fields...');
  
  const incompleteData = {
    customerName: 'Test Customer'
    // Missing other required fields
  };
  
  const response = await makeRequest('POST', '/api/analyze', incompleteData);
  
  if (response.status === 200) {
    console.warn('Warning: Analyze endpoint accepted incomplete data');
    return;
  }
  
  if (response.status !== 400 && response.status !== 422) {
    throw new Error(`Expected 400 or 422 status for incomplete data, got ${response.status}`);
  }
  
  console.log('✓ Analyze endpoint missing fields test passed');
}

/**
 * Test Suite: Funding Analysis Endpoint
 */
async function testFundingEndpoint() {
  console.log('Testing funding analysis endpoint...');
  
  const fundingData = {
    ...validOpportunityData,
    projectedArr: '$500,000',
    topServices: 'EC2, S3, RDS'
  };
  
  const response = await makeRequest('POST', '/api/analyze/funding', fundingData);
  
  if (response.status !== 200) {
    console.warn(`Funding endpoint returned status ${response.status}, may not be implemented yet`);
    return;
  }
  
  if (!response.data || !response.data.success) {
    throw new Error('Funding analysis failed');
  }
  
  console.log('✓ Funding endpoint test passed');
}

/**
 * Test Suite: Next Opportunity Endpoint
 */
async function testNextOpportunityEndpoint() {
  console.log('Testing next opportunity endpoint...');
  
  const response = await makeRequest('POST', '/api/analyze/next-opportunity', validOpportunityData);
  
  if (response.status !== 200) {
    console.warn(`Next opportunity endpoint returned status ${response.status}, may not be implemented yet`);
    return;
  }
  
  if (!response.data || !response.data.success) {
    throw new Error('Next opportunity analysis failed');
  }
  
  console.log('✓ Next opportunity endpoint test passed');
}

/**
 * Test Suite: CORS Headers
 */
async function testCorsHeaders() {
  console.log('Testing CORS headers...');
  
  const response = await makeRequest('OPTIONS', '/api/analyze');
  
  const corsHeaders = [
    'access-control-allow-origin',
    'access-control-allow-methods',
    'access-control-allow-headers'
  ];
  
  for (const header of corsHeaders) {
    if (!response.headers[header]) {
      console.warn(`Warning: Missing CORS header: ${header}`);
    }
  }
  
  console.log('✓ CORS headers test completed');
}

/**
 * Test Suite: Rate Limiting
 */
async function testRateLimiting() {
  console.log('Testing rate limiting...');
  
  const requests = [];
  const requestCount = 20;
  
  // Send multiple requests rapidly
  for (let i = 0; i < requestCount; i++) {
    requests.push(makeRequest('POST', '/api/analyze', validOpportunityData));
  }
  
  try {
    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    if (rateLimitedResponses.length === 0) {
      console.warn('Warning: No rate limiting detected');
    } else {
      console.log(`✓ Rate limiting working: ${rateLimitedResponses.length}/${requestCount} requests rate limited`);
    }
  } catch (error) {
    console.warn('Rate limiting test failed:', error.message);
  }
}

/**
 * Test Suite: Response Time Performance
 */
async function testResponseTime() {
  console.log('Testing response time performance...');
  
  const startTime = Date.now();
  const response = await makeRequest('POST', '/api/analyze', validOpportunityData);
  const endTime = Date.now();
  
  const responseTime = endTime - startTime;
  
  if (response.status !== 200) {
    throw new Error(`Performance test failed with status ${response.status}`);
  }
  
  console.log(`Response time: ${responseTime}ms`);
  
  if (responseTime > 30000) { // 30 seconds
    console.warn('Warning: Response time exceeds 30 seconds');
  }
  
  console.log('✓ Response time test completed');
}

/**
 * Main test runner
 */
async function runContractTests() {
  console.log('Starting API Contract Tests...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('='.repeat(50));
  
  const tests = [
    testHealthEndpoint,
    testAnalyzeEndpointValid,
    testAnalyzeEndpointInvalid,
    testAnalyzeEndpointMissingFields,
    testFundingEndpoint,
    testNextOpportunityEndpoint,
    testCorsHeaders,
    testRateLimiting,
    testResponseTime
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(`✗ ${test.name} failed:`, error.message);
      failed++;
    }
  }
  
  console.log('='.repeat(50));
  console.log(`Contract Tests Summary:`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${tests.length}`);
  
  if (failed > 0) {
    process.exit(1);
  }
  
  console.log('All contract tests completed successfully!');
}

// Run tests if called directly
if (require.main === module) {
  runContractTests().catch(error => {
    console.error('Contract tests failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runContractTests,
  validateSchema,
  makeRequest
};